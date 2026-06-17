import express from 'express';
import cors from 'cors';
import fs from 'fs';
import readline from 'readline';
import { getDb } from '../db/sqlite';
import { SqliteStateManager } from '../orchestrator/sqlite-state';
import { validateTargetAllocation } from '../core/drift';
import { MockOptimizerService } from '../optimizer';
import { logger } from '../utils/logger';

export function setupExpressApp(stateManager: SqliteStateManager) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Mock JWT Auth Middleware
  app.use((req, res, next) => {
    if (req.path === '/api/auth/login' || req.path === '/api/webhooks/alpaca') return next();
    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    
    // In our mock, the token IS the tenantId (e.g. "Bearer tenant-baseline")
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    (req as any).tenantId = token;
    next();
  });

  app.post('/api/auth/login', (req, res) => {
    const { tenantId } = req.body;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    // In real app, we would verify tenant exists and return a signed JWT
    res.json({ token: tenantId });
  });

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
    const lines: any[] = [];
    const rl = readline.createInterface({
      input: fs.createReadStream('./data/audit-trail.jsonl'),
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      if (line.trim().length > 0) {
        try {
          const parsed = JSON.parse(line);
          const accountId = parsed.accountId || (parsed.eventId && parsed.eventId.split(':')[0]);
          if (tenantId === 'superadmin') {
            lines.push(parsed);
            if (lines.length > 100) lines.shift();
          } else {
            const tenantStates = stateManager.getStatesFilteredByTenant(tenantId);
            if (accountId && tenantStates[accountId]) {
              lines.push(parsed);
              if (lines.length > 100) lines.shift();
            }
          }
        } catch (e) {
          // Ignore
        }
      }
    });

    rl.on('close', () => {
      res.json(lines);
    });
    
    rl.on('error', () => {
      if (!res.headersSent) res.json([]);
    });
  });

  return app;
}
