import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import readline from 'readline';
import { FileAuditStorage } from '../audit/storage';
import { AlpacaAdapter } from '../broker/alpaca';
import { BrokerExecutor, CircuitBreaker, DryRunExecutor, MultiPortfolioStateManager, Orchestrator } from '../orchestrator';
import { StdoutNotificationAdapter } from '../notifications';
import { loadScenarioFixture } from '../runner';
import { initDb } from '../db/sqlite';
import { executeSeed } from './seed';
import { SqliteStateManager } from '../orchestrator/sqlite-state';
import { CommandContext, CommandResult } from './commands';
import { UsageError } from './errors';
import { ParsedArgs } from './options';

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
    const adapter = new AlpacaAdapter();

    (async () => {
      try {
        initDb();
        const livePortfolio = await adapter.getPortfolioState();

        const stateManager = new SqliteStateManager();
        stateManager.registerPortfolio(scenarioId, {
          portfolioState: {
            ...scenario.portfolioState,
            ...livePortfolio, // Override synthetic cash/holdings with live ledger
          },
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

        const app = express();
        app.use(cors());
        
        app.get('/api/state', (req, res) => {
          res.json({
            globalPrices: stateManager.getGlobalPrices(),
            portfolios: stateManager.getAllStates(),
          });
        });

        app.get('/api/logs', (req, res) => {
          const lines: any[] = [];
          const rl = readline.createInterface({
            input: fs.createReadStream('./data/audit-trail.jsonl'),
            crlfDelay: Infinity
          });

          rl.on('line', (line) => {
            if (line.trim().length > 0) {
              try {
                lines.push(JSON.parse(line));
                if (lines.length > 100) lines.shift();
              } catch (e) {
                // Ignore invalid lines
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

        app.listen(4444, '127.0.0.1', () => {
          notifications.notify('info', 'Command Center API listening on http://127.0.0.1:4444');
        });

        orchestrator.start();
        notifications.notify('info', 'Live Agent (Alpaca Paper) Started.', { target: scenarioId });
        console.error(`Press Ctrl+C to stop.\n`);

        const poll = async () => {
          try {
            if (await adapter.hasOpenOrders()) {
              notifications.notify('info', 'Pending broker orders detected. Pausing drift evaluation.');
              return;
            }

            const currentPortfolio = await adapter.getPortfolioState();
            stateManager.updatePortfolio(scenarioId, currentPortfolio);

            const symbols = scenario.targetAllocation.targets.map((t) => t.instrumentId);
            const prices = await adapter.getPrices(symbols);
            stateManager.updateGlobalPrices(prices, new Date().toISOString());

            orchestrator.onTick(Date.now());
          } catch (e) {
            notifications.notify('error', 'Poll Error', { error: String(e) });
          }
        };

        // Run immediately, then poll every 10s
        await poll();
        setInterval(poll, 10000);
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

    const app = express();
    app.use(cors());
    
    app.get('/api/state', (req, res) => {
      res.json({
        globalPrices: stateManager.getGlobalPrices(),
        portfolios: stateManager.getAllStates(),
      });
    });

    app.get('/api/logs', (req, res) => {
      const lines: any[] = [];
      const rl = readline.createInterface({
        input: fs.createReadStream('./data/audit-trail.jsonl'),
        crlfDelay: Infinity
      });

      rl.on('line', (line) => {
        if (line.trim().length > 0) {
          try {
            lines.push(JSON.parse(line));
            if (lines.length > 100) lines.shift();
          } catch (e) {
            // Ignore invalid lines
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
      orchestrator.onTick(Date.now());
    }, 1000);
  }

  return { exitCode: 0, output: '' };
}
