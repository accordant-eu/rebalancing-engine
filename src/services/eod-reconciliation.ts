import * as cron from 'node-cron';
import { SqliteStateManager } from '../orchestrator/sqlite-state';
import { AlpacaBrokerAdapter } from '../broker/alpaca-broker';
import { logger } from '../utils/logger';

export class EodReconciliationJob {
  private stateManager: SqliteStateManager;
  private task: cron.ScheduledTask | null = null;
  // In a real multi-tenant app, we'd have a broker factory here instead of hardcoding Alpaca
  private brokerAdapter = new AlpacaBrokerAdapter();

  constructor(stateManager: SqliteStateManager) {
    this.stateManager = stateManager;
  }

  /**
   * Schedule the EOD job.
   * Default: 16:15 ET (20:15 UTC normally, or 21:15 UTC in winter)
   * Using '15 16 * * 1-5' for Mon-Fri 16:15 system local time for now.
   */
  public start(cronExpression: string = '15 16 * * 1-5'): void {
    if (this.task) {
      this.task.stop();
    }

    this.task = cron.schedule(cronExpression, async () => {
      logger.info('[EODRecon] Starting End-of-Day Reconciliation Job');
      await this.runReconciliation();
    });
    logger.info(`[EODRecon] Scheduled EOD Reconciliation with cron: ${cronExpression}`);
  }

  public stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }

  /**
   * Runs the reconciliation for all tenants and their portfolios.
   * Exposed publicly to allow triggering manually for tests.
   */
  public async runReconciliation(): Promise<void> {
    const tenants = this.stateManager.getAllTenants();
    for (const tenant of tenants) {
      const brokerConfig = this.stateManager.getTenantBrokerConfig(tenant.tenantId);
      
      if (!brokerConfig || brokerConfig.brokerType !== 'ALPACA') {
        logger.debug({ tenantId: tenant.tenantId }, '[EODRecon] Skipping tenant (No live Alpaca broker config)');
        continue;
      }

      logger.info({ tenantId: tenant.tenantId }, '[EODRecon] Reconciling tenant');
      
      const context = {
        tenantId: tenant.tenantId,
        brokerConfig
      };

      const accountStates = this.stateManager.getStatesFilteredByTenant(tenant.tenantId);
      for (const [accountId, state] of Object.entries(accountStates)) {
        try {
          // Note: In real life, fetchPositions takes the broker account ID.
          // For MVP, we pass accountId directly (which matches broker ID for system demo).
          const brokerState = await this.brokerAdapter.getPortfolioState(context, accountId);
          
          let hasDiscrepancy = false;
          
          // Compare Holdings
          if (brokerState.holdings.length !== state.portfolioState.holdings.length) {
            hasDiscrepancy = true;
          } else {
            for (const h of brokerState.holdings) {
              const localH = state.portfolioState.holdings.find(x => x.instrumentId === h.instrumentId);
              if (!localH || Math.abs(localH.quantity - h.quantity) > 0.0001) {
                hasDiscrepancy = true;
                break;
              }
            }
          }

          // Compare Cash
          if (Math.abs(brokerState.cash - state.portfolioState.cash) > 0.01) {
            hasDiscrepancy = true;
          }

          if (hasDiscrepancy) {
            logger.warn({ accountId }, '[EODRecon] Discrepancy found! Adjusting SQLite state to match broker.');
            // Overwrite local state with broker's truth
            this.stateManager.updatePortfolio(accountId, {
              holdings: brokerState.holdings,
              cash: brokerState.cash
            });
            // We would also write a LedgerAdjustment audit event here
          }
        } catch (e: any) {
          logger.error({ e: e.message, accountId }, '[EODRecon] Failed to reconcile portfolio');
        }
      }
    }
    logger.info('[EODRecon] End-of-Day Reconciliation Job Complete');
  }
}
