import { ProposedTrade, TargetAllocation, RebalancingPolicy } from '../models/domain';
import { ValuationResult, calculateCurrentWeights, WeightResult } from './valuation';
import { calculateDrift } from './drift';

/**
 * State snapshot used throughout the Quality Evaluation Pipeline.
 */
export interface EvaluationState {
  valuation: ValuationResult;
  weightResults: WeightResult[];
  target: TargetAllocation;
  policy: RebalancingPolicy;
  proposedTrades: ProposedTrade[]; // Trades proposed to reach this state. Empty for State A.
  estimatedTco: number; // The estimated Total Cost of Ownership in currency terms. 0 for State A.
}

/**
 * The unified output of any Quality Indicator evaluation.
 */
export interface QualityEvaluationResult {
  passed: boolean;
  scoreBefore?: number;
  scoreAfter?: number;
  expectedImprovement?: number;
  netUtilityBps?: number;
  reason?: string;
}

/**
 * The base interface for all Quality Indicators.
 */
export interface QualityIndicator {
  name: string;
  evaluate(preTradeState: EvaluationState, postTradeState: EvaluationState): QualityEvaluationResult;
}

/**
 * Utility Translator maps qualitative metrics and quantitative TCO into a unified dimension (basis points).
 */
export interface UtilityTranslator {
  translateImprovementToBps(scoreBefore: number, scoreAfter: number): number;
  translateTcoToBps(tcoValue: number, portfolioValue: number): number;
}

/**
 * A basic translator that equates 1% of drift reduction to 100 bps of utility,
 * adjusted by a configured conversion rate.
 */
export class DriftUtilityTranslator implements UtilityTranslator {
  constructor(private conversionRate: number = 1.0) {}

  translateImprovementToBps(scoreBefore: number, scoreAfter: number): number {
    const driftReduction = scoreBefore - scoreAfter; 
    // Example: If absolute drift sum went from 0.05 to 0.01, reduction is 0.04
    // 0.04 * 10000 = 400 bps. Multiply by conversion rate (e.g. 0.1 -> 40 utility bps).
    return (driftReduction * 10000) * this.conversionRate;
  }

  translateTcoToBps(tcoValue: number, portfolioValue: number): number {
    if (portfolioValue <= 0) return 0;
    const tcoPct = tcoValue / portfolioValue;
    return tcoPct * 10000;
  }
}

/**
 * Optimization Indicator: Evaluates if the trades reduce drift enough to justify the TCO.
 */
export class DriftReductionIndicator implements QualityIndicator {
  name = 'DriftReductionIndicator';

  constructor(private translator: UtilityTranslator) {}

  evaluate(preTradeState: EvaluationState, postTradeState: EvaluationState): QualityEvaluationResult {
    const preDrift = calculateDrift(preTradeState.weightResults, preTradeState.target, preTradeState.policy);
    const postDrift = calculateDrift(postTradeState.weightResults, postTradeState.target, postTradeState.policy);

    const sumAbsoluteDriftBefore = preDrift.reduce((acc, d) => acc + Math.abs(d.absoluteDrift), 0);
    const sumAbsoluteDriftAfter = postDrift.reduce((acc, d) => acc + Math.abs(d.absoluteDrift), 0);

    const improvementBps = this.translator.translateImprovementToBps(sumAbsoluteDriftBefore, sumAbsoluteDriftAfter);
    const tcoBps = this.translator.translateTcoToBps(postTradeState.estimatedTco, preTradeState.valuation.totalPortfolioValue);

    const netUtilityBps = improvementBps - tcoBps;
    
    // We require a strictly positive net utility
    const passed = netUtilityBps > 0;
    
    return {
      passed,
      scoreBefore: sumAbsoluteDriftBefore,
      scoreAfter: sumAbsoluteDriftAfter,
      expectedImprovement: sumAbsoluteDriftBefore - sumAbsoluteDriftAfter,
      netUtilityBps,
      reason: passed ? undefined : `Net utility ${netUtilityBps.toFixed(2)} bps is not positive (Improvement: ${improvementBps.toFixed(2)} bps, TCO: ${tcoBps.toFixed(2)} bps)`,
    };
  }
}

/**
 * Constraint Indicator: Hard boundary ensuring no holding exceeds a defined weight.
 */
export class ConcentrationLimitIndicator implements QualityIndicator {
  name = 'ConcentrationLimitIndicator';

  constructor(private maxWeightPerAsset: number) {}

  evaluate(_preTradeState: EvaluationState, postTradeState: EvaluationState): QualityEvaluationResult {
    const totalValue = postTradeState.valuation.totalPortfolioValue;
    if (totalValue <= 0) return { passed: true };

    for (const hw of postTradeState.weightResults) {
      if (hw.weight > this.maxWeightPerAsset) {
         return {
           passed: false,
           reason: `Concentration limit breached: ${hw.instrumentId} weight ${(hw.weight * 100).toFixed(2)}% exceeds max ${(this.maxWeightPerAsset * 100).toFixed(2)}%`,
         };
      }
    }
    
    return { passed: true };
  }
}
