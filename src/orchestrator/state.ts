import {
  PortfolioState,
  PriceSnapshot,
  RebalancingPolicy,
  TargetAllocation,
} from '../models/domain';

export interface LiveState {
  portfolioState: PortfolioState;
  priceSnapshot: PriceSnapshot;
  targetAllocation: TargetAllocation;
  policy: RebalancingPolicy;
}

export class LiveStateManager {
  private state: LiveState | null = null;
  private lastTradeTimeMs: number = 0;

  constructor(initialState?: LiveState) {
    if (initialState) {
      this.state = initialState;
    }
  }

  public initialize(state: LiveState): void {
    this.state = state;
  }

  public updatePrices(prices: Record<string, number>, asOf?: string): void {
    this.ensureInitialized();
    this.state!.priceSnapshot = {
      ...this.state!.priceSnapshot,
      prices: { ...this.state!.priceSnapshot.prices, ...prices },
      asOf,
    };
  }

  public updatePortfolio(portfolioUpdate: Partial<PortfolioState>): void {
    this.ensureInitialized();
    this.state!.portfolioState = {
      ...this.state!.portfolioState,
      ...portfolioUpdate,
    };
  }

  public updateTarget(target: TargetAllocation): void {
    this.ensureInitialized();
    this.state!.targetAllocation = target;
  }

  public updatePolicy(policy: RebalancingPolicy): void {
    this.ensureInitialized();
    this.state!.policy = policy;
  }

  public markTradeExecution(timestampMs: number): void {
    this.lastTradeTimeMs = timestampMs;
  }

  public getLastTradeTimeMs(): number {
    return this.lastTradeTimeMs;
  }

  public getState(): LiveState {
    this.ensureInitialized();
    return this.state!;
  }

  public isReady(): boolean {
    return this.state !== null;
  }

  private ensureInitialized(): void {
    if (this.state === null) {
      throw new Error('LiveStateManager is not initialized');
    }
  }
}
