import express from 'express';
import cors from 'cors';
import { createHash, randomBytes } from 'crypto';
import fs from 'fs';
import readline from 'readline';
import { readLinesBackwards } from '../utils/fs';
import { getDb } from '../db/sqlite';
import { SqliteStateManager } from '../orchestrator/sqlite-state';
import { validateTargetAllocation } from '../core/drift';
import { MockOptimizerService } from '../optimizer';
import { logger } from '../utils/logger';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi';
import { evaluateRebalance } from '../core/evaluation';
import { DriftReductionIndicator, ConcentrationLimitIndicator, DriftUtilityTranslator } from '../core/quality';
import { systemEventBus, SystemEvent } from '../events/bus';


import { Orchestrator } from '../orchestrator/loop';
import { globalMetrics } from '../services/metrics';

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export function setupExpressApp(stateManager: SqliteStateManager, orchestrator?: Orchestrator) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const sendError = (res: any, status: number, code: string, message: string, details: any = {}) => {
    res.status(status).json({ error: { code, message, details } });
  };

  const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_in_prod';

  app.get('/api/docs/openapi.json', (req, res) => {
    res.json(openApiSpec);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));


  // Auth Middleware
  app.use((req, res, next) => {
    if (req.path === '/api/auth/login' || req.path === '/api/auth/refresh' || req.path === '/api/webhooks/alpaca') return next();
    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Missing Authorization header');
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Invalid token format');
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
        return next();
      }
      return sendError(res, 401, 'UNAUTHORIZED', 'Invalid API key');
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (req as any).tenantId = decoded.tenantId;
      (req as any).userId = decoded.userId;
      (req as any).role = decoded.role;
    } catch (e) {
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
    
    res.json({ token, refreshToken, tenantId: user.tenantId, role: user.role });
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

    res.json({ token, refreshToken: newRefreshToken });
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

  app.post('/api/admin/system/pause', requireSuperadmin, (req, res) => {
    if (orchestrator) orchestrator.pause();
    res.json({ isPaused: true });
  });

  app.post('/api/admin/system/resume', requireSuperadmin, (req, res) => {
    if (orchestrator) orchestrator.resume();
    res.json({ isPaused: false });
  });
  // -----------------------

  app.post('/api/optimizer/run', (req, res) => {
    try {
      const optimizer = new MockOptimizerService(stateManager);
      optimizer.run();
      res.json({ message: 'Mock optimizer successfully ran for all dynamic models' });
    } catch (err: any) {
      logger.error({ err }, 'Error running mock optimizer');
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/webhooks/alpaca', (req, res) => {
    // Simulated webhook endpoint for asynchronous trade fills from Alpaca
    const event = req.body;
    logger.info({ event }, '[Webhook] Received Alpaca event');

    if (event.event === 'fill') {
      const accountId = event.account_id;
      if (accountId) {
        stateManager.enqueuePortfolio(accountId, Date.now());
      }
    }
    res.json({ success: true });
  });

  app.get('/api/state', (req, res) => {
    const tenantId = (req as any).tenantId;
    const targetTenant = tenantId === 'superadmin' ? null : tenantId;
    res.json({
      globalPrices: stateManager.getGlobalPrices(),
      portfolios: stateManager.getStatesFilteredByTenant(targetTenant),
    });
  });

  app.get('/api/models', (req, res) => {
    const tenantId = (req as any).tenantId;
    if (tenantId === 'superadmin') {
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
    const models = tenantId === 'superadmin' ? stateManager.getAllTenants().flatMap(t => stateManager.getModels(t.tenantId)) : stateManager.getModels(tenantId);
    const model = models.find((m: any) => m.modelId === modelId);
    if (!model || (tenantId !== 'superadmin' && model.tenantId !== tenantId)) {
      return sendError(res, 404, 'MODEL_NOT_FOUND', `Model '${modelId}' not found`);
    }
    res.json(model);
  });

  app.post('/api/models', (req, res) => {
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

  app.put('/api/models/:id', (req, res) => {
    const tenantId = (req as any).tenantId;
    const modelId = req.params.id;
    const model = { ...req.body, modelId, tenantId };
    try {
      validateModelMandate(model);
      const affectedAccounts = stateManager.updateModel(model);
      res.json({ success: true, model, affectedAccounts });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/portfolios/:id/subscription', (req, res) => {
    const accountId = req.params.id;
    const { modelId, subscriptionType } = req.body;
    try {
      stateManager.assignPortfolioToModel(accountId, modelId, subscriptionType);
      stateManager.enqueuePortfolio(accountId, Date.now());
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.put('/api/portfolios/:id/mandate', (req, res) => {
    const accountId = req.params.id;
    const tenantId = (req as any).tenantId;
    const state = stateManager.getAccountState(accountId);
    
    if (!state || (tenantId !== 'superadmin' && state.portfolioState.tenantId !== tenantId)) {
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

    // NOTE: Uses readLinesBackwards to avoid memory exhaustion on large log files.
    try {
      if (!fs.existsSync('./data/audit-trail.jsonl')) {
        return res.json({ total: 0, data: [] });
      }
      
      let allLogs: any[] = [];
      const tenantStates = tenantId !== 'superadmin' ? stateManager.getStatesFilteredByTenant(tenantId || '') : null;
      let count = 0;
      
      for await (const line of readLinesBackwards('./data/audit-trail.jsonl')) {
        if (!line.trim()) continue;
        try {
          const log = JSON.parse(line);
          
          if (tenantStates) {
            const accId = log.accountId || (log.eventId && log.eventId.split(':')[0]);
            if (!accId || !tenantStates[accId]) continue;
          }

          if (portfolioId && log.accountId !== portfolioId) continue;
          if (type && log.type !== type) continue;
          
          if (since) {
            const sinceTime = new Date(since).getTime();
            if (new Date(log.createdAt).getTime() < sinceTime) {
               // Logs are chronologically appended, so if we hit one older than 'since', we can break
               break; 
            }
          }
          
          allLogs.push(log);
          count++;
          if (count >= offset + limit) {
             break;
          }
        } catch(e) {}
      }

      const data = allLogs.slice(offset, offset + limit);
      res.json({ total: offset + data.length, data });
    } catch (e: any) {
      sendError(res, 500, 'INTERNAL_ERROR', e.message);
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
      if (tenantId !== 'superadmin' && event.tenantId !== tenantId) {
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

  app.get('/api/portfolios/summary', async (req, res) => {
    const tenantId = (req as any).tenantId;
    const targetTenant = tenantId === 'superadmin' ? null : tenantId;
    const portfolios = stateManager.getStatesFilteredByTenant(targetTenant);
    const prices = stateManager.getGlobalPrices();

    let totalAum = 0;
    let inBand = 0;
    let thresholdBreach = 0;
    let notEvaluated = 0;
    let openCircuitBreakers = 0;

    let lastEvaluatedAt: number | null = null;

    Object.values(portfolios).forEach((state) => {
      // Aggregate AUM
      let portfolioValue = state.portfolioState.cash;
      state.portfolioState.holdings.forEach(h => {
        portfolioValue += h.quantity * (prices.prices[h.instrumentId] || 0);
      });
      totalAum += portfolioValue;

      // Circuit Breakers
      if (state.portfolioState.circuitBreakerStatus === 'open') {
        openCircuitBreakers++;
      }

      // Rebalance eval for drift (lightweight)
      try {
        let maxDrift = 0;
        const targets = state.targetAllocation?.targets || [];
        targets.forEach(t => {
          const value = (state.portfolioState.holdings?.find((h: any) => h.instrumentId === t.instrumentId)?.quantity || 0) * (prices.prices[t.instrumentId] || 0);
          const weight = portfolioValue > 0 ? value / portfolioValue : 0;
          const drift = Math.abs(weight - t.weight);
          if (drift > maxDrift) maxDrift = drift;
        });

        const tolerance = state.policy.absoluteDriftTolerance || 0.05;
        if (maxDrift > tolerance) {
          thresholdBreach++;
        } else {
          inBand++;
        }

        // Use current time to represent real-time HUD freshness
        lastEvaluatedAt = Date.now();
      } catch (e) {
        notEvaluated++;
      }
    });

    // Recent executions from Audit logs
    let executions24h = 0;
    let executions7d = 0;

    try {
      if (fs.existsSync('./data/audit-trail.jsonl')) {
        const now = Date.now();
        const ms24h = 24 * 60 * 60 * 1000;
        const ms7d = 7 * 24 * 60 * 60 * 1000;

        for await (const line of readLinesBackwards('./data/audit-trail.jsonl')) {
          if (!line.trim()) continue;
          try {
            const log = JSON.parse(line);
            const logTime = new Date(log.createdAt).getTime();
            
            if (now - logTime > ms7d) {
               break; // Stop reading further back than 7 days
            }

            if (log.type === 'LIVE_EXECUTION') {
              const accId = log.accountId || (log.eventId && log.eventId.split(':')[0]);
              // Tenant filter
              if (tenantId === 'superadmin' || (accId && portfolios[accId])) {
                if (now - logTime <= ms24h) executions24h++;
                executions7d++;
              }
            }
          } catch(err) { }
        }
      }
    } catch (e) { }

    res.json({
      asOf: new Date().toISOString(),
      meta: {
        total: Object.keys(portfolios).length,
        lastEvaluatedAt: lastEvaluatedAt ? new Date(lastEvaluatedAt).toISOString() : null
      },
      driftSummary: {
        inBand,
        thresholdBreach,
        notEvaluated
      },
      totalAum,
      openCircuitBreakers,
      recentExecutions: {
        last24h: executions24h,
        last7d: executions7d
      }
    });
  });
  app.get('/api/portfolios', (req, res) => {
    const tenantId = (req as any).tenantId;
    const targetTenant = tenantId === 'superadmin' ? null : tenantId;
    const portfolios = stateManager.getStatesFilteredByTenant(targetTenant);
    const prices = stateManager.getGlobalPrices();
    
    const result = Object.values(portfolios).map((state) => {
      let driftStatus = 'not_evaluated';
      let driftMeasurements: any[] = [];
      let totalValue = state.portfolioState.cash;
      
      const models = stateManager.getModels(state.portfolioState.tenantId || '');
      const modelName = state.portfolioState.modelId ? models.find(m => m.modelId === state.portfolioState.modelId)?.name : 'Bespoke';
      
      try {
        const indicators: any[] = [];
        if (state.archetype === 'StaticWeights') {
          indicators.push(new DriftReductionIndicator(new DriftUtilityTranslator()));
          if (state.constraints) {
            for (const c of state.constraints) {
              if (c.type === 'concentration_limit' && c.parameters && c.parameters.maxWeight) {
                indicators.push(new ConcentrationLimitIndicator(c.parameters.maxWeight));
              }
            }
          }
        }
        
        const evalResult = evaluateRebalance({
          eventId: `api-eval-${Date.now()}`,
          portfolioState: state.portfolioState,
          targetAllocation: state.targetAllocation,
          priceSnapshot: prices,
          policy: state.policy,
          indicators,
          createdAt: new Date().toISOString()
        });
        driftStatus = evalResult.trigger.isTriggered ? 'threshold_breach' : 'in_band';
        driftMeasurements = evalResult.driftMeasurements;
      } catch (e) {
        // intentional empty catch
      }
      
      const holdings = state.portfolioState.holdings.map(h => {
        const driftObj = driftMeasurements.find(d => d.instrumentId === h.instrumentId);
        const price = prices.prices[h.instrumentId] || 0;
        const val = h.quantity * price;
        totalValue += val;
        return {
          instrumentId: h.instrumentId,
          quantity: h.quantity,
          currentWeight: driftObj?.currentWeight || 0,
          targetWeight: driftObj?.targetWeight || 0,
          driftPct: driftObj?.relativeDrift || 0
        };
      });

      return {
        accountId: state.portfolioState.accountId,
        tenantId: state.portfolioState.tenantId,
        modelId: state.portfolioState.modelId || null,
        modelName,
        subscriptionType: state.portfolioState.subscriptionType || 'bespoke',
        archetype: state.archetype,
        constraints: state.constraints,
        targetAllocation: state.targetAllocation,
        totalValue,
        cash: state.portfolioState.cash,
        lastEvaluatedAt: new Date().toISOString(),
        driftStatus,
        holdings
      };
    });
    
    res.json(result);
  });

  app.get('/api/portfolios/:id', async (req, res) => {
    const tenantId = (req as any).tenantId;
    const accountId = req.params.id;
    const state = stateManager.getAccountState(accountId);
    
    if (!state || (tenantId !== 'superadmin' && state.portfolioState.tenantId !== tenantId)) {
      return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', `Portfolio '${accountId}' not found`);
    }

    const prices = stateManager.getGlobalPrices();
    let driftStatus = 'not_evaluated';
    let driftMeasurements: any[] = [];
    let totalValue = state.portfolioState.cash;
    let lastProposal = null;
    
    const models = stateManager.getModels(state.portfolioState.tenantId || '');
    const modelName = state.portfolioState.modelId ? models.find(m => m.modelId === state.portfolioState.modelId)?.name : 'Bespoke';

    try {
      const indicators: any[] = [];
      if (state.archetype === 'StaticWeights') {
        indicators.push(new DriftReductionIndicator(new DriftUtilityTranslator()));
        if (state.constraints) {
          for (const c of state.constraints) {
            if (c.type === 'concentration_limit' && c.parameters && c.parameters.maxWeight) {
              indicators.push(new ConcentrationLimitIndicator(c.parameters.maxWeight));
            }
          }
        }
      }

      const evalResult = evaluateRebalance({
        eventId: `api-eval-${Date.now()}`,
        portfolioState: state.portfolioState,
        targetAllocation: state.targetAllocation,
        priceSnapshot: prices,
        policy: state.policy,
        indicators,
        createdAt: new Date().toISOString()
      });
      driftStatus = evalResult.trigger.isTriggered ? 'threshold_breach' : 'in_band';
      driftMeasurements = evalResult.driftMeasurements;
    } catch (e) {
      // intentional empty catch
    }
    
    const holdings = state.portfolioState.holdings.map(h => {
      const driftObj = driftMeasurements.find(d => d.instrumentId === h.instrumentId);
      const price = prices.prices[h.instrumentId] || 0;
      const val = h.quantity * price;
      totalValue += val;
      return {
        instrumentId: h.instrumentId,
        quantity: h.quantity,
        currentWeight: driftObj?.currentWeight || 0,
        targetWeight: driftObj?.targetWeight || 0,
        driftPct: driftObj?.relativeDrift || 0
      };
    });

    try {
      if (fs.existsSync('./data/audit-trail.jsonl')) {
        for await (const line of readLinesBackwards('./data/audit-trail.jsonl')) {
          if (!line.trim()) continue;
          const parsed = JSON.parse(line);
          if (parsed.accountId === accountId && parsed.outputs && parsed.outputs.tradeProposal) {
            lastProposal = parsed.outputs.tradeProposal;
            break;
          }
        }
      }
    } catch(e) {
      // intentional empty catch
    }

    res.json({
      accountId: state.portfolioState.accountId,
      tenantId: state.portfolioState.tenantId,
      modelId: state.portfolioState.modelId || null,
      modelName,
      subscriptionType: state.portfolioState.subscriptionType || 'bespoke',
      archetype: state.archetype,
      constraints: state.constraints,
      targetAllocation: state.targetAllocation,
      policy: state.policy,
      totalValue,
      cash: state.portfolioState.cash,
      lastEvaluatedAt: new Date().toISOString(),
      driftStatus,
      holdings,
      pendingCashFlows: state.portfolioState.cashFlows?.filter((c: any) => c.status === 'PENDING') || [],
      circuitBreakerStatus: state.portfolioState.circuitBreakerStatus || 'closed',
      lastProposal
    });
  });

  app.post('/api/portfolios/:id/trigger-rebalance', (req, res) => {
    const tenantId = (req as any).tenantId;
    const accountId = req.params.id;
    const { dryRun } = req.body;
    
    try {
      const state = stateManager.getAccountState(accountId);
      if (!state || (tenantId !== 'superadmin' && state.portfolioState.tenantId !== tenantId)) {
        return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', `Portfolio '${accountId}' not found`);
      }

      if (dryRun) {
        const prices = stateManager.getGlobalPrices();
        const indicators: any[] = [];
        if (state.archetype === 'StaticWeights') {
          indicators.push(new DriftReductionIndicator(new DriftUtilityTranslator()));
          if (state.constraints) {
            for (const c of state.constraints) {
              if (c.type === 'concentration_limit' && c.parameters && c.parameters.maxWeight) {
                indicators.push(new ConcentrationLimitIndicator(c.parameters.maxWeight));
              }
            }
          }
        }
        
        const evalResult = evaluateRebalance({
          eventId: `api-eval-dry-${Date.now()}`,
          portfolioState: state.portfolioState,
          targetAllocation: state.targetAllocation,
          priceSnapshot: prices,
          policy: state.policy,
          indicators,
          createdAt: new Date().toISOString()
        });
        
        return res.json({ dryRun: true, ...evalResult });
      } else {
        const db = getDb();
        db.prepare(`INSERT OR REPLACE INTO EvaluationQueue (accountId, queuedAtMs) VALUES (?, ?)`).run(accountId, Date.now());
        return res.json({ message: 'Portfolio enqueued for rebalancing', accountId });
      }
    } catch (e: any) {
      return sendError(res, 500, 'INTERNAL_ERROR', e.message);
    }
  });

  app.post('/api/portfolios/:id/circuit-breaker/reset', (req, res) => {
    const tenantId = (req as any).tenantId;
    const accountId = req.params.id;
    
    try {
      const state = stateManager.getAccountState(accountId);
      if (!state || (tenantId !== 'superadmin' && state.portfolioState.tenantId !== tenantId)) {
        return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', `Portfolio '${accountId}' not found`);
      }

      stateManager.updateCircuitBreakerStatus(accountId, 'closed');
      const db = getDb();
      db.prepare(`INSERT OR REPLACE INTO EvaluationQueue (accountId, queuedAtMs) VALUES (?, ?)`).run(accountId, Date.now());
      
      systemEventBus.emitEvent({
        type: 'CIRCUIT_BREAKER_RESET',
        accountId,
        tenantId: state.portfolioState.tenantId,
        timestamp: new Date().toISOString(),
        eventId: `reset-${Date.now()}`
      });

      res.json({ message: 'Circuit breaker reset and portfolio enqueued for re-evaluation', accountId });
    } catch (e: any) {
      return sendError(res, 500, 'INTERNAL_ERROR', e.message);
    }
  });

  app.post('/api/portfolios/:id/cashflows', (req, res) => {
    const tenantId = (req as any).tenantId;
    const accountId = req.params.id;
    const { amount, direction, currency, expectedSettlementDate, note } = req.body;
    
    if (!amount || !direction) {
      return sendError(res, 400, 'BAD_REQUEST', 'amount and direction are required');
    }

    try {
      const state = stateManager.getAccountState(accountId);
      if (!state || (tenantId !== 'superadmin' && state.portfolioState.tenantId !== tenantId)) {
        return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', `Portfolio '${accountId}' not found`);
      }

      const cashflowId = 'cf_' + randomBytes(8).toString('hex');
      const cashflow = {
        cashFlowId: cashflowId,
        amount,
        direction,
        currency,
        expectedSettlementDate,
        status: 'PENDING'
      };
      
      stateManager.submitCashFlow(accountId, cashflow, (req as any).userId);
      res.json(cashflow);
    } catch (e: any) {
      return sendError(res, 500, 'INTERNAL_ERROR', e.message);
    }
  });

  app.get('/api/portfolios/:id/drift', (req, res) => {
    const tenantId = (req as any).tenantId;
    const accountId = req.params.id;
    const state = stateManager.getAccountState(accountId);
    
    if (!state || (tenantId !== 'superadmin' && state.portfolioState.tenantId !== tenantId)) {
      return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', `Portfolio '${accountId}' not found`);
    }

    const model = state.portfolioState.modelId ? stateManager.getModels(state.portfolioState.tenantId || '').find(m => m.modelId === state.portfolioState.modelId) : null;
    if (!model) {
      return sendError(res, 400, 'NO_MODEL', 'Portfolio is not assigned to a model');
    }

    const prices = stateManager.getGlobalPrices();
    try {
      const evalResult = evaluateRebalance({
        eventId: `api-eval-${Date.now()}`,
        portfolioState: state.portfolioState,
        targetAllocation: model.targetAllocation,
        priceSnapshot: prices,
        policy: model.policy,
        createdAt: new Date().toISOString()
      });
      
      res.json({
        accountId: state.portfolioState.accountId,
        evaluatedAt: new Date().toISOString(),
        strategyType: evalResult.trigger.strategyType,
        rebalanceDue: evalResult.trigger.isTriggered,
        reason: evalResult.trigger.reason,
        driftByInstrument: evalResult.driftMeasurements.map((d: any) => ({
          instrumentId: d.instrumentId,
          currentWeight: d.currentWeight,
          targetWeight: d.targetWeight,
          absoluteDrift: d.absoluteDrift,
          relativeDrift: d.relativeDrift,
          thresholdBreach: d.isOutOfBand
        }))
      });
    } catch (e: any) {
      sendError(res, 500, 'INTERNAL_ERROR', e.message);
    }
  });

  app.get('/api/portfolios/:id/proposals', async (req, res) => {
    const tenantId = (req as any).tenantId;
    const accountId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 20;

    const state = stateManager.getAccountState(accountId);
    if (!state || (tenantId !== 'superadmin' && state.portfolioState.tenantId !== tenantId)) {
      return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', `Portfolio '${accountId}' not found`);
    }

    const proposals: any[] = [];
    
    try {
      if (fs.existsSync('./data/audit-trail.jsonl')) {
        for await (const line of readLinesBackwards('./data/audit-trail.jsonl')) {
          if (!line.trim()) continue;
          const parsed = JSON.parse(line);
          if (parsed.accountId === accountId && parsed.outputs && parsed.outputs.tradeProposal) {
            proposals.push({
              proposedAt: parsed.createdAt,
              executionMode: parsed.outputs.executionTargetMode,
              executed: parsed.type === 'LIVE_EXECUTION', // basic assumption based on type
              trades: parsed.outputs.tradeProposal.trades,
              warnings: parsed.outputs.tradeProposal.warnings.map((w: any) => w.message)
            });
            if (proposals.length >= limit) break;
          }
        }
      }
    } catch(e) {
      // intentional empty catch
    }

    res.json({
      accountId,
      proposals
    });
  });

  app.get('/api/prices', (req, res) => {
    res.json(stateManager.getGlobalPrices());
  });

  return app;
}
