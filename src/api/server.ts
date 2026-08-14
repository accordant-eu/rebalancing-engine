import { createPortfoliosRouter } from './routes/portfolios';
import { createQueueRouter } from './routes/queue';
import express from 'express';
import cors from 'cors';
import { createHash, randomBytes } from 'crypto';
import { getDb } from '../db/sqlite';
import { SqliteStateManager } from '../orchestrator/sqlite-state';
import { validateTargetAllocation } from '../core/drift';
import { DynamicOptimizerService } from '../optimizer';
import { logger } from '../utils/logger';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi';
import { setupBrokerWebhooks } from './webhooks/broker-reports';
import { evaluateRebalance } from '../core/evaluation';
import { DriftReductionIndicator, ConcentrationLimitIndicator, DriftUtilityTranslator } from '../core/quality';
import { systemEventBus, SystemEvent } from '../events/bus';
import rateLimit from 'express-rate-limit';


import { Orchestrator } from '../orchestrator/loop';
import { BatchEvaluationWorker } from '../orchestrator/batch-evaluator';
import { globalMetrics } from '../services/metrics';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function setupExpressApp(stateManager: SqliteStateManager, orchestrator?: Orchestrator, batchWorker?: BatchEvaluationWorker) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Apply rate limiting to all requests to address CodeQL alerts (CWE-770, CWE-307, CWE-400)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests, please try again later.'
  });
  app.use(limiter);

  const sendError = (res: any, status: number, code: string, message: string, details: any = {}) => {
    res.status(status).json({ error: { code, message, details } });
  };

  let JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL: JWT_SECRET environment variable is missing in production');
    }
    JWT_SECRET = 'dev_secret_key_change_in_prod';
  }

  app.get('/api/docs/openapi.json', (req, res) => {
    res.json(openApiSpec);
  });
interface StreamTicket {
  tenantId: string;
  userId: string;
  role: string;
  isSuperadmin: boolean;
  expiresAt: number;
}

const streamTicketStore = new Map<string, StreamTicket>();

// Clean up expired tickets every 60s
setInterval(() => {
  const now = Date.now();
  for (const [ticketId, ticket] of streamTicketStore.entries()) {
    if (ticket.expiresAt < now) {
      streamTicketStore.delete(ticketId);
    }
  }
}, 60000).unref();

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));


  // Auth Middleware
  app.use((req, res, next) => {
    if (req.path === '/api/auth/login' || req.path === '/api/auth/refresh' || req.path === '/api/webhooks/alpaca') return next();
    
    // Single-use Stream Ticket authentication for SSE (/api/events/stream?ticket=st_...)
    if (req.path === '/api/events/stream' && req.query.ticket && typeof req.query.ticket === 'string') {
      const ticketId = req.query.ticket;
      const ticket = streamTicketStore.get(ticketId);
      if (ticket && ticket.expiresAt >= Date.now()) {
        streamTicketStore.delete(ticketId); // Single-use consumption
        (req as any).tenantId = ticket.tenantId;
        (req as any).userId = ticket.userId;
        (req as any).role = ticket.role;
        (req as any).isSuperadmin = ticket.isSuperadmin;
        return next();
      }
      return sendError(res, 401, 'UNAUTHORIZED', 'Invalid or expired stream ticket');
    }

    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.split(' ')[1] : undefined;

    if (!token) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Missing Authorization header');
    }
    
    // Check if it's a B2B API Key (starts with sk_live_)
    if (token.startsWith('sk_live_')) {
      const keyHash = createHash('sha256').update(token).digest('hex');
      const db = getDb();
      const keyRecord = db.prepare('SELECT tenantId FROM TenantApiKeys WHERE keyHash = ? AND status = ?').get(keyHash, 'Active') as any;
      if (keyRecord) {
        (req as any).tenantId = keyRecord.tenantId;
        (req as any).userId = 'api-key';
        (req as any).role = 'Admin';
        (req as any).isSuperadmin = keyRecord.tenantId === process.env.SUPERADMIN_TENANT_ID;
        return next();
      }
      return sendError(res, 401, 'UNAUTHORIZED', 'Invalid API key');
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (req as any).tenantId = decoded.tenantId;
      (req as any).userId = decoded.userId;
      (req as any).role = decoded.role;
      (req as any).isSuperadmin = decoded.role === 'Admin' && !!process.env.SUPERADMIN_TENANT_ID && decoded.tenantId === process.env.SUPERADMIN_TENANT_ID;
    } catch (e: any) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Invalid token signature');
    }
    next();
  });

  // Superadmin Guard Middleware
  const requireSuperadmin = (req: any, res: any, next: any) => {
    if (req.role !== 'Admin' || !process.env.SUPERADMIN_TENANT_ID || req.tenantId !== process.env.SUPERADMIN_TENANT_ID) {
      return sendError(res, 403, 'FORBIDDEN', 'Superadmin access required');
    }
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.role !== 'Admin') {
      return sendError(res, 403, 'FORBIDDEN', 'Admin access required');
    }
    next();
  };

  const forbidViewer = (req: any, res: any, next: any) => {
    if (req.role === 'Viewer') {
      return sendError(res, 403, 'FORBIDDEN', 'Viewer role cannot perform this action');
    }
    next();
  };

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return sendError(res, 400, 'BAD_REQUEST', 'email and password required');
    
    const user = stateManager.getUserByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Invalid credentials');
    }
    
    if (user.status !== 'Active') {
      return sendError(res, 403, 'FORBIDDEN', 'User account is not active');
    }
    
    const tokenPayload = { userId: user.userId, tenantId: user.tenantId, role: user.role };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
    
    const refreshToken = randomBytes(32).toString('hex');
    stateManager.createRefreshToken(user.userId, refreshToken, 7 * 24 * 60 * 60 * 1000);
    
    const isSuperadmin = user.role === 'Admin' && !!process.env.SUPERADMIN_TENANT_ID && user.tenantId === process.env.SUPERADMIN_TENANT_ID;
    
    res.json({ token, refreshToken, tenantId: user.tenantId, role: user.role, isSuperadmin });
  });

  app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return sendError(res, 400, 'BAD_REQUEST', 'refreshToken required');

    const userId = stateManager.validateAndRevokeRefreshToken(refreshToken);
    if (!userId) return sendError(res, 401, 'UNAUTHORIZED', 'Invalid or expired refresh token');

    const user = stateManager.getUserById(userId);
    if (!user) return sendError(res, 401, 'UNAUTHORIZED', 'User not found');

    if (user.status !== 'Active') {
      return sendError(res, 403, 'FORBIDDEN', 'User account is not active');
    }

    const tokenPayload = { userId: user.userId, tenantId: user.tenantId, role: user.role };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
    
    const newRefreshToken = randomBytes(32).toString('hex');
    stateManager.createRefreshToken(user.userId, newRefreshToken, 7 * 24 * 60 * 60 * 1000);

    const isSuperadmin = user.role === 'Admin' && !!process.env.SUPERADMIN_TENANT_ID && user.tenantId === process.env.SUPERADMIN_TENANT_ID;

    res.json({ token, refreshToken: newRefreshToken, isSuperadmin });
  });

  app.post('/api/auth/stream-ticket', (req, res) => {
    const ticketId = 'st_' + randomBytes(16).toString('hex');
    streamTicketStore.set(ticketId, {
      tenantId: (req as any).tenantId,
      userId: (req as any).userId,
      role: (req as any).role,
      isSuperadmin: (req as any).isSuperadmin,
      expiresAt: Date.now() + 30000,
    });
    res.json({ ticket: ticketId, expiresInSeconds: 30 });
  });

  // --- Admin Endpoints ---
  app.get('/api/admin/tenants', requireSuperadmin, (req, res) => {
    res.json(stateManager.getAllTenants());
  });

  app.post('/api/admin/tenants', requireSuperadmin, (req, res) => {
    const { tenantId, name, brokerType, brokerApiKey, brokerApiSecret, brokerBaseUrl } = req.body;
    stateManager.createTenant(tenantId, name, { brokerType, brokerApiKey, brokerApiSecret, brokerBaseUrl });
    res.json({ message: 'Tenant provisioned successfully' });
  });

  app.put('/api/admin/tenants/:tenantId', requireSuperadmin, (req, res) => {
    const tenantId = req.params.tenantId;
    const { name, brokerType, brokerApiKey, brokerApiSecret, brokerBaseUrl } = req.body;
    stateManager.updateTenant(tenantId, name, { brokerType, brokerApiKey, brokerApiSecret, brokerBaseUrl });
    res.json({ message: 'Tenant updated successfully' });
  });

  // --- API Key Management ---
  app.get('/api/admin/tenants/:tenantId/keys', requireSuperadmin, (req, res) => {
    const tenantId = req.params.tenantId;
    res.json(stateManager.getTenantApiKeys(tenantId));
  });

  app.post('/api/admin/tenants/:tenantId/keys', requireSuperadmin, (req, res) => {
    const tenantId = req.params.tenantId;
    const keyData = stateManager.createTenantApiKey(tenantId);
    res.json(keyData); // Note: Secret is returned only once
  });

  app.delete('/api/admin/tenants/:tenantId/keys/:keyId', requireSuperadmin, (req, res) => {
    const keyId = req.params.keyId;
    stateManager.revokeTenantApiKey(keyId);
    res.json({ message: 'Key revoked successfully' });
  });

  // --- Assets Management ---
  app.get('/api/admin/assets', requireSuperadmin, (req, res) => {
    res.json(stateManager.getAssets());
  });

  app.post('/api/admin/assets', requireSuperadmin, (req, res) => {
    stateManager.createAsset(req.body);
    res.json({ success: true });
  });

  // Tenant API
  app.get('/api/assets', (req, res) => {
    res.json(stateManager.getAssets());
  });

  app.get('/api/admin/users', requireSuperadmin, (req, res) => {
    const tenantId = req.query.tenantId as string;
    if (tenantId) {
      res.json(stateManager.getUsersByTenant(tenantId));
    } else {
      res.json([]);
    }
  });

  app.post('/api/admin/users', requireSuperadmin, (req, res) => {
    stateManager.createUser(req.body);
    res.json({ message: 'User provisioned successfully' });
  });

  app.get('/api/admin/queue', requireSuperadmin, (req, res) => {
    res.json({ depth: stateManager.getQueueDepth() });
  });

  app.get('/api/admin/metrics', requireSuperadmin, (req, res) => {
    const snapshot = globalMetrics.getSnapshot();
    const tenants = stateManager.getAllTenants();
    const brokerTypeMap: Record<string, string> = {};
    tenants.forEach(t => brokerTypeMap[t.tenantId] = t.brokerType);
    
    const byBrokerType: Record<string, { calls: number; errors: number }> = {};
    
    for (const [tenantId, calls] of Object.entries(snapshot.totalApiCalls)) {
      const bType = brokerTypeMap[tenantId] || 'UNKNOWN';
      if (!byBrokerType[bType]) byBrokerType[bType] = { calls: 0, errors: 0 };
      byBrokerType[bType].calls += calls;
    }
    for (const [tenantId, errors] of Object.entries(snapshot.rateLimitErrors)) {
      const bType = brokerTypeMap[tenantId] || 'UNKNOWN';
      if (!byBrokerType[bType]) byBrokerType[bType] = { calls: 0, errors: 0 };
      byBrokerType[bType].errors += errors;
    }
    
    res.json({ ...snapshot, byBrokerType });
  });

  app.get('/api/metrics', forbidViewer, (req, res) => {
    const tenantId = (req as any).tenantId;
    res.json(globalMetrics.getTenantSnapshot(tenantId));
  });

  app.post('/api/admin/system/pause', requireSuperadmin, (req, res) => {
    if (orchestrator) orchestrator.pause();
    res.json({ isPaused: true });
  });

  app.post('/api/admin/system/resume', requireSuperadmin, (req, res) => {
    if (orchestrator) orchestrator.resume();
    res.json({ isPaused: false });
  });
  // -----------------------

  app.post('/api/optimizer/run', requireAdmin, async (req, res) => {
    try {
      const optimizer = new DynamicOptimizerService(stateManager);
      await optimizer.run();
      res.json({ message: 'Dynamic optimizer run completed successfully.' });
    } catch (err: any) {
      logger.error({ err }, 'Error running dynamic optimizer');
      res.status(500).json({ error: err.message });
    }
  });

  app.use('/api/webhooks', setupBrokerWebhooks(stateManager));

  // --- Tenant Admin Endpoints ---
  app.get('/api/users', (req: any, res: any) => {
    if (req.role !== 'Admin') {
      return res.status(403).json({ error: 'Requires Admin role' });
    }
    const users = stateManager.getUsersByTenant(req.tenantId);
    res.json(users);
  });

  app.post('/api/users', express.json(), (req: any, res: any) => {
    if (req.role !== 'Admin') {
      return res.status(403).json({ error: 'Requires Admin role' });
    }
    const { email, password, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
      const existing = stateManager.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      const userId = 'usr_' + Date.now().toString(36);
      stateManager.createUser({
        userId,
        tenantId: req.tenantId,
        email,
        password, // Not hashed in MVP per architecture docs, but would be in prod
        role
      });
      res.status(201).json({ message: 'User created', userId });
    } catch (err: any) {
      logger.error({ err }, 'Error creating user');
      res.status(500).json({ error: 'Internal error' });
    }
  });

  app.get('/api/state', (req, res) => {
    const tenantId = (req as any).tenantId;
    const targetTenant = (req as any).isSuperadmin ? null : tenantId;
    res.json({
      globalPrices: stateManager.getGlobalPrices(),
      portfolios: stateManager.getStatesFilteredByTenant(targetTenant),
    });
  });

  app.get('/api/models', (req, res) => {
    const tenantId = (req as any).tenantId;
    if ((req as any).isSuperadmin) {
      const db = getDb();
      const rows = db.prepare(`SELECT * FROM Models`).all() as any[];
      const models = rows.map(r => ({
        modelId: r.modelId,
        tenantId: r.tenantId,
        name: r.name,
        archetype: r.archetype,
        evaluationFrequency: r.evaluationFrequency,
        targetAllocation: JSON.parse(r.targetAllocation),
        policy: JSON.parse(r.policy),
        constraints: r.constraints ? JSON.parse(r.constraints) : []
      }));
      return res.json(models);
    }
    res.json(stateManager.getModels(tenantId));
  });

  function validateModelMandate(model: any) {
    if (model.archetype === 'EfficientFrontier' || model.archetype === 'MinimumVariance') {
      throw new Error(`Archetype ${model.archetype} is not yet supported`);
    }
    if (model.archetype === 'StaticWeights' && model.targetAllocation) {
      validateTargetAllocation(model.targetAllocation);
      const totalWeight = model.targetAllocation.targets.reduce((acc: number, t: any) => acc + t.weight, 0);
      const cashBuffer = model.targetAllocation.cashBuffer || 0;
      if (Math.abs(totalWeight + cashBuffer - 1.0) > 0.0001) {
        throw new Error(`Target allocation weights (${totalWeight}) + cashBuffer (${cashBuffer}) must sum to exactly 1.0`);
      }
    }
  }

  app.get('/api/models/:id', (req, res) => {
    const tenantId = (req as any).tenantId;
    const modelId = req.params.id;
    const models = (req as any).isSuperadmin ? stateManager.getAllTenants().flatMap(t => stateManager.getModels(t.tenantId)) : stateManager.getModels(tenantId);
    const model = models.find((m: any) => m.modelId === modelId);
    if (!model || (!(req as any).isSuperadmin && model.tenantId !== tenantId)) {
      return sendError(res, 404, 'MODEL_NOT_FOUND', `Model '${modelId}' not found`);
    }
    res.json(model);
  });

  app.post('/api/models', requireAdmin, (req, res) => {
    const tenantId = (req as any).tenantId;
    const model = { ...req.body, tenantId };
    try {
      validateModelMandate(model);
      const affectedAccounts = stateManager.updateModel(model);
      res.json({ success: true, model, affectedAccounts });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/models/:id', requireAdmin, (req, res) => {
    const tenantId = (req as any).tenantId;
    const modelId = req.params.id;
    
    const models = (req as any).isSuperadmin ? stateManager.getAllTenants().flatMap(t => stateManager.getModels(t.tenantId)) : stateManager.getModels(tenantId);
    const existing = models.find((m: any) => m.modelId === modelId);
    if (!existing || (!(req as any).isSuperadmin && existing.tenantId !== tenantId)) {
      return sendError(res, 404, 'MODEL_NOT_FOUND', `Model '${modelId}' not found`);
    }

    const model = { ...req.body, modelId, tenantId: existing.tenantId };
    try {
      validateModelMandate(model);
      const affectedAccounts = stateManager.updateModel(model);
      res.json({ success: true, model, affectedAccounts });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/portfolios/:id/subscription', forbidViewer, (req, res) => {
    const accountId = req.params.id;
    const { modelId, subscriptionType } = req.body;
    try {
      stateManager.assignPortfolioToModel(accountId, modelId, subscriptionType);
      stateManager.enqueuePortfolio(accountId, Date.now());
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.put('/api/portfolios/:id/mandate', forbidViewer, (req, res) => {
    const accountId = req.params.id;
    const tenantId = (req as any).tenantId;
    const state = stateManager.getAccountState(accountId);
    
    if (!state || (!(req as any).isSuperadmin && state.portfolioState.tenantId !== tenantId)) {
      return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', `Portfolio '${accountId}' not found`);
    }

    try {
      const payload = req.body;
      validateModelMandate(payload);
      stateManager.updatePortfolioMandate(accountId, payload);
      stateManager.enqueuePortfolio(accountId, Date.now());
      res.json({ success: true, mandate: payload });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/logs', async (req, res) => {
    const tenantId = (req as any).tenantId;
    const portfolioId = req.query.portfolioId as string;
    const since = req.query.since as string;
    const type = req.query.type as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    try {
      const db = getDb();
      let query = `SELECT * FROM AuditTrails WHERE 1=1`;
      const params: any[] = [];

      if (!(req as any).isSuperadmin) {
        query += ` AND tenantId = ?`;
        params.push(tenantId);
      }
      if (portfolioId) {
        query += ` AND accountId = ?`;
        params.push(portfolioId);
      }
      if (type) {
        query += ` AND type = ?`;
        params.push(type);
      }
      if (since) {
        const sinceTime = new Date(since).getTime();
        query += ` AND timestampMs >= ?`;
        params.push(sinceTime);
      }
      query += ` ORDER BY timestampMs DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const rows = db.prepare(query).all(...params) as any[];
      const allLogs = rows.map(r => ({
        eventId: r.eventId,
        accountId: r.accountId,
        type: r.type,
        inputs: JSON.parse(r.inputs),
        outputs: r.outputs ? JSON.parse(r.outputs) : undefined,
        createdAt: r.createdAt
      }));

      // For total count
      let countQuery = `SELECT count(*) as count FROM AuditTrails WHERE 1=1`;
      const countParams = params.slice(0, -2); // Remove limit and offset
      if (!(req as any).isSuperadmin) countQuery += ` AND tenantId = ?`;
      if (portfolioId) countQuery += ` AND accountId = ?`;
      if (type) countQuery += ` AND type = ?`;
      if (since) countQuery += ` AND timestampMs >= ?`;
      
      const countRes = db.prepare(countQuery).get(...countParams) as { count: number };
      const totalCount = countRes?.count || 0;

      res.json({ total: totalCount, data: allLogs });
    } catch (e: any) {
      logger.error({ err: e }, 'Error fetching logs');
      res.json({ total: 0, data: [] });
    }
  });

  app.get('/api/events/stream', (req, res) => {
    const tenantId = (req as any).tenantId;
    const portfoliosQuery = (req.query.portfolios as string) || 'all';
    const typesQuery = (req.query.types as string) || 'all';

    const portfolios = portfoliosQuery !== 'all' ? portfoliosQuery.split(',').map(s => s.trim()) : null;
    const types = typesQuery !== 'all' ? typesQuery.split(',').map(s => s.trim()) : null;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    res.write(': keepalive\n\n');

    const keepAliveInterval = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30000);

    const onSystemEvent = (event: SystemEvent) => {
      if (!(req as any).isSuperadmin && event.tenantId !== tenantId) {
        return;
      }

      if (portfolios && !portfolios.includes(event.accountId)) {
        return;
      }

      if (types && !types.includes(event.type)) {
        return;
      }

      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    systemEventBus.on('system_event', onSystemEvent);

    req.on('close', () => {
      clearInterval(keepAliveInterval);
      systemEventBus.off('system_event', onSystemEvent);
    });
  });

  app.use('/api/portfolios', createPortfoliosRouter(stateManager, { forbidViewer, requireAdmin, requireSuperadmin, sendError }));
  app.use('/api/queue', createQueueRouter(stateManager, batchWorker, { forbidViewer, requireAdmin, requireSuperadmin, sendError }));
  app.use('/api', createQueueRouter(stateManager, batchWorker, { forbidViewer, requireAdmin, requireSuperadmin, sendError }));

  app.get('/api/prices', (req, res) => {
    res.json(stateManager.getGlobalPrices());
  });

  return app;
}
