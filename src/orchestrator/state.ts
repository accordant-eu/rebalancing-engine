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

export interface LiveStateManager {
  registerPortfolio(accountId: string, state: LiveState): void;
  updateGlobalPrices(prices: Record<string, number>, asOf?: string): void;
  updatePortfolio(accountId: string, portfolioUpdate: Partial<PortfolioState>): void;
  updateTarget(accountId: string, target: TargetAllocation): void;
  updatePolicy(accountId: string, policy: RebalancingPolicy): void;
  markTradeExecution(accountId: string, timestampMs: number): void;
  getLastTradeTimeMs(accountId: string): number;
  getAccountState(accountId: string): LiveState;
  getAllAccountIds(): string[];
  getAllStates(): Record<string, LiveState>;
  getGlobalPrices(): PriceSnapshot;
  isReady(accountId: string): boolean;
}

export class MultiPortfolioStateManager implements LiveStateManager {
  private globalPriceSnapshot: PriceSnapshot = { prices: {} };
  private portfolios: Map<string, LiveState> = new Map();
  private lastTradeTimes: Map<string, number> = new Map();

  public registerPortfolio(accountId: string, state: LiveState): void {
    this.portfolios.set(accountId, state);
    this.lastTradeTimes.set(accountId, 0);
  }

  public updateGlobalPrices(prices: Record<string, number>, asOf?: string): void {
    this.globalPriceSnapshot = {
      ...this.globalPriceSnapshot,
      prices: { ...this.globalPriceSnapshot.prices, ...prices },
      asOf,
    };
    
    for (const [accountId, state] of this.portfolios.entries()) {
      state.priceSnapshot = {
        ...state.priceSnapshot,
        prices: { ...state.priceSnapshot.prices, ...prices },
        asOf,
      };
    }
  }

  public updatePortfolio(accountId: string, portfolioUpdate: Partial<PortfolioState>): void {
    const state = this.ensureInitialized(accountId);
    state.portfolioState = {
      ...state.portfolioState,
      ...portfolioUpdate,
    };
  }

  public updateTarget(accountId: string, target: TargetAllocation): void {
    const state = this.ensureInitialized(accountId);
    state.targetAllocation = target;
  }

  public updatePolicy(accountId: string, policy: RebalancingPolicy): void {
    const state = this.ensureInitialized(accountId);
    state.policy = policy;
  }

  public markTradeExecution(accountId: string, timestampMs: number): void {
    this.lastTradeTimes.set(accountId, timestampMs);
  }

  public getLastTradeTimeMs(accountId: string): number {
    return this.lastTradeTimes.get(accountId) ?? 0;
  }

  public getAccountState(accountId: string): LiveState {
    return this.ensureInitialized(accountId);
  }

  public getAllAccountIds(): string[] {
    return Array.from(this.portfolios.keys());
  }

  public getAllStates(): Record<string, LiveState> {
    const record: Record<string, LiveState> = {};
    for (const [key, val] of this.portfolios.entries()) {
      record[key] = val;
    }
    return record;
  }

  public getGlobalPrices(): PriceSnapshot {
    return this.globalPriceSnapshot;
  }

  public isReady(accountId: string): boolean {
    return this.portfolios.has(accountId);
  }

  private ensureInitialized(accountId: string): LiveState {
    const state = this.portfolios.get(accountId);
    if (!state) {
      throw new Error(`MultiPortfolioStateManager is not initialized for account ${accountId}`);
    }
    return state;
  }
}
