export interface Target {
  instrumentId: string;
  weight: number;
}

export interface Position {
  instrumentId: string;
  quantity: number;
}

export type MandateArchetype = 'StaticWeights' | 'EfficientFrontier' | 'MinimumVariance';
export type EvaluationFrequency = 'realtime' | 'daily' | 'weekly' | 'monthly';
export type ExecutionTargetMode = 'full_reset' | 'boundary';
export type BoundaryBandMode = 'absolute' | 'relative';
export type SellSelectionMode = 'FIFO' | 'LIFO' | 'HIGHEST_COST' | 'LOWEST_COST';
export type DepositAllocationMode = 'REBALANCING' | 'CURRENT_WEIGHT' | 'FIXED_TARGET';

export interface CalendarRebalancingConfig {
  evaluationDate: string;
  nextRebalanceDate: string;
  frequency?: 'monthly' | 'quarterly' | 'annually' | 'explicit';
}

export interface RebalancingPolicy {
  evaluationDate?: string;
  strategyType?: 'threshold' | 'manual' | 'calendar';
  executionTargetMode?: ExecutionTargetMode;
  boundaryBandMode?: BoundaryBandMode;
  sellSelectionMode?: SellSelectionMode;
  absoluteDriftTolerance: number;
  relativeDriftTolerance?: number;
  minimumTradeSize: number;
  maxFrictionBps?: number;
  driftUtilityConversionRate?: number;
  depositAllocationMode?: DepositAllocationMode;
  calendar?: CalendarRebalancingConfig;
}

export interface ConstraintIndicator {
  type: string;
  parameters: any;
}

export interface ModelMandate {
  modelId: string;
  tenantId: string;
  name: string;
  archetype?: MandateArchetype;
  evaluationFrequency?: EvaluationFrequency;
  targetAllocation: { targets: Target[]; cashBuffer?: number };
  policy: RebalancingPolicy;
  constraints?: ConstraintIndicator[];
}

export interface LiveState {
  portfolioState: { 
    accountId: string; 
    tenantId?: string; 
    modelId?: string; 
    subscriptionType?: string; 
    cash: number; 
    holdings: Position[] 
  };
  priceSnapshot: { prices: Record<string, number> };
  targetAllocation: { targets: Target[]; cashBuffer?: number };
  policy: RebalancingPolicy;
}

export interface StatePayload {
  globalPrices: { prices: Record<string, number> };
  portfolios: Record<string, LiveState>;
}
