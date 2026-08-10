import {
  DriftMeasurement,
  TargetAllocation,
  PriceSnapshot,
  PortfolioState,
  RebalancingPolicy,
  TradeProposal,
} from '../models/domain';
import { ValuationResult, WeightResult } from './valuation';
import { CashFlowScheduleSummary } from './cash-flows';
import { FrictionModel } from './friction';
import { ExecutionOverlay } from './overlays';

export interface TradeOptimizerContext {
  valuation: ValuationResult;
  weights: WeightResult[];
  driftMeasurements: DriftMeasurement[];
  targetAllocation: TargetAllocation;
  priceSnapshot: PriceSnapshot;
  portfolioState: PortfolioState;
  policy: RebalancingPolicy;
  cashFlowScheduleSummary?: CashFlowScheduleSummary;
  frictionModel?: FrictionModel;
  executionOverlays?: ExecutionOverlay[];
}

export interface TradeOptimizerInterface {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  generateProposal(context: TradeOptimizerContext): Promise<TradeProposal> | TradeProposal;
}

export class TradeOptimizerRegistry {
  private static instance: TradeOptimizerRegistry;
  private optimizers: Map<string, TradeOptimizerInterface> = new Map();

  private constructor() {}

  public static getInstance(): TradeOptimizerRegistry {
    if (!TradeOptimizerRegistry.instance) {
      TradeOptimizerRegistry.instance = new TradeOptimizerRegistry();
    }
    return TradeOptimizerRegistry.instance;
  }

  public register(optimizer: TradeOptimizerInterface): void {
    this.optimizers.set(optimizer.id.toLowerCase(), optimizer);
  }

  public get(id?: string): TradeOptimizerInterface {
    const key = (id ?? 'standard_rule_based').toLowerCase();
    const optimizer = this.optimizers.get(key);
    if (!optimizer) {
      // Fall back to standard_rule_based if available, or throw
      const fallback = this.optimizers.get('standard_rule_based');
      if (fallback) {
        return fallback;
      }
      throw new Error(`Unknown trade optimizer: ${id}`);
    }
    return optimizer;
  }

  public list(): Array<{ id: string; name: string; description: string }> {
    return Array.from(this.optimizers.values()).map((opt) => ({
      id: opt.id,
      name: opt.name,
      description: opt.description,
    }));
  }

  public reset(): void {
    this.optimizers.clear();
  }
}
