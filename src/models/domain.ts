/**
 * Domain Models for the Portfolio Rebalancing Engine.
 * Public inputs and outputs remain number-based for compatibility.
 * Core financial calculations use the explicit decimal and rounding policy
 * in `src/core/numeric.ts`, with rounding applied at output boundaries.
 */

export interface Holding {
  instrumentId: string;
  quantity: number;
  taxLots?: TaxLot[];
}

export interface TaxLot {
  lotId: string;
  quantity: number;
  acquisitionDate?: string;
  unitCost?: number;
}

export type CashFlowDirection = 'DEPOSIT' | 'WITHDRAWAL';

export type CashFlowStatus = 'SETTLED' | 'PENDING';

export type CashFlowSource = 'SCHEDULE';

export interface CashFlow {
  cashFlowId: string;
  direction: CashFlowDirection;
  status: CashFlowStatus;
  amount: number;
  effectiveDate?: string;
  description?: string;
  source?: CashFlowSource;
  sourceScheduleId?: string;
}

export type CashFlowRecurrenceFrequency = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

export interface CashFlowRecurrence {
  frequency: CashFlowRecurrenceFrequency;
  endDate?: string;
  occurrenceCount?: number;
}

export interface CashFlowSchedule {
  cashFlowScheduleId: string;
  direction: CashFlowDirection;
  amount: number;
  effectiveDate: string;
  recurrence?: CashFlowRecurrence;
  description?: string;
}

export interface PortfolioState {
  accountId: string;
  cash: number;
  holdings: Holding[];
  cashFlows?: CashFlow[];
  cashFlowSchedules?: CashFlowSchedule[];
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

export type BoundaryBandMode = 'absolute' | 'relative';

export type SellSelectionMode = 'FIFO' | 'LIFO' | 'HIGHEST_COST' | 'LOWEST_COST';

export interface CalendarRebalancingConfig {
  evaluationDate: string; // ISO date string; supplied by caller, never read from system time
  nextRebalanceDate: string; // ISO date string
  frequency?: 'monthly' | 'quarterly' | 'annually' | 'explicit';
}

export interface RebalancingPolicy {
  // Date used by non-calendar workflows to evaluate date-bound inputs such as scheduled cash flows.
  // ISO date-only string; callers supply it explicitly and the engine never reads system time.
  evaluationDate?: string;
  // Strategy defaults to threshold when omitted for backward compatibility.
  strategyType?: RebalancingStrategyType;
  // Trade sizing defaults to full reset. Boundary mode is a threshold-specific transaction-cost-aware proof point.
  executionTargetMode?: ExecutionTargetMode;
  // Boundary sizing defaults to absolute bands. Relative mode requires relativeDriftTolerance.
  boundaryBandMode?: BoundaryBandMode;
  // Generic lot allocation mode for sell trades. Defaults to FIFO when lots are supplied.
  sellSelectionMode?: SellSelectionMode;
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
  lotAllocations?: ProposedLotAllocation[];
}

export interface ProposedLotAllocation {
  lotId: string;
  quantity: number;
  estimatedValue: number;
  unitCost?: number;
  acquisitionDate?: string;
}

export type ProposalWarningCode =
  | 'MINIMUM_TRADE_SIZE'
  | 'PENDING_CASH_FLOW_EXCLUDED'
  | 'FUTURE_CASH_FLOW_SCHEDULED';

export interface ProposalWarning {
  code: ProposalWarningCode;
  message: string;
  instrumentId?: string;
  estimatedValue?: number;
  minimumTradeSize?: number;
  pendingCashFlowCount?: number;
  pendingNetAmount?: number;
  futureScheduledCashFlowCount?: number;
  futureScheduledNetAmount?: number;
}

export interface TradeProposal {
  trades: ProposedTrade[];
  estimatedPostTradeCash: number;
  warnings: ProposalWarning[];
  executionTargetMode: ExecutionTargetMode;
  boundaryBandMode?: BoundaryBandMode;
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
