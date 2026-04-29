/**
 * Domain Models for the Portfolio Rebalancing Engine.
 * Note: MVP uses standard JavaScript `number` for values.
 * In a production financial system, a strict Decimal library (e.g., decimal.js) would be used to avoid float precision errors.
 */

export interface Holding {
  instrumentId: string;
  quantity: number;
}

export interface PortfolioState {
  accountId: string;
  cash: number;
  holdings: Holding[];
}

export interface TargetWeight {
  instrumentId: string;
  weight: number; // e.g. 0.60 for 60%
}

export interface TargetAllocation {
  targets: TargetWeight[];
}

export interface PriceSnapshot {
  prices: Record<string, number>; // Map of instrumentId -> price
}

export interface RebalancingPolicy {
  // Global absolute drift tolerance (e.g., 0.05 for 5%)
  absoluteDriftTolerance: number;
  // Global relative drift tolerance (e.g., 0.20 for 20% of target) - Optional
  relativeDriftTolerance?: number;
  // Minimum trade size (absolute monetary value)
  minimumTradeSize: number;
}

// Outputs
export interface DriftMeasurement {
  instrumentId: string;
  currentWeight: number;
  targetWeight: number;
  absoluteDrift: number;
  relativeDrift: number;
  isOutOfBand: boolean;
}

export type TradeDirection = 'BUY' | 'SELL';

export interface ProposedTrade {
  instrumentId: string;
  direction: TradeDirection;
  quantity: number;
  estimatedPrice: number;
  estimatedValue: number;
}

export interface TradeProposal {
  trades: ProposedTrade[];
  estimatedPostTradeCash: number;
}

export interface AuditRecord {
  timestamp: string;
  accountId: string;
  portfolioState: PortfolioState;
  targetAllocation: TargetAllocation;
  priceSnapshot: PriceSnapshot;
  policy: RebalancingPolicy;
  driftMeasurements: DriftMeasurement[];
  tradeProposal: TradeProposal;
  triggerReason: string | null;
}

export interface TriggerResult {
  isTriggered: boolean;
  reason: string | null;
}

export interface StrategyInterface {
  evaluateTrigger(
    state: PortfolioState,
    drift: DriftMeasurement[],
    policy: RebalancingPolicy,
  ): TriggerResult;
}
