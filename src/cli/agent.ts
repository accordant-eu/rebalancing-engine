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

  const notifications = new StdoutNotificationAdapter();
  const auditStorage = new FileAuditStorage('./data/audit-trail.jsonl');

  if (isLive) {
    if (!process.env.APCA_API_KEY_ID || !process.env.APCA_API_SECRET_KEY) {
      notifications.notify('error', 'Missing Alpaca API credentials. Please set APCA_API_KEY_ID and APCA_API_SECRET_KEY in the environment.');
      process.exit(1);
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
      });

      const executor = new CircuitBreaker(new BrokerExecutor(adapter), {
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

      const pollPrices = async () => {
        try {
          const allIds = stateManager.getAllAccountIds();
          const allSymbols = new Set<string>();
          for (const id of allIds) {
            const state = stateManager.getAccountState(id);
            state.targetAllocation.targets.forEach((t: any) => allSymbols.add(t.instrumentId));
            state.portfolioState.holdings.forEach((h: any) => allSymbols.add(h.instrumentId));
          }
          
          if (allSymbols.size > 0) {
            const context = {
              tenantId: 'system',
              brokerConfig: {
                brokerType: 'ALPACA',
                brokerApiKey: process.env.ALPACA_BROKER_API_KEY || '',
                brokerApiSecret: process.env.ALPACA_BROKER_API_SECRET || ''
              }
            };
            const prices = await adapter.getPrices(context, Array.from(allSymbols));
            stateManager.updateGlobalPrices(prices, new Date().toISOString());
            
            for (const id of allIds) {
              stateManager.enqueuePortfolio(id, Date.now());
            }
          }

          orchestrator.onTick(Date.now());
        } catch (e) {
          notifications.notify('error', 'Poll Error', { error: String(e) });
        }
      };

      await pollPrices();
      setInterval(pollPrices, 10000);
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
