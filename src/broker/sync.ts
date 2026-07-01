import { LiveStateManager } from '../orchestrator/state';
import { AlpacaBrokerAdapter } from './alpaca-broker';
import { ExecutionContext } from '../models/domain';
import { Orchestrator } from '../orchestrator/loop';
import { logger } from '../utils/logger';

export class BrokerSyncService {
  private interval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private adapters: Map<string, AlpacaBrokerAdapter> = new Map();

  constructor(private stateManager: LiveStateManager, private orchestrator: Orchestrator) {}

  public start(intervalMs: number = 60000): void {
    if (this.interval) return;

    const runSync = async () => {
      if (this.isRunning) return;
      this.isRunning = true;
      try {
        await this.sync();
      } finally {
        this.isRunning = false;
      }
    };

    runSync(); // Initial sync
    this.interval = setInterval(runSync, intervalMs);
    logger.info(`[BrokerSyncService] Started with interval ${intervalMs}ms`);
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    logger.info('[BrokerSyncService] Stopped');
  }

  public async sync(): Promise<void> {
    try {
      const allIds = this.stateManager.getAllAccountIds();
      
      // Group by tenant
      const tenantAccounts = new Map<string, string[]>();
      for (const id of allIds) {
        const state = this.stateManager.getAccountState(id);
        const tenantId = state.portfolioState.tenantId || 'system';
        if (!tenantAccounts.has(tenantId)) {
          tenantAccounts.set(tenantId, []);
        }
        tenantAccounts.get(tenantId)!.push(id);
      }

      for (const [tenantId, accountIds] of tenantAccounts.entries()) {
        const config = this.stateManager.getTenantBrokerConfig?.(tenantId);
        
        // Skip mock or incomplete configs
        if (!config || config.brokerType !== 'ALPACA' || !config.brokerApiKey) {
           continue; 
        }

        const translateBrokerSymbol = (instrumentId: string, brokerType: string) => {
          if (this.stateManager.getBrokerSymbol) {
            return this.stateManager.getBrokerSymbol(instrumentId, brokerType);
          }
          return instrumentId.split(':')[0];
        };

        const translateBrokerSymbolToInstrumentId = (brokerSymbol: string, brokerType: string) => {
           if (this.stateManager.getInstrumentId) {
             return this.stateManager.getInstrumentId(brokerSymbol, brokerType);
           }
           return brokerSymbol;
        };

        const context: ExecutionContext = { 
          tenantId, 
          brokerConfig: config, 
          translateBrokerSymbol, 
          translateBrokerSymbolToInstrumentId 
        };
        
        let adapter = this.adapters.get(tenantId);
        if (!adapter) {
          adapter = new AlpacaBrokerAdapter();
          this.adapters.set(tenantId, adapter);
        }

        // 1. Sync Prices
        const allSymbols = new Set<string>();
        for (const id of accountIds) {
          const state = this.stateManager.getAccountState(id);
          state.targetAllocation.targets.forEach((t: any) => allSymbols.add(t.instrumentId));
          state.portfolioState.holdings.forEach((h: any) => allSymbols.add(h.instrumentId));
        }

        if (allSymbols.size > 0) {
          try {
            const prices = await adapter.getPrices(context, Array.from(allSymbols));
            this.stateManager.updateGlobalPrices(prices, new Date().toISOString());
          } catch (e) {
            logger.error(`[BrokerSyncService] Failed to sync prices for tenant ${tenantId}: ${e}`);
          }
        }

        // 2. Sync Positions and Cash
        for (const id of accountIds) {
          const state = this.stateManager.getAccountState(id);
          const brokerAccountId = state.portfolioState.brokerAccountId || id;
          try {
             const portfolio = await adapter.getPortfolioState(context, brokerAccountId);
             this.stateManager.updatePortfolio(id, portfolio);
          } catch (e) {
             logger.error(`[BrokerSyncService] Failed to sync portfolio ${id} for tenant ${tenantId}: ${e}`);
          }
        }
      }

      // Notify orchestrator that state has changed
      this.orchestrator.onTick(Date.now());
    } catch (e) {
      logger.error(`[BrokerSyncService] Sync error: ${e}`);
    }
  }
}
