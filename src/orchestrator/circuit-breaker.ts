import { TradeProposal } from '../models/domain';
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
  ) {}

  public execute(proposal: TradeProposal, eventId: string): void {
    if (proposal.trades.length === 0) {
      return;
    }

    if (this.executedTradesCount >= this.limits.maxTradesPerSession) {
      throw new Error(
        `CIRCUIT BREAKER: Max trades per session (${this.limits.maxTradesPerSession}) reached. Blocking execution.`,
      );
    }

    let grossNotional = 0;
    for (const trade of proposal.trades) {
      grossNotional += trade.estimatedValue || 0;
    }

    if (grossNotional > this.limits.maxGrossNotionalPerTrade) {
      throw new Error(
        `CIRCUIT BREAKER: Gross notional value (${grossNotional}) exceeds limit (${this.limits.maxGrossNotionalPerTrade}). Blocking execution.`,
      );
    }

    this.targetExecutor.execute(proposal, eventId);
    this.executedTradesCount++;
  }

  public getExecutedCount(): number {
    return this.executedTradesCount;
  }
}
