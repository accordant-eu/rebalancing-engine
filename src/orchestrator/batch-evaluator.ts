import { LiveStateManager } from './state';
import { Executor } from './executor';
import { evaluateRebalanceAsync } from '../core/evaluation';
import { DriftReductionIndicator, ConcentrationLimitIndicator, DriftUtilityTranslator } from '../core/quality';
import { PercentageSlippageModel } from '../core/friction';
import { AuditStorageAdapter } from '../audit/storage';
import { NotificationAdapter } from '../notifications';
import { logger } from '../utils/logger';
import { systemEventBus } from '../events/bus';
import { ExecutionContext } from '../models/domain';

export interface BatchEvaluationWorkerConfig {
  batchSize?: number; // default: 25
  throttleIntervalMs?: number; // default: 200ms
  pollIntervalMs?: number; // default: 1000ms
}

export interface BatchJobStatus {
  status: 'IDLE' | 'PROCESSING' | 'PAUSED';
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  tradesGeneratedCount: number;
  lastBatchSize: number;
  lastProcessedAt?: string;
  currentQueueDepth: number;
}

export interface BatchProcessResult {
  processed: number;
  successes: number;
  failures: number;
  tradesGenerated: number;
  accountIds: string[];
}

export class BatchEvaluationWorker {
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private isProcessingBatch: boolean = false;
  private timer: NodeJS.Timeout | null = null;

  private totalProcessed: number = 0;
  private successCount: number = 0;
  private failureCount: number = 0;
  private tradesGeneratedCount: number = 0;
  private lastBatchSize: number = 0;
  private lastProcessedAt?: string;

  private batchSize: number;
  private throttleIntervalMs: number;
  private pollIntervalMs: number;

  constructor(
    private stateManager: LiveStateManager,
    private executor?: Executor,
    config: BatchEvaluationWorkerConfig = {},
    private auditStorage?: AuditStorageAdapter,
    private notifications?: NotificationAdapter
  ) {
    this.batchSize = config.batchSize ?? 25;
    this.throttleIntervalMs = config.throttleIntervalMs ?? 200;
    this.pollIntervalMs = config.pollIntervalMs ?? 1000;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.scheduleNextPoll();
    logger.info('[BatchEvaluationWorker] Worker started');
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    logger.info('[BatchEvaluationWorker] Worker stopped');
  }

  public pause(): void {
    this.isPaused = true;
    logger.info('[BatchEvaluationWorker] Worker paused');
  }

  public resume(): void {
    this.isPaused = false;
    logger.info('[BatchEvaluationWorker] Worker resumed');
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getStatus(): BatchJobStatus {
    const queueDepth = (this.stateManager as any).getQueueDepth
      ? (this.stateManager as any).getQueueDepth()
      : 0;

    let status: 'IDLE' | 'PROCESSING' | 'PAUSED' = 'IDLE';
    if (this.isPaused) {
      status = 'PAUSED';
    } else if (this.isProcessingBatch) {
      status = 'PROCESSING';
    }

    return {
      status,
      totalProcessed: this.totalProcessed,
      successCount: this.successCount,
      failureCount: this.failureCount,
      tradesGeneratedCount: this.tradesGeneratedCount,
      lastBatchSize: this.lastBatchSize,
      lastProcessedAt: this.lastProcessedAt,
      currentQueueDepth: queueDepth,
    };
  }

  private scheduleNextPoll(): void {
    if (!this.isRunning) return;
    this.timer = setTimeout(async () => {
      if (this.isRunning && !this.isPaused && !this.isProcessingBatch) {
        try {
          await this.processNextBatch();
        } catch (err: any) {
          logger.error(`[BatchEvaluationWorker] Error during batch run: ${err?.message || err}`);
        }
      }
      this.scheduleNextPoll();
    }, this.pollIntervalMs);
  }

  public async processNextBatch(limit: number = this.batchSize): Promise<BatchProcessResult> {
    if (this.isProcessingBatch) {
      return { processed: 0, successes: 0, failures: 0, tradesGenerated: 0, accountIds: [] };
    }

    this.isProcessingBatch = true;
    const accountIds = this.stateManager.dequeuePortfolios(limit);

    if (accountIds.length === 0) {
      this.isProcessingBatch = false;
      return { processed: 0, successes: 0, failures: 0, tradesGenerated: 0, accountIds: [] };
    }

    let successes = 0;
    let failures = 0;
    let tradesGenerated = 0;
    const timestampMs = Date.now();

    for (const accountId of accountIds) {
      try {
        if (!this.stateManager.isReady(accountId)) {
          continue;
        }

        const state = this.stateManager.getAccountState(accountId);

        if (state.portfolioState.circuitBreakerStatus === 'open') {
          logger.warn(`[BatchEvaluationWorker] Skipping account ${accountId}: circuitBreakerStatus is open.`);
          continue;
        }

        const pendingOrders = this.stateManager.getPendingOrders?.(state.portfolioState.tenantId) || [];
        if (pendingOrders.some((o) => o.accountId === accountId)) {
          logger.warn(`[BatchEvaluationWorker] Skipping account ${accountId}: pending broker orders in flight.`);
          continue;
        }

        const tenantId = state.portfolioState.tenantId || 'default';
        const configuredBroker = this.stateManager.getTenantBrokerConfig
          ? this.stateManager.getTenantBrokerConfig(tenantId)
          : undefined;
        if (this.executor && this.stateManager.getTenantBrokerConfig && !configuredBroker) {
          this.stateManager.updateCircuitBreakerStatus?.(accountId, 'open');
          throw new Error(`Missing broker config for tenant ${tenantId}. Circuit breaking execution for portfolio ${accountId}.`);
        }

        const brokerConfig = configuredBroker || {
          brokerType: 'MOCK',
          brokerApiKey: 'mock-key',
          brokerApiSecret: 'mock-secret',
        };

        const translateBrokerSymbol = (instrumentId: string, brokerType: string) => {
          if ((this.stateManager as any).getBrokerSymbol) {
            return (this.stateManager as any).getBrokerSymbol(instrumentId, brokerType);
          }
          return instrumentId.split(':')[0];
        };

        const context: ExecutionContext = { tenantId, brokerConfig, translateBrokerSymbol };

        const indicators: any[] = [];
        if (state.archetype === 'StaticWeights') {
          const conversionRate = state.policy.driftUtilityConversionRate ?? 1.0;
          indicators.push(new DriftReductionIndicator(new DriftUtilityTranslator(conversionRate)));

          if (state.constraints) {
            for (const c of state.constraints) {
              if (c.type === 'concentration_limit' && c.parameters && c.parameters.maxWeight) {
                indicators.push(new ConcentrationLimitIndicator(c.parameters.maxWeight));
              }
            }
          }
        }

        const slippageBps = state.policy.assumedSlippageBps ?? 5;
        const frictionModel = new PercentageSlippageModel(slippageBps);

        const evaluation = await evaluateRebalanceAsync({
          eventId: `batch-fan-out:${accountId}:${timestampMs}`,
          createdAt: new Date(timestampMs).toISOString(),
          portfolioState: state.portfolioState,
          targetAllocation: state.targetAllocation,
          priceSnapshot: state.priceSnapshot,
          policy: state.policy,
          frictionModel,
          indicators,
        });

        if (state.policy.calendar?.lastTriggeredRebalanceDate) {
          const clearedCalendar = { ...state.policy.calendar };
          delete clearedCalendar.lastTriggeredRebalanceDate;
          this.stateManager.updatePolicy(accountId, {
            ...state.policy,
            calendar: clearedCalendar,
          });
        }

        const proposal = evaluation.tradeProposal;

        if (proposal.trades.length > 0) {
          tradesGenerated += proposal.trades.length;

          if (this.executor) {
            await this.executor.execute(
              context,
              state.portfolioState.brokerAccountId || accountId,
              proposal,
              `batch-fan-out:${accountId}:${timestampMs}`
            );
          }
        }

        if (this.auditStorage) {
          const recordType = proposal.trades.length > 0 && this.executor ? 'LIVE_EXECUTION' : 'DRY_RUN_EVALUATION';
          await this.auditStorage.saveAuditRecord({ ...evaluation.auditRecord, type: recordType });
        }

        this.stateManager.markTradeExecution?.(accountId, timestampMs);
        successes++;
      } catch (err: any) {
        failures++;
        logger.error(`[BatchEvaluationWorker] Failed evaluating account ${accountId}: ${err?.message || err}`);
      }

      // Inter-item throttle delay if configured
      if (this.throttleIntervalMs > 0 && accountIds.length > 1) {
        await new Promise(resolve => setTimeout(resolve, Math.min(this.throttleIntervalMs, 50)));
      }
    }

    const processed = accountIds.length;
    this.totalProcessed += processed;
    this.successCount += successes;
    this.failureCount += failures;
    this.tradesGeneratedCount += tradesGenerated;
    this.lastBatchSize = processed;
    this.lastProcessedAt = new Date().toISOString();
    this.isProcessingBatch = false;

    // Broadcast progress event
    systemEventBus.publish({
      type: 'BATCH_EVALUATION_PROGRESS',
      timestamp: this.lastProcessedAt,
      data: {
        batchSize: processed,
        successes,
        failures,
        tradesGenerated,
        remainingQueueDepth: (this.stateManager as any).getQueueDepth?.() ?? 0,
      },
    });

    return {
      processed,
      successes,
      failures,
      tradesGenerated,
      accountIds,
    };
  }
}
