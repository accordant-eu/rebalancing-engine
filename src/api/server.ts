import { createPortfoliosRouter } from './routes/portfolios';
import { createQueueRouter } from './routes/queue';
import express from 'express';
import cors from 'cors';
import { createHash, randomBytes } from 'crypto';
import { getDb } from '../db/sqlite';
import { SqliteStateManager } from '../orchestrator/sqlite-state';
import { validateTargetAllocation } from '../core/drift';
import { evaluateRebalance } from '../core/evaluation';
import {
  PortfolioState,
  PriceSnapshot,
  RebalancingPolicy,
  TargetAllocation,
  TenantBranding,
} from '../models/domain';
import { DynamicOptimizerService } from '../optimizer';
import { logger } from '../utils/logger';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi';
import { setupBrokerWebhooks } from './webhooks/broker-reports';
import { systemEventBus, SystemEvent } from '../events/bus';
import rateLimit from 'express-rate-limit';


import { Orchestrator } from '../orchestrator/loop';
import { BatchEvaluationWorker } from '../orchestrator/batch-evaluator';
import { MandateSchedulerService } from '../orchestrator/scheduler';
import { globalMetrics } from '../services/metrics';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function setupExpressApp(
  stateManager: SqliteStateManager,
  orchestrator?: Orchestrator,
  batchWorker?: BatchEvaluationWorker,
  scheduler?: MandateSchedulerService
) {
  const app = express();
  const mandateScheduler = scheduler || new MandateSchedulerService(stateManager);
  app.use(cors());
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    })
  );

  // Apply rate limiting to all requests to address CodeQL alerts (CWE-770, CWE-307, CWE-400)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per 15-minute window to accommodate UI polling
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests, please try again later.'
  });
  app.use(limiter);

  const sendError = (res: any, status: number, code: string, message: string, details: any = {}) => {
    res.status(status).json({ error: { code, message, details } });
  };

  const checkIsSuperadmin = (role?: string, tenantId?: string, tokenFlag?: boolean): boolean => {
    if (role === 'Superadmin' || tokenFlag === true) {
      return true;
    }
    return role === 'Admin' && !!process.env.SUPERADMIN_TENANT_ID && tenantId === process.env.SUPERADMIN_TENANT_ID;
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

  app.get(['/health', '/api/health'], (_req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  // Auth Middleware
  app.use((req, res, next) => {
    if (
      req.path === '/health' ||
      req.path === '/api/health' ||
      req.path === '/api/auth/login' ||
      req.path === '/api/auth/refresh' ||
      req.path === '/api/public/branding' ||
      req.path === '/api/public/onboarding' ||
      req.path === '/api/public/sandbox/simulate' ||
      req.path === '/api/webhooks/alpaca'
    ) return next();
    
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
        (req as any).isSuperadmin = checkIsSuperadmin('Admin', keyRecord.tenantId);
        return next();
      }
      return sendError(res, 401, 'UNAUTHORIZED', 'Invalid API key');
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (req as any).tenantId = decoded.tenantId;
      (req as any).userId = decoded.userId;
      (req as any).role = decoded.role;
      (req as any).isSuperadmin = checkIsSuperadmin(decoded.role, decoded.tenantId, decoded.isSuperadmin);
    } catch (_e: any) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Invalid token signature');
    }
    next();
  });

  // Superadmin Guard Middleware
  const requireSuperadmin = (req: any, res: any, next: any) => {
    if (!req.isSuperadmin) {
      return sendError(res, 403, 'FORBIDDEN', 'Superadmin access required');
    }
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.role !== 'Admin' && req.role !== 'Superadmin' && !req.isSuperadmin) {
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
    if (!user) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Invalid credentials');
    }

    const isMatch = user.password.startsWith('$2')
      ? bcrypt.compareSync(password, user.password)
      : user.password === password;

    if (!isMatch) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Invalid credentials');
    }

    // Auto-upgrade legacy plaintext password if encountered
    if (!user.password.startsWith('$2')) {
      const hashed = bcrypt.hashSync(password, 10);
      try {
        const db = (stateManager as any).getDb?.() || getDb();
        db.prepare('UPDATE Users SET password = ? WHERE userId = ?').run(hashed, user.userId);
      } catch (_e) { /* ignore upgrade failure */ }
    }
    
    if (user.status !== 'Active') {
      return sendError(res, 403, 'FORBIDDEN', 'User account is not active');
    }
    
    const isSuperadmin = checkIsSuperadmin(user.role, user.tenantId);
    const tokenPayload = { userId: user.userId, tenantId: user.tenantId, role: user.role, isSuperadmin };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
    
    const refreshToken = randomBytes(32).toString('hex');
    stateManager.createRefreshToken(user.userId, refreshToken, 7 * 24 * 60 * 60 * 1000);
    
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

    const isSuperadmin = checkIsSuperadmin(user.role, user.tenantId);
    const tokenPayload = { userId: user.userId, tenantId: user.tenantId, role: user.role, isSuperadmin };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
    
    const newRefreshToken = randomBytes(32).toString('hex');
    stateManager.createRefreshToken(user.userId, newRefreshToken, 7 * 24 * 60 * 60 * 1000);

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

  // --- Public Marketing Sandbox & Self-Serve Onboarding ---
  app.post('/api/public/sandbox/simulate', (req, res) => {
    try {
      const { holdings = [], cash = 0, targets = [], policy = {}, prices } = req.body;
      if (!Array.isArray(targets) || targets.length === 0) {
        return sendError(res, 400, 'BAD_REQUEST', 'targets array is required');
      }

      const mergedPolicy: RebalancingPolicy = {
        strategyType: policy.strategyType ?? 'manual',
        absoluteDriftTolerance: policy.absoluteDriftTolerance ?? 0.05,
        minimumTradeSize: policy.minimumTradeSize ?? 10,
        executionTargetMode: policy.executionTargetMode ?? 'full_reset',
        maxFrictionBps: policy.maxFrictionBps ?? 50,
        assumedSlippageBps: policy.assumedSlippageBps ?? 5,
        allowLeverage: policy.allowLeverage ?? false,
        maxLeverageRatio: policy.maxLeverageRatio ?? 2.0,
        maintenanceMarginRequirement: policy.maintenanceMarginRequirement ?? 0.25,
        marginExcessBuffer: policy.marginExcessBuffer ?? 0.10,
        ...policy,
      };

      const targetAllocation: TargetAllocation = {
        targets,
        cashBuffer: policy.cashBuffer ?? 0,
      };
      validateTargetAllocation(targetAllocation, mergedPolicy);

      // Snapshot prices: use user-supplied or fallback to global prices
      const globalSnapshot = stateManager.getGlobalPrices();
      const priceMap: Record<string, number> = { ...(globalSnapshot?.prices || {}), ...(prices || {}) };

      // Ensure every targeted or held instrument has a positive, finite price
      const DEFAULT_PRICES: Record<string, number> = {
        'US0378331005:XNAS:USD': 182.5,
        'US5949181045:XNAS:USD': 415.2,
        'US38259P5089:XNAS:USD': 178.0,
      };

      for (const t of targets) {
        const p = priceMap[t.instrumentId];
        if (!p || p <= 0 || !isFinite(p)) {
          priceMap[t.instrumentId] = DEFAULT_PRICES[t.instrumentId] || 100;
        }
      }
      for (const h of holdings) {
        const p = priceMap[h.instrumentId];
        if (!p || p <= 0 || !isFinite(p)) {
          priceMap[h.instrumentId] = DEFAULT_PRICES[h.instrumentId] || 100;
        }
      }

      const priceSnapshot: PriceSnapshot = { prices: priceMap, asOf: new Date().toISOString() };

      const syntheticState: PortfolioState = {
        accountId: 'sandbox-portfolio',
        tenantId: 'sandbox',
        cash: Number(cash) || 0,
        holdings: holdings.map((h: any) => ({
          instrumentId: h.instrumentId,
          quantity: Number(h.quantity) || 0,
        })),
        cashFlows: [],
      };

      const evalResult = evaluateRebalance({
        eventId: 'sandbox-eval-' + Date.now(),
        createdAt: new Date().toISOString(),
        portfolioState: syntheticState,
        targetAllocation,
        priceSnapshot,
        policy: mergedPolicy,
      });

      const totalTradeVolume = evalResult.tradeProposal.trades.reduce(
        (sum, t) => sum + (t.estimatedValue || 0),
        0,
      );
      const turnoverRate =
        evalResult.valuation.totalPortfolioValue > 0
          ? (0.5 * totalTradeVolume) / evalResult.valuation.totalPortfolioValue
          : 0;
      const slippageBps = mergedPolicy.assumedSlippageBps ?? 5;
      const estimatedFrictionValue = (totalTradeVolume * slippageBps) / 10000;

      const maxDriftBefore = Math.max(
        ...evalResult.driftMeasurements.map((d) => Math.abs(d.absoluteDrift)),
        0,
      );
      const maxDriftAfter = Math.max(
        ...evalResult.postTradeSimulation.residualDrift.map((d) => Math.abs(d.absoluteDrift)),
        0,
      );

      res.json({
        success: true,
        initialValuation: {
          totalEquity: evalResult.valuation.totalPortfolioValue,
          cash: syntheticState.cash,
          holdingsValue: evalResult.valuation.totalHoldingsValue,
        },
        preTradeDrift: evalResult.driftMeasurements,
        proposal: evalResult.tradeProposal,
        simulation: evalResult.postTradeSimulation,
        explanation: evalResult.explanation,
        summary: {
          totalTrades: evalResult.tradeProposal.trades.length,
          turnoverRate: Number(turnoverRate.toFixed(4)),
          estimatedFrictionValue: Number(estimatedFrictionValue.toFixed(2)),
          estimatedFrictionBps: slippageBps,
          maxDriftBefore: Number(maxDriftBefore.toFixed(4)),
          maxDriftAfter: Number(maxDriftAfter.toFixed(4)),
          isRebalanceBeneficial: evalResult.tradeProposal.trades.length > 0,
        },
      });
    } catch (e: any) {
      return sendError(res, 400, 'SANDBOX_SIMULATION_ERROR', e.message || String(e));
    }
  });

  app.post('/api/public/onboarding', (req, res) => {
    try {
      const { tenantId, firmName, adminEmail, adminPassword, brokerType = 'MOCK', branding } = req.body;

      if (!tenantId || !firmName || !adminEmail || !adminPassword) {
        return sendError(res, 400, 'BAD_REQUEST', 'tenantId, firmName, adminEmail, and adminPassword are required');
      }

      const tenantIdRegex = /^[a-z0-9_-]{3,32}$/i;
      if (!tenantIdRegex.test(tenantId)) {
        return sendError(res, 400, 'INVALID_TENANT_ID', 'tenantId must be 3-32 alphanumeric characters, dashes, or underscores');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminEmail)) {
        return sendError(res, 400, 'INVALID_EMAIL', 'adminEmail must be a valid email address');
      }

      if (adminPassword.length < 8) {
        return sendError(res, 400, 'WEAK_PASSWORD', 'adminPassword must be at least 8 characters long');
      }

      const db = getDb();
      const existingTenant = db.prepare('SELECT tenantId FROM Tenants WHERE tenantId = ?').get(tenantId);
      if (existingTenant) {
        return sendError(res, 409, 'TENANT_EXISTS', `Tenant ID '${tenantId}' is already registered`);
      }

      const existingUser = db.prepare('SELECT email FROM Users WHERE email = ?').get(adminEmail);
      if (existingUser) {
        return sendError(res, 409, 'USER_EXISTS', `User with email '${adminEmail}' already exists`);
      }

      const effectiveBranding: TenantBranding = {
        brandName: firmName,
        primaryColor: branding?.primaryColor || '#0ea5e9',
        accentColor: branding?.accentColor || '#0284c7',
        portalTitle: branding?.portalTitle || `${firmName} Rebalancing`,
        supportEmail: branding?.supportEmail || adminEmail,
        logoUrl: branding?.logoUrl,
      };

      // 1. Create Tenant
      stateManager.createTenant(tenantId, firmName, { brokerType }, effectiveBranding);

      // 2. Create Initial Admin User
      const userId = 'user-' + randomBytes(6).toString('hex');
      const hashedPassword = bcrypt.hashSync(adminPassword, 10);
      stateManager.createUser({
        userId,
        tenantId,
        email: adminEmail,
        password: hashedPassword,
        role: 'Admin',
        status: 'Active',
      });

      // 3. Issue M2M API Key
      const apiKey = stateManager.createTenantApiKey(tenantId);

      // 4. Seed Default Sample Mandate & Portfolio
      const sampleModelId = `model-core-${tenantId}`;
      const sampleModel: any = {
        modelId: sampleModelId,
        tenantId,
        name: `${firmName} Core 60/40`,
        archetype: 'StaticWeights',
        evaluationFrequency: 'realtime',
        targetAllocation: {
          targets: [
            { instrumentId: 'US0378331005:XNAS:USD', weight: 0.6 },
            { instrumentId: 'US5949181045:XNAS:USD', weight: 0.4 },
          ],
          cashBuffer: 0,
        },
        policy: {
          absoluteDriftTolerance: 0.05,
          minimumTradeSize: 100,
          executionTargetMode: 'full_reset',
        },
      };
      stateManager.createModel(sampleModel);

      const sampleAccountId = `port-${tenantId}-1`;
      stateManager.registerPortfolio(sampleAccountId, {
        portfolioState: {
          accountId: sampleAccountId,
          tenantId,
          modelId: sampleModelId,
          subscriptionType: 'discretionary',
          cash: 100000,
          holdings: [],
          cashFlows: [],
        },
        priceSnapshot: stateManager.getGlobalPrices(),
        targetAllocation: sampleModel.targetAllocation,
        policy: sampleModel.policy,
        archetype: 'StaticWeights',
      });

      res.status(201).json({
        success: true,
        tenant: {
          tenantId,
          name: firmName,
          brokerType,
          branding: effectiveBranding,
        },
        user: {
          userId,
          email: adminEmail,
          role: 'Admin',
        },
        apiKey: {
          keyPrefix: apiKey.keyPrefix,
          secret: apiKey.secret,
        },
        sampleData: {
          modelId: sampleModelId,
          accountId: sampleAccountId,
        },
        message: 'Tenant and partner firm provisioned successfully. You can now log in or integrate via API.',
      });
    } catch (e: any) {
      return sendError(res, 500, 'ONBOARDING_FAILED', e.message || String(e));
    }
  });

  app.get('/api/public/branding', (req, res) => {
    const tenantId = (req.query.tenantId as string) || 'tenant-baseline';
    const branding = stateManager.getTenantBranding ? stateManager.getTenantBranding(tenantId) : null;
    const allTenants = stateManager.getAllTenants();
    const tenant = allTenants.find((t: any) => t.tenantId === tenantId);
    res.json({
      tenantId,
      name: tenant?.name || 'Accordant',
      branding: branding || {
        brandName: tenant?.name || 'Accordant',
        primaryColor: '#0ea5e9',
        accentColor: '#0284c7',
      },
    });
  });

  app.get('/api/tenant/branding', (req, res) => {
    const tenantId = (req as any).tenantId;
    const branding = stateManager.getTenantBranding ? stateManager.getTenantBranding(tenantId) : null;
    res.json(branding || {});
  });

  app.put('/api/tenant/branding', requireAdmin, (req, res) => {
    const tenantId = (req as any).tenantId;
    const branding = req.body as TenantBranding;
    if (stateManager.updateTenantBranding) {
      stateManager.updateTenantBranding(tenantId, branding);
    }
    res.json({ success: true, branding });
  });

  app.get('/api/admin/tenants/:tenantId/branding', requireSuperadmin, (req, res) => {
    const tenantId = req.params.tenantId;
    const branding = stateManager.getTenantBranding ? stateManager.getTenantBranding(tenantId) : null;
    res.json(branding || {});
  });

  app.put('/api/admin/tenants/:tenantId/branding', requireSuperadmin, (req, res) => {
    const tenantId = req.params.tenantId;
    const branding = req.body as TenantBranding;
    if (stateManager.updateTenantBranding) {
      stateManager.updateTenantBranding(tenantId, branding);
    }
    res.json({ success: true, branding });
  });

  // --- Admin Endpoints ---
  app.get('/api/admin/tenants', requireSuperadmin, (req, res) => {
    res.json(stateManager.getAllTenants());
  });

  app.post('/api/admin/tenants', requireSuperadmin, (req, res) => {
    const { tenantId, name, brokerType, brokerApiKey, brokerApiSecret, brokerBaseUrl, branding } = req.body;
    stateManager.createTenant(tenantId, name, { brokerType, brokerApiKey, brokerApiSecret, brokerBaseUrl }, branding);
    res.json({ message: 'Tenant provisioned successfully' });
  });

  app.put('/api/admin/tenants/:tenantId', requireSuperadmin, (req, res) => {
    const tenantId = req.params.tenantId;
    const { name, brokerType, brokerApiKey, brokerApiSecret, brokerBaseUrl, branding } = req.body;
    stateManager.updateTenant(tenantId, name, { brokerType, brokerApiKey, brokerApiSecret, brokerBaseUrl }, branding);
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
    const { password, ...rest } = req.body || {};
    const hashedPassword =
      password && !String(password).startsWith('$2')
        ? bcrypt.hashSync(String(password), 10)
        : password || '';
    stateManager.createUser({ ...rest, password: hashedPassword });
    res.json({ message: 'User provisioned successfully' });
  });

  app.get('/api/admin/queue', requireSuperadmin, (req, res) => {
    res.json({ depth: stateManager.getQueueDepth() });
  });

  app.get('/api/admin/scheduler/status', requireSuperadmin, (req, res) => {
    try {
      res.json(mandateScheduler.getStatus());
    } catch (err: any) {
      sendError(res, 500, 'SCHEDULER_STATUS_ERROR', err.message);
    }
  });

  app.post('/api/admin/scheduler/scan', requireSuperadmin, (req, res) => {
    try {
      const evaluationDate = req.body?.evaluationDate;
      const result = mandateScheduler.scanAndEnqueue(evaluationDate);
      res.json(result);
    } catch (err: any) {
      sendError(res, 400, 'SCHEDULER_SCAN_ERROR', err.message);
    }
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
    if (req.role !== 'Admin' && req.role !== 'Superadmin' && !req.isSuperadmin) {
      return res.status(403).json({ error: 'Requires Admin role' });
    }
    const users = stateManager.getUsersByTenant(req.tenantId);
    res.json(users);
  });

  app.post('/api/users', (req: any, res: any) => {
    if (req.role !== 'Admin' && req.role !== 'Superadmin' && !req.isSuperadmin) {
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
      const hashedPassword =
        password && !String(password).startsWith('$2')
          ? bcrypt.hashSync(String(password), 10)
          : password || '';
      stateManager.createUser({
        userId,
        tenantId: req.tenantId,
        email,
        password: hashedPassword,
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
      return res.json(stateManager.getAllModels());
    }
    res.json(stateManager.getModels(tenantId));
  });

  function validateModelMandate(model: any) {
    const archetype = model.archetype || 'StaticWeights';
    if (!['StaticWeights', 'EfficientFrontier', 'MinimumVariance'].includes(archetype)) {
      throw new Error(`Archetype ${archetype} is not yet supported`);
    }
    if (archetype === 'StaticWeights' && model.targetAllocation) {
      validateTargetAllocation(model.targetAllocation, model.policy);
      const totalWeight = model.targetAllocation.targets.reduce((acc: number, t: any) => acc + t.weight, 0);
      const cashBuffer = model.targetAllocation.cashBuffer || 0;
      if (!model.policy?.allowLeverage && Math.abs(totalWeight + cashBuffer - 1.0) > 0.0001) {
        throw new Error(`Target allocation weights (${totalWeight}) + cashBuffer (${cashBuffer}) must sum to exactly 1.0`);
      }
    } else if ((archetype === 'EfficientFrontier' || archetype === 'MinimumVariance') && model.targetAllocation?.targets?.length > 0) {
      validateTargetAllocation(model.targetAllocation, model.policy);
      const totalWeight = model.targetAllocation.targets.reduce((acc: number, t: any) => acc + t.weight, 0);
      const cashBuffer = model.targetAllocation.cashBuffer || 0;
      if (!model.policy?.allowLeverage && Math.abs(totalWeight + cashBuffer - 1.0) > 0.0001) {
        throw new Error(`Target allocation weights (${totalWeight}) + cashBuffer (${cashBuffer}) must sum to exactly 1.0`);
      }
    }
  }

  app.get('/api/models/:id', (req, res) => {
    const tenantId = (req as any).tenantId;
    const modelId = req.params.id;
    const models = (req as any).isSuperadmin ? stateManager.getAllModels() : stateManager.getModels(tenantId);
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
    
    const models = (req as any).isSuperadmin ? stateManager.getAllModels() : stateManager.getModels(tenantId);
    const existing = models.find((m: any) => m.modelId === modelId);
    if (!existing || (!(req as any).isSuperadmin && existing.tenantId !== tenantId)) {
      return sendError(res, 404, 'MODEL_NOT_FOUND', `Model '${modelId}' not found`);
    }

    const model = { ...existing, ...req.body, modelId, tenantId: existing.tenantId };
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
    const tenantId = (req as any).tenantId;
    const isSuperadmin = (req as any).isSuperadmin;
    const { modelId, subscriptionType } = req.body;
    try {
      const state = stateManager.getAccountState(accountId);
      if (!state || (!isSuperadmin && state.portfolioState.tenantId !== tenantId)) {
        return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', `Portfolio '${accountId}' not found`);
      }
      if (modelId) {
        const models = isSuperadmin ? stateManager.getAllModels() : stateManager.getModels(tenantId);
        const model = models.find((m: any) => m.modelId === modelId);
        if (!model || (!isSuperadmin && model.tenantId !== tenantId)) {
          return sendError(res, 404, 'MODEL_NOT_FOUND', `Model '${modelId}' not found`);
        }
      }
      stateManager.assignPortfolioToModel(accountId, modelId, subscriptionType);
      stateManager.enqueuePortfolio(accountId, Date.now());
      res.json({ success: true });
    } catch (e: any) {
      if (e.message && e.message.includes('not initialized')) {
        return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', `Portfolio '${accountId}' not found`);
      }
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

      if (portfolios && event.accountId && !portfolios.includes(event.accountId)) {
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
