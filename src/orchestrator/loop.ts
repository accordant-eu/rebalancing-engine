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
    if (!this.isRunning || !this.stateManager.isReady()) {
      return;
    }

    const lastTradeTime = this.stateManager.getLastTradeTimeMs();
    if (lastTradeTime > 0 && timestampMs - lastTradeTime < this.config.cooldownMs) {
      // In cooldown period, ignore tick.
      return;
    }

    const currentState = this.stateManager.getState();

    const evaluation = evaluateRebalance({
      eventId: `tick:${timestampMs}`,
      createdAt: new Date(timestampMs).toISOString(),
      portfolioState: currentState.portfolioState,
      targetAllocation: currentState.targetAllocation,
      priceSnapshot: currentState.priceSnapshot,
      policy: currentState.policy,
    });

    if (evaluation.trigger.isTriggered && evaluation.tradeProposal.trades.length > 0) {
      if (this.notifications) {
        this.notifications.notify('info', `Triggered rebalance. Strategy: ${evaluation.trigger.strategyType}`, { eventId: evaluation.auditRecord.eventId });
      }

      this.executor.execute(evaluation.tradeProposal, evaluation.auditRecord.eventId);
      this.stateManager.markTradeExecution(timestampMs);

      if (this.auditStorage) {
        this.auditStorage.saveAuditRecord(evaluation.auditRecord).catch((err) => {
          if (this.notifications) {
            this.notifications.notify('error', 'Failed to save audit record', { error: String(err) });
          } else {
            console.error('Failed to save audit record:', err);
          }
        });
      }
    }
  }
}
