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
  getTenantBrokerConfig?(tenantId: string): any;
  
  // Event-Driven Queueing
  enqueuePortfolio(accountId: string, timestampMs: number): void;
  dequeuePortfolios(limit: number): string[];
  getPortfoliosAffectedByInstrument(instrumentId: string): string[];
}

export class MultiPortfolioStateManager implements LiveStateManager {
  private globalPriceSnapshot: PriceSnapshot = { prices: {} };
  private portfolios: Map<string, LiveState> = new Map();
  private lastTradeTimes: Map<string, number> = new Map();
  private dirtyQueue: Set<string> = new Set();

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
    const p = this.portfolios.get(accountId);
    if (!p) return false;
    return p.portfolioState.holdings.every((h) => p.priceSnapshot.prices[h.instrumentId] !== undefined) &&
           p.targetAllocation.targets.every((t) => p.priceSnapshot.prices[t.instrumentId] !== undefined);
  }

  public enqueuePortfolio(accountId: string, timestampMs: number): void {
    if (this.portfolios.has(accountId)) {
      this.dirtyQueue.add(accountId);
    }
  }

  public dequeuePortfolios(limit: number): string[] {
    const items: string[] = [];
    for (const item of this.dirtyQueue) {
      items.push(item);
      this.dirtyQueue.delete(item);
      if (items.length >= limit) break;
    }
    return items;
  }

  public getPortfoliosAffectedByInstrument(instrumentId: string): string[] {
    const affected: string[] = [];
    for (const [accountId, state] of this.portfolios.entries()) {
      const holds = state.portfolioState.holdings.some(h => h.instrumentId === instrumentId);
      const targets = state.targetAllocation.targets.some(t => t.instrumentId === instrumentId);
      if (holds || targets) {
        affected.push(accountId);
      }
    }
    return affected;
  }

  private ensureInitialized(accountId: string): LiveState {
    const state = this.portfolios.get(accountId);
    if (!state) {
      throw new Error(`MultiPortfolioStateManager is not initialized for account ${accountId}`);
    }
    return state;
  }
}
