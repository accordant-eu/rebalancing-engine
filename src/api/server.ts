import express from 'express';
import cors from 'cors';
import fs from 'fs';
import readline from 'readline';
import { getDb } from '../db/sqlite';
import { SqliteStateManager } from '../orchestrator/sqlite-state';
import { validateTargetAllocation } from '../core/drift';
import { MockOptimizerService } from '../optimizer';
import { logger } from '../utils/logger';

import { Orchestrator } from '../orchestrator/loop';
import { globalMetrics } from '../services/metrics';

export function setupExpressApp(stateManager: SqliteStateManager, orchestrator?: Orchestrator) {
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
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid token format' });
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
      return res.status(403).json({ error: 'Superadmin access required' });
    }
    next();
  };

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    
    const user = stateManager.getUserByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
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
