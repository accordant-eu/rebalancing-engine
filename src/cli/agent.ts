import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import readline from 'readline';
import { FileAuditStorage, SqliteAuditStorage } from '../audit/storage';
import { AlpacaBrokerAdapter } from '../broker/alpaca-broker';
import { BrokerSyncService } from '../broker/sync';
import { BrokerExecutor, CircuitBreaker, DryRunExecutor, MultiPortfolioStateManager, Orchestrator } from '../orchestrator';
import { StdoutNotificationAdapter, WebhookNotifier, MultiNotifier } from '../notifications';
import { loadScenarioFixture } from '../runner';
import { initDb, getDb } from '../db/sqlite';
import { executeSeed } from './seed';
import { SqliteStateManager } from '../orchestrator/sqlite-state';
import { CommandContext, CommandResult } from './commands';
import { UsageError } from './errors';
import { ParsedArgs } from './options';
import { validateTargetAllocation } from '../core/drift';
import { MockOptimizerService } from '../optimizer';
import { setupExpressApp } from '../api/server';
import { startTickerSimulator } from '../simulator/ticker';
import { logger } from '../utils/logger';

export async function executeAgent(parsed: ParsedArgs, _context: CommandContext): Promise<CommandResult> {
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

  const stdNotifier = new StdoutNotificationAdapter();
  const notifiers = [stdNotifier];
  if (process.env.ALERT_WEBHOOK_URL) {
    notifiers.push(new WebhookNotifier(process.env.ALERT_WEBHOOK_URL));
  }
  const notifications = new MultiNotifier(notifiers);
  const auditStorage = new SqliteAuditStorage();

  if (isLive) {
    if (!process.env.ALPACA_BROKER_API_KEY || !process.env.ALPACA_BROKER_API_SECRET) {
      notifications.notify('warning', 'Missing Alpaca API credentials for the --live demo. The system tenant will not be able to execute trades.');
    }
    
    notifications.notify('info', 'Initializing live broker connection...');
    const adapter = new AlpacaBrokerAdapter();

    try {
      initDb();
      const stateManager = new SqliteStateManager();
      
      const accountIdToUse = isLive ? 'f7ec6539-d742-4b91-a5db-20f475e8acfc' : scenarioId;
      
      let initialPortfolioState = { ...scenario.portfolioState, accountId: accountIdToUse };
      if (isLive && adapter) {
        const context = {
          tenantId: 'system',
          brokerConfig: {
            brokerType: 'ALPACA',
            brokerApiKey: process.env.ALPACA_BROKER_API_KEY || '',
            brokerApiSecret: process.env.ALPACA_BROKER_API_SECRET || ''
          }
        };
        initialPortfolioState = await adapter.getPortfolioState(context, accountIdToUse);
      }

      stateManager.registerPortfolio(accountIdToUse, {
        portfolioState: initialPortfolioState,
        priceSnapshot: { prices: {} },
        targetAllocation: scenario.targetAllocation,
        policy: scenario.policy,
        archetype: 'StaticWeights',
        constraints: []
      });

      const executor = new CircuitBreaker(new BrokerExecutor(adapter, stateManager), {
        maxTradesPerSession: 5,
        maxGrossNotionalPerTrade: 500000,
      }, notifications);

      const auditStorageAdapter = {
        saveAuditRecord: async (record: any) => {
          await auditStorage.saveAuditRecord(record);
          if (record.outputs?.trigger?.isTriggered && record.outputs?.postTradeSimulation) {
            const accountId = record.accountId || record.eventId.split(':')[0];
            const postState = record.outputs.postTradeSimulation.postTradeState;
            stateManager.updatePortfolio(accountId, postState);
          }
        }
      };

      const orchestrator = new Orchestrator(stateManager, executor, {
        cooldownMs: 60000, // 1 minute cooldown for paper trading
      }, auditStorageAdapter, notifications);

      const app = setupExpressApp(stateManager, orchestrator);

      app.listen(4444, '127.0.0.1', () => {
        notifications.notify('info', 'Command Center API listening on http://127.0.0.1:4444');
      });

      orchestrator.start();
      notifications.notify('info', 'Live Agent (Alpaca Broker API) Started.', { target: scenarioId });
      logger.info(`Press Ctrl+C to stop.\n`);

      const syncService = new BrokerSyncService(stateManager, orchestrator);
      syncService.start(10000); // 10 second poll for testing/live feedback

    } catch (e) {
      notifications.notify('error', 'Init Error', { error: String(e) });
      process.exit(1);
    }
  } else {
    // DRY RUN SYNTHETIC MODE
    initDb();
    const stateManager = new SqliteStateManager();
    const loadedScenarios = fixture.scenarios.slice(0, 5);

    if (stateManager.getAllAccountIds().length === 0) {
      for (const s of loadedScenarios) {
        stateManager.registerPortfolio(s.id, {
          portfolioState: s.portfolioState,
          priceSnapshot: s.priceSnapshot,
          targetAllocation: s.targetAllocation,
          policy: s.policy,
          archetype: s.archetype || 'StaticWeights',
          constraints: s.constraints || []
        });
        stateManager.updateGlobalPrices(s.priceSnapshot.prices, s.priceSnapshot.asOf);
      }
    }
    
    const allIds = stateManager.getAllAccountIds();

    const auditStorageAdapter = {
      saveAuditRecord: async (record: any) => {
        await auditStorage.saveAuditRecord(record);
        if (record.outputs?.trigger?.isTriggered && record.outputs?.postTradeSimulation) {
          const accountId = record.accountId || record.eventId.split(':')[0];
          const postState = record.outputs.postTradeSimulation.postTradeState;
          stateManager.updatePortfolio(accountId, postState);
        }
      }
    };

    const orchestrator = new Orchestrator(stateManager, new DryRunExecutor(), {
      cooldownMs: 10000,
    }, auditStorageAdapter, notifications);

    const app = setupExpressApp(stateManager, orchestrator);

    app.listen(4444, '127.0.0.1', () => {
      notifications.notify('info', 'Command Center API listening on http://127.0.0.1:4444');
    });

    orchestrator.start();

    logger.info(`Starting Live Agent in Dry-Run mode.`);
    logger.info(`Scenarios loaded from DB: ${allIds.length}`);
    logger.info(`Tick Interval: 1000ms`);
    logger.info(`Cooldown: 10000ms`);
    logger.info(`Press Ctrl+C to stop.\n`);

    startTickerSimulator(stateManager, orchestrator, 1000);
  }

  return { exitCode: 0, output: '' };
}
