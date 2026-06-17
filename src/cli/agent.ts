import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import readline from 'readline';
import { FileAuditStorage } from '../audit/storage';
import { AlpacaBrokerAdapter } from '../broker/alpaca-broker';
import { BrokerExecutor, CircuitBreaker, DryRunExecutor, MultiPortfolioStateManager, Orchestrator } from '../orchestrator';
import { StdoutNotificationAdapter } from '../notifications';
import { loadScenarioFixture } from '../runner';
import { initDb, getDb } from '../db/sqlite';
import { executeSeed } from './seed';
import { SqliteStateManager } from '../orchestrator/sqlite-state';
import { CommandContext, CommandResult } from './commands';
import { UsageError } from './errors';
import { ParsedArgs } from './options';
import { validateTargetAllocation } from '../core/drift';

export function executeAgent(parsed: ParsedArgs, _context: CommandContext): CommandResult {
  if (parsed.subcommand === 'seed') {
    return executeSeed(parsed, _context);
  }

  if (parsed.subcommand !== 'start') {
    throw new UsageError(`Unknown agent command: ${parsed.subcommand}`);
  }

  const scenarioFile = parsed.options['scenarios'];
  const scenarioId = parsed.options['scenario-id'];
  const isLive = parsed.options['live'] === 'alpaca';

  if (typeof scenarioFile !== 'string') {
    throw new UsageError('--scenarios <file> is required');
  }
  if (typeof scenarioId !== 'string') {
    throw new UsageError('--scenario-id <id> is required');
  }

  const fixture = loadScenarioFixture(scenarioFile);
  const scenario = fixture.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) {
    throw new UsageError(`Scenario ${scenarioId} not found in fixture ${scenarioFile}`);
  }

  const notifications = new StdoutNotificationAdapter();
  const auditStorage = new FileAuditStorage('./data/audit-trail.jsonl');

  if (isLive) {
    if (!process.env.APCA_API_KEY_ID || !process.env.APCA_API_SECRET_KEY) {
      notifications.notify('error', 'Missing Alpaca API credentials. Please set APCA_API_KEY_ID and APCA_API_SECRET_KEY in the environment.');
      process.exit(1);
    }
    
    notifications.notify('info', 'Initializing live broker connection...');
    const adapter = new AlpacaBrokerAdapter();

    (async () => {
      try {
        initDb();
        const stateManager = new SqliteStateManager();
        
        // Ensure the scenario portfolio is loaded into SQLite (our shadow ledger)
        // If we wanted to load live state, we'd do: await adapter.getPortfolioState(scenarioId)
        // But for B2B we rely on webhooks for fills and local state for decisions.
        const accountIdToUse = isLive ? 'f7ec6539-d742-4b91-a5db-20f475e8acfc' : scenarioId;
        
        let initialPortfolioState = { ...scenario.portfolioState, accountId: accountIdToUse };
        if (isLive && adapter) {
          initialPortfolioState = await adapter.getPortfolioState(accountIdToUse);
        }

        stateManager.registerPortfolio(accountIdToUse, {
          portfolioState: initialPortfolioState,
          priceSnapshot: { prices: {} },
          targetAllocation: scenario.targetAllocation,
          policy: scenario.policy,
        });

        const executor = new CircuitBreaker(new BrokerExecutor(adapter), {
          maxTradesPerSession: 5,
          maxGrossNotionalPerTrade: 500000,
        }, notifications);

        const orchestrator = new Orchestrator(stateManager, executor, {
          cooldownMs: 60000, // 1 minute cooldown for paper trading
        }, auditStorage, notifications);

        const app = setupExpressApp(stateManager);

        app.listen(4444, '127.0.0.1', () => {
          notifications.notify('info', 'Command Center API listening on http://127.0.0.1:4444');
        });

        orchestrator.start();
        notifications.notify('info', 'Live Agent (Alpaca Broker API) Started.', { target: scenarioId });
        console.error(`Press Ctrl+C to stop.\n`);

        const pollPrices = async () => {
          try {
            // Fetch prices for all symbols across all portfolios
            const allIds = stateManager.getAllAccountIds();
            const allSymbols = new Set<string>();
            for (const id of allIds) {
              const state = stateManager.getAccountState(id);
              state.targetAllocation.targets.forEach(t => allSymbols.add(t.instrumentId));
              state.portfolioState.holdings.forEach(h => allSymbols.add(h.instrumentId));
            }
            
            if (allSymbols.size > 0) {
              const prices = await adapter.getPrices(Array.from(allSymbols));
              stateManager.updateGlobalPrices(prices, new Date().toISOString());
              
              // We rely on price updates to enqueue portfolios via reverse-index in a real system.
              // For the sake of keeping the tick moving, we explicitly enqueue all accounts here.
              for (const id of allIds) {
                stateManager.enqueuePortfolio(id, Date.now());
              }
            }

            orchestrator.onTick(Date.now());
          } catch (e) {
            notifications.notify('error', 'Poll Error', { error: String(e) });
          }
        };

        // Run immediately, then poll prices every 10s
        await pollPrices();
        setInterval(pollPrices, 10000);
      } catch (e) {
        notifications.notify('error', 'Init Error', { error: String(e) });
        process.exit(1);
      }
    })();
  } else {
    // DRY RUN SYNTHETIC MODE (MULTI-PORTFOLIO via SQLITE)
    initDb();
    const stateManager = new SqliteStateManager();
    const loadedScenarios = fixture.scenarios.slice(0, 5); // Fallback if DB is empty

    // We only load these fallback scenarios if the DB is empty
    if (stateManager.getAllAccountIds().length === 0) {
      for (const s of loadedScenarios) {
        stateManager.registerPortfolio(s.id, {
          portfolioState: s.portfolioState,
          priceSnapshot: s.priceSnapshot,
          targetAllocation: s.targetAllocation,
          policy: s.policy,
        });
        stateManager.updateGlobalPrices(s.priceSnapshot.prices, s.priceSnapshot.asOf);
      }
    }
    
    // Refresh the loaded scenario list from the DB
    const allIds = stateManager.getAllAccountIds();

    const auditStorageAdapter = {
      saveAuditRecord: async (record: any) => {
        await auditStorage.saveAuditRecord(record);
        if (record.outputs?.trigger?.isTriggered && record.outputs?.postTradeSimulation) {
          const accountId = record.accountId || record.eventId.split(':')[0];
          // Update the persistent database directly
          const postState = record.outputs.postTradeSimulation.postTradeState;
          stateManager.updatePortfolio(accountId, postState);
        }
      }
    };

    const orchestrator = new Orchestrator(stateManager, new DryRunExecutor(), {
      cooldownMs: 10000,
    }, auditStorageAdapter, notifications);

    const app = setupExpressApp(stateManager);

    app.listen(4444, '127.0.0.1', () => {
      notifications.notify('info', 'Command Center API listening on http://127.0.0.1:4444');
    });

    orchestrator.start();

    console.error(`Starting Live Agent in Dry-Run mode.`);
    console.error(`Scenarios loaded from DB: ${allIds.length}`);
    console.error(`Tick Interval: 1000ms`);
    console.error(`Cooldown: 10000ms`);
    console.error(`Press Ctrl+C to stop.\n`);

    setInterval(() => {
      const currentPrices = stateManager.getGlobalPrices().prices;
      const newPrices = { ...currentPrices };

      // Artificially drift the prices
      const firstAsset = Object.keys(newPrices)[0];
      const secondAsset = Object.keys(newPrices)[1];
      if (firstAsset) {
        newPrices[firstAsset] = newPrices[firstAsset] * 1.02; // Up 2%
      }
      if (secondAsset) {
        newPrices[secondAsset] = newPrices[secondAsset] * 0.985; // Down 1.5%
      }

      stateManager.updateGlobalPrices(newPrices, new Date().toISOString());
      
      const now = Date.now();
      const affected1 = firstAsset ? stateManager.getPortfoliosAffectedByInstrument(firstAsset) : [];
      const affected2 = secondAsset ? stateManager.getPortfoliosAffectedByInstrument(secondAsset) : [];
      
      for (const id of new Set([...affected1, ...affected2])) {
        stateManager.enqueuePortfolio(id, now);
      }

      orchestrator.onTick(now);
    }, 1000);
  }

  return { exitCode: 0, output: '' };
}

function setupExpressApp(stateManager: SqliteStateManager) {
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

  app.post('/api/webhooks/alpaca', (req, res) => {
    // Simulated webhook endpoint for asynchronous trade fills from Alpaca
    // A real implementation would parse the TradeUpdate payload:
    // https://alpaca.markets/docs/api-references/broker-api/events/trade-updates/
    const event = req.body;
    console.log('[Webhook] Received Alpaca event:', event);

    if (event.event === 'fill') {
      // In a real system, we'd update the SqliteStateManager with the new settled quantity and cash.
      // For this MVP, we just acknowledge receipt.
      const accountId = event.account_id;
      if (accountId) {
        // We could also enqueue the portfolio for an immediate re-evaluation after a fill
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
      // In a real app we'd fetch all models across all tenants or have a specific superadmin view
      // For now we'll just return all models
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
          // Only show logs for this tenant's portfolios
          // In a real system, audit records would explicitly contain tenantId
          // Here we just check if the accountId is owned by this tenant, or if it's superadmin
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
