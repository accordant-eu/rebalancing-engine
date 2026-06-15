import { AuditStorageAdapter } from '../audit/storage';
import { evaluateRebalance } from '../core/evaluation';
import { NotificationAdapter } from '../notifications';
import { Executor } from './executor';
import { LiveStateManager } from './state';

export interface OrchestratorConfig {
  cooldownMs: number; // e.g. 10 * 60 * 1000 for 10 minutes
}

export class Orchestrator {
  private isRunning: boolean = false;

  constructor(
    private stateManager: LiveStateManager,
    private executor: Executor,
    private config: OrchestratorConfig,
    private auditStorage?: AuditStorageAdapter,
    private notifications?: NotificationAdapter,
  ) {}

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
  }

  public stop(): void {
    this.isRunning = false;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Called by the data feed or polling loop whenever prices or positions change.
   */
  public onTick(timestampMs: number = Date.now()): void {
    if (!this.isRunning) {
      return;
    }

    // We dequeue up to 50 portfolios per tick to prevent blocking the event loop for too long
    const accountIds = this.stateManager.dequeuePortfolios(50);

    for (const accountId of accountIds) {
      if (!this.stateManager.isReady(accountId)) continue;

      const lastTradeTime = this.stateManager.getLastTradeTimeMs(accountId);
      if (lastTradeTime > 0 && timestampMs - lastTradeTime < this.config.cooldownMs) {
        // In cooldown period, ignore tick.
        continue;
      }

      const currentState = this.stateManager.getAccountState(accountId);

      const evaluation = evaluateRebalance({
        eventId: `${accountId}:tick:${timestampMs}`,
        createdAt: new Date(timestampMs).toISOString(),
        portfolioState: currentState.portfolioState,
        targetAllocation: currentState.targetAllocation,
        priceSnapshot: currentState.priceSnapshot,
        policy: currentState.policy,
      });

      if (evaluation.trigger.isTriggered && evaluation.tradeProposal.trades.length > 0) {
        if (this.notifications) {
          this.notifications.notify('info', `Triggered rebalance for ${accountId}. Strategy: ${evaluation.trigger.strategyType}`, { eventId: evaluation.auditRecord.eventId, accountId });
        }

        this.executor.execute(accountId, evaluation.tradeProposal, evaluation.auditRecord.eventId);
        this.stateManager.markTradeExecution(accountId, timestampMs);

        if (this.auditStorage) {
          this.auditStorage.saveAuditRecord(evaluation.auditRecord).catch((err) => {
            if (this.notifications) {
              this.notifications.notify('error', `Failed to save audit record for ${accountId}`, { error: String(err) });
            } else {
              console.error(`Failed to save audit record for ${accountId}:`, err);
            }
          });
        }
      }
    }
  }
}
