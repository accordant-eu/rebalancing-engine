import express from 'express';
import cors from 'cors';
import fs from 'fs';
import readline from 'readline';
import { getDb } from '../db/sqlite';
import { SqliteStateManager } from '../orchestrator/sqlite-state';
import { validateTargetAllocation } from '../core/drift';
import { MockOptimizerService } from '../optimizer';
import { logger } from '../utils/logger';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi';
import { evaluateRebalance } from '../core/evaluation';


import { Orchestrator } from '../orchestrator/loop';
import { globalMetrics } from '../services/metrics';

export function setupExpressApp(stateManager: SqliteStateManager, orchestrator?: Orchestrator) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const sendError = (res: any, status: number, code: string, message: string, details: any = {}) => {
    res.status(status).json({ error: { code, message, details } });
  };

  app.get('/api/docs/openapi.json', (req, res) => {
    res.json(openApiSpec);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));


  // Mock JWT Auth Middleware
  app.use((req, res, next) => {
    if (req.path === '/api/auth/login' || req.path === '/api/webhooks/alpaca') return next();
    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Missing Authorization header');
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Invalid token format');
    }
    
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      (req as any).tenantId = decoded.tenantId;
      (req as any).userId = decoded.userId;
      (req as any).role = decoded.role;
    } catch (e) {
      // Fallback for old tokens like "tenant-baseline"
      (req as any).tenantId = token;
      (req as any).role = token === 'superadmin' ? 'Admin' : 'Viewer';
    }
    next();
  });

  // Superadmin Guard Middleware
  const requireSuperadmin = (req: any, res: any, next: any) => {
    if (req.userId !== 'user-superadmin' && req.tenantId !== 'superadmin') {
      return sendError(res, 403, 'FORBIDDEN', 'Superadmin access required');
    }
    next();
  };

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return sendError(res, 400, 'BAD_REQUEST', 'email and password required');
    
    const user = stateManager.getUserByEmail(email);
    if (!user || user.password !== password) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Invalid credentials');
    }
    
    const tokenPayload = { userId: user.userId, tenantId: user.tenantId, role: user.role };
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
    
    res.json({ token, tenantId: user.tenantId, role: user.role });
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
    res.json(globalMetrics.getSnapshot());
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

  app.post('/api/models', (req, res) => {
    const tenantId = (req as any).tenantId;
    const model = { ...req.body, tenantId };
    try {
      if (model.archetype === 'StaticWeights' && model.targetAllocation) {
        validateTargetAllocation(model.targetAllocation);
      }
      const affectedAccounts = stateManager.createModel(model);
      const now = Date.now();
      for (const accountId of affectedAccounts) {
        stateManager.enqueuePortfolio(accountId, now);
      }
      res.json({ success: true, model, affectedAccounts });
    } catch (e) {
      res.status(500).json({ error: String(e) });
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

  app.get('/api/logs', (req, res) => {
    const tenantId = (req as any).tenantId;
    const portfolioId = req.query.portfolioId as string;
    const since = req.query.since as string;
    const type = req.query.type as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // NOTE: For PoC we parse the file in memory. For larger files, this will be slow and should be moved to a DB or indexed.
    try {
      if (!fs.existsSync('./data/audit-trail.jsonl')) {
        return res.json({ total: 0, data: [] });
      }
      
      const fileContent = fs.readFileSync('./data/audit-trail.jsonl', 'utf-8');
      const lines = fileContent.split('\n').filter(l => l.trim().length > 0);
      
      let allLogs = lines.map(l => JSON.parse(l));
      
      // Filter by tenant
      if (tenantId !== 'superadmin') {
        const tenantStates = stateManager.getStatesFilteredByTenant(tenantId || '');
        allLogs = allLogs.filter(log => {
          const accId = log.accountId || (log.eventId && log.eventId.split(':')[0]);
          return accId && tenantStates[accId];
        });
      }

      // Filter by query params
      if (portfolioId) {
        allLogs = allLogs.filter(log => log.accountId === portfolioId);
      }
      if (type) {
        allLogs = allLogs.filter(log => log.type === type); // Assuming log.type exists
      }
      if (since) {
        const sinceTime = new Date(since).getTime();
        allLogs = allLogs.filter(log => new Date(log.createdAt).getTime() >= sinceTime);
      }
      
      // Sort desc by time (assuming append-only JSONL means naturally sorted asc)
      allLogs.reverse();

      const total = allLogs.length;
      const data = allLogs.slice(offset, offset + limit);

      res.json({ total, data });
    } catch (e: any) {
      sendError(res, 500, 'INTERNAL_ERROR', e.message);
    }
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
      const model = state.portfolioState.modelId ? models.find(m => m.modelId === state.portfolioState.modelId) : null;
      if (model) {
        try {
          const evalResult = evaluateRebalance({
            eventId: `api-eval-${Date.now()}`,
            portfolioState: state.portfolioState,
            targetAllocation: model.targetAllocation,
            priceSnapshot: prices,
            policy: model.policy,
            createdAt: new Date().toISOString()
          });
          driftStatus = evalResult.trigger.isTriggered ? 'threshold_breach' : 'in_band';
          driftMeasurements = evalResult.driftMeasurements;
        } catch (e) {
          // Ignore
        }
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
        totalValue,
        cash: state.portfolioState.cash,
        lastEvaluatedAt: new Date().toISOString(),
        driftStatus,
        holdings
      };
    });
    
    res.json(result);
  });

  app.get('/api/portfolios/:id', (req, res) => {
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
    
    const model = state.portfolioState.modelId ? stateManager.getModels(state.portfolioState.tenantId || '').find(m => m.modelId === state.portfolioState.modelId) : null;
    if (model) {
      try {
        const evalResult = evaluateRebalance({
          eventId: `api-eval-${Date.now()}`,
          portfolioState: state.portfolioState,
          targetAllocation: model.targetAllocation,
          priceSnapshot: prices,
          policy: model.policy,
          createdAt: new Date().toISOString()
        });
        driftStatus = evalResult.trigger.isTriggered ? 'threshold_breach' : 'in_band';
        driftMeasurements = evalResult.driftMeasurements;
      } catch (e) {}
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

    // NOTE: For PoC we parse the file in memory. For larger files, this will be slow and should be moved to a DB or indexed.
    try {
      const fileContent = fs.readFileSync('./data/audit-trail.jsonl', 'utf-8');
      const lines = fileContent.split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        if (!lines[i].trim()) continue;
        const parsed = JSON.parse(lines[i]);
        if (parsed.accountId === accountId && parsed.outputs && parsed.outputs.tradeProposal) {
          lastProposal = parsed.outputs.tradeProposal;
          break;
        }
      }
    } catch(e) {}

    res.json({
      accountId: state.portfolioState.accountId,
      tenantId: state.portfolioState.tenantId,
      modelId: state.portfolioState.modelId || null,
      totalValue,
      cash: state.portfolioState.cash,
      lastEvaluatedAt: new Date().toISOString(),
      driftStatus,
      holdings,
      pendingCashFlows: state.portfolioState.cashFlows?.filter((c: any) => c.status === 'PENDING') || [],
      circuitBreakerStatus: { status: 'CLOSED' }, // Mock default if not accessible
      lastProposal
    });
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

  app.get('/api/portfolios/:id/proposals', (req, res) => {
    const tenantId = (req as any).tenantId;
    const accountId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 20;

    const state = stateManager.getAccountState(accountId);
    if (!state || (tenantId !== 'superadmin' && state.portfolioState.tenantId !== tenantId)) {
      return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', `Portfolio '${accountId}' not found`);
    }

    const proposals: any[] = [];
    
    // NOTE: For PoC we parse the file in memory. For larger files, this will be slow and should be moved to a DB or indexed.
    try {
      const fileContent = fs.readFileSync('./data/audit-trail.jsonl', 'utf-8');
      const lines = fileContent.split('\n');
      for (let i = lines.length - 1; i >= 0 && proposals.length < limit; i--) {
        if (!lines[i].trim()) continue;
        const parsed = JSON.parse(lines[i]);
        if (parsed.accountId === accountId && parsed.outputs && parsed.outputs.tradeProposal) {
          proposals.push({
            proposedAt: parsed.createdAt,
            executionMode: parsed.outputs.executionTargetMode,
            executed: parsed.type === 'LIVE_EXECUTION', // basic assumption based on type
            trades: parsed.outputs.tradeProposal.trades,
            warnings: parsed.outputs.tradeProposal.warnings.map((w: any) => w.message)
          });
        }
      }
    } catch(e) {}

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
