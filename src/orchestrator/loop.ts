import { AuditStorageAdapter } from '../audit/storage';
import { evaluateRebalance } from '../core/evaluation';
import { DriftReductionIndicator, ConcentrationLimitIndicator, DriftUtilityTranslator } from '../core/quality';
import { NotificationAdapter } from '../notifications';
import { Executor } from './executor';
import { logger } from '../utils/logger';
import { LiveStateManager } from './state';
import { ExecutionContext } from '../models/domain';
import { systemEventBus } from '../events/bus';

export interface OrchestratorConfig {
  cooldownMs: number; // e.g. 10 * 60 * 1000 for 10 minutes
}

export class Orchestrator {
  private isRunning: boolean = false;
  private isPaused: boolean = false;

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

  public pause(): void {
    this.isPaused = true;
    logger.info('[Orchestrator] Global pause enabled');
  }

  public resume(): void {
    this.isPaused = false;
    logger.info('[Orchestrator] Global pause disabled');
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Called by the data feed or polling loop whenever prices or positions change.
   */
  public async onTick(timestampMs: number = Date.now()): Promise<void> {
    if (!this.isRunning || this.isPaused) {
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

      try {
        const currentState = this.stateManager.getAccountState(accountId);

        const brokerAccountId = currentState.portfolioState.brokerAccountId || accountId;
        const tenantId = currentState.portfolioState.tenantId || 'default';
        const brokerConfig = this.stateManager.getTenantBrokerConfig?.(tenantId);
        
        if (!brokerConfig) {
          logger.error(`[Orchestrator] Missing broker config for tenant ${tenantId}. Circuit breaking execution for portfolio ${accountId}.`);
          continue; // Circuit break execution
        }

        const translateBrokerSymbol = (instrumentId: string, brokerType: string) => {
          if ((this.stateManager as any).getBrokerSymbol) {
            return (this.stateManager as any).getBrokerSymbol(instrumentId, brokerType);
          }
          return instrumentId.split(':')[0];
        };

        const context: ExecutionContext = { tenantId, brokerConfig, translateBrokerSymbol };

        const indicators: any[] = [];
        if (currentState.archetype === 'StaticWeights') {
          indicators.push(new DriftReductionIndicator(new DriftUtilityTranslator()));
          
          if (currentState.constraints) {
            for (const c of currentState.constraints) {
              if (c.type === 'concentration_limit' && c.parameters && c.parameters.maxWeight) {
                indicators.push(new ConcentrationLimitIndicator(c.parameters.maxWeight));
              }
            }
          }
        }
        const evaluation = evaluateRebalance({
          eventId: `${accountId}:tick:${timestampMs}`,
          createdAt: new Date(timestampMs).toISOString(),
          portfolioState: currentState.portfolioState,
          targetAllocation: currentState.targetAllocation,
          priceSnapshot: currentState.priceSnapshot,
          policy: currentState.policy,
          indicators
        });

        if (evaluation.trigger.isTriggered) {
          systemEventBus.emitEvent({
            type: 'THRESHOLD_BREACH',
            accountId,
            tenantId: currentState.portfolioState.tenantId,
            timestamp: new Date().toISOString(),
            eventId: evaluation.auditRecord.eventId,
            trigger: evaluation.trigger,
            auditRecord: evaluation.auditRecord
          });
        }

        if (evaluation.trigger.isTriggered && evaluation.tradeProposal.trades.length > 0) {
          if (this.notifications) {
            this.notifications.notify('info', `Triggered rebalance for ${accountId}. Strategy: ${evaluation.trigger.strategyType}`, { eventId: evaluation.auditRecord.eventId, accountId });
          }

          await this.executor.execute(context, brokerAccountId, evaluation.tradeProposal, evaluation.auditRecord.eventId);
          
          systemEventBus.emitEvent({
            type: 'REBALANCE_EXECUTED',
            accountId,
            tenantId: currentState.portfolioState.tenantId,
            timestamp: new Date().toISOString(),
            eventId: evaluation.auditRecord.eventId,
            tradeProposal: evaluation.tradeProposal
          });

          this.stateManager.markTradeExecution(accountId, timestampMs);

          if (this.auditStorage) {
            this.auditStorage.saveAuditRecord(evaluation.auditRecord).catch((err) => {
              if (this.notifications) {
                this.notifications.notify('error', `Failed to save audit record for ${accountId}`, { error: String(err) });
              } else {
                logger.error({ err }, `Failed to save audit record for ${accountId}`);
              }
            });
          }
        }
      } catch (err: any) {
        if (this.notifications) {
          this.notifications.notify('error', `Evaluation loop crashed for ${accountId}`, { error: err.message, stack: err.stack });
        } else {
          logger.error({ err }, `[CRITICAL] Evaluation loop crashed for ${accountId}`);
        }
        
        if (err.message && err.message.includes('CIRCUIT BREAKER')) {
          if (this.stateManager.updateCircuitBreakerStatus) {
            this.stateManager.updateCircuitBreakerStatus(accountId, 'open');
          }
        }

        // Log a fatal failure to audit storage if possible
        if (this.auditStorage) {
          this.auditStorage.saveAuditRecord({
            eventId: `${accountId}:tick:${timestampMs}:FATAL`,
            createdAt: new Date(timestampMs).toISOString(),
            accountId,
            type: 'EVALUATION',
            trigger: { isTriggered: false, strategyType: 'unknown', reason: 'FATAL_ERROR' },
            error: err.message,
            stack: err.stack
          } as any).catch(() => {});
        }
      }
    }
  }
}
