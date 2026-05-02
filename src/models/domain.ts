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

export type RebalancingStrategyType = 'threshold' | 'manual' | 'calendar';

export type ExecutionTargetMode = 'full_reset' | 'boundary';

export interface CalendarRebalancingConfig {
  evaluationDate: string; // ISO date string; supplied by caller, never read from system time
  nextRebalanceDate: string; // ISO date string
  frequency?: 'monthly' | 'quarterly' | 'annually' | 'explicit';
}

export interface RebalancingPolicy {
  // Strategy defaults to threshold when omitted for backward compatibility.
  strategyType?: RebalancingStrategyType;
  // Trade sizing defaults to full reset. Boundary mode is a threshold-specific transaction-cost-aware proof point.
  executionTargetMode?: ExecutionTargetMode;
  // Global absolute drift tolerance (e.g., 0.05 for 5%)
  absoluteDriftTolerance: number;
  // Global relative drift tolerance (e.g., 0.20 for 20% of target) - Optional
  relativeDriftTolerance?: number;
  // Minimum trade size (absolute monetary value)
  minimumTradeSize: number;
  // Required only when strategyType is calendar.
  calendar?: CalendarRebalancingConfig;
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

export type ProposalWarningCode = 'MINIMUM_TRADE_SIZE';

export interface ProposalWarning {
  code: ProposalWarningCode;
  message: string;
  instrumentId?: string;
  estimatedValue?: number;
  minimumTradeSize?: number;
}

export interface TradeProposal {
  trades: ProposedTrade[];
  estimatedPostTradeCash: number;
  warnings: ProposalWarning[];
  executionTargetMode: ExecutionTargetMode;
}

export interface TriggerResult {
  isTriggered: boolean;
  reason: string | null;
  strategyType: RebalancingStrategyType;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface StrategyInterface {
  evaluateTrigger(
    state: PortfolioState,
    drift: DriftMeasurement[],
    policy: RebalancingPolicy,
  ): TriggerResult;
}
