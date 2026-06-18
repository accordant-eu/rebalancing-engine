import { TradeProposal, ExecutionContext } from '../models/domain';
import { NotificationAdapter } from '../notifications';
import { Executor } from './executor';

export interface CircuitBreakerLimits {
  maxTradesPerSession: number;
  maxGrossNotionalPerTrade: number;
}

export class CircuitBreaker implements Executor {
  private executedTradesCount: number = 0;

  constructor(
    private targetExecutor: Executor,
    private limits: CircuitBreakerLimits,
    private notifications?: NotificationAdapter,
  ) {}

  public async execute(context: ExecutionContext, brokerAccountId: string, proposal: TradeProposal, eventId: string): Promise<void> {
    if (proposal.trades.length === 0) {
      return;
    }

    if (this.executedTradesCount >= this.limits.maxTradesPerSession) {
      const msg = `CIRCUIT BREAKER: Max trades per session (${this.limits.maxTradesPerSession}) reached. Blocking execution.`;
      if (this.notifications) {
        this.notifications.notify('error', msg, { eventId, accountId: brokerAccountId, tradesCount: proposal.trades.length });
      }
      throw new Error(msg);
    }

    let grossNotional = 0;
    for (const trade of proposal.trades) {
      grossNotional += trade.estimatedValue || 0;
    }

    if (grossNotional > this.limits.maxGrossNotionalPerTrade) {
      const msg = `CIRCUIT BREAKER: Gross notional value (${grossNotional}) exceeds limit (${this.limits.maxGrossNotionalPerTrade}). Blocking execution.`;
      if (this.notifications) {
        this.notifications.notify('error', msg, { eventId, accountId: brokerAccountId, grossNotional });
      }
      throw new Error(msg);
    }

    await this.targetExecutor.execute(context, brokerAccountId, proposal, eventId);
    this.executedTradesCount++;
  }

  public getExecutedCount(): number {
    return this.executedTradesCount;
  }
}
