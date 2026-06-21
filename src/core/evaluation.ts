import { generateAuditRecord, AuditRecord } from '../audit';
import { generateExplanation, RecommendationExplanation } from '../explanation';
import {
  DriftMeasurement,
  PortfolioState,
  PriceSnapshot,
  RebalancingPolicy,
  RebalancingStrategyType,
  StrategyInterface,
  TargetAllocation,
  TradeProposal,
  TriggerResult,
} from '../models/domain';
import { CalendarRebalanceStrategy, ManualRebalanceStrategy, ThresholdStrategy } from '../strategy';
import {
  applyCashFlowSchedules,
  CashFlowScheduleSummary,
  validateIsoDateOnly,
} from './cash-flows';
import { calculateDrift } from './drift';
import { PostTradeSimulation, simulatePostTrade } from './simulation';
import {
  generateTradeProposal,
} from './trades';
import { FrictionModel } from './friction';
import {
  buildCashFlowProposalWarnings,
  buildCashFlowScheduleProposalWarnings,
} from '../explanation/warnings';
import {
  calculateCurrentWeights,
  calculateValuation,
  ValuationResult,
  WeightResult,
} from './valuation';

const STRATEGY_REGISTRY: Record<RebalancingStrategyType, StrategyInterface> = {
  threshold: new ThresholdStrategy(),
  manual: new ManualRebalanceStrategy(),
  calendar: new CalendarRebalanceStrategy(),
};

import { QualityIndicator, EvaluationState } from './quality';

export interface RebalanceEvaluationInput {
  eventId: string;
  createdAt: string;
  evaluationDate?: string;
  portfolioState: PortfolioState;
  targetAllocation: TargetAllocation;
  priceSnapshot: PriceSnapshot;
  policy: RebalancingPolicy;
  frictionModel?: FrictionModel;
  indicators?: QualityIndicator[];
}

export interface RebalanceEvaluation {
  valuation: ValuationResult;
  weights: WeightResult[];
  driftMeasurements: DriftMeasurement[];
  trigger: TriggerResult;
  tradeProposal: TradeProposal;
  postTradeSimulation: PostTradeSimulation;
  explanation: RecommendationExplanation;
  auditRecord: AuditRecord;
  cashFlowScheduleSummary?: CashFlowScheduleSummary;
  qualityResults?: Array<{ name: string; passed: boolean; reason?: string }>;
}

export function evaluateRebalance(input: RebalanceEvaluationInput): RebalanceEvaluation {
  const evaluationDate = resolveEvaluationDate(input);
  const scheduledCashFlowExpansion = applyCashFlowSchedules(input.portfolioState, evaluationDate);
  const effectivePortfolioState = scheduledCashFlowExpansion.portfolioState;
  const cashFlowScheduleSummary = scheduledCashFlowExpansion.summary;
  const valuation = calculateValuation(effectivePortfolioState, input.priceSnapshot);
  const weights = calculateCurrentWeights(valuation);
  const driftMeasurements = calculateDrift(weights, input.targetAllocation, input.policy);
  const strategy = selectStrategy(input.policy.strategyType);
  const trigger = strategy.evaluateTrigger(effectivePortfolioState, driftMeasurements, input.policy);
  let tradeProposal = trigger.isTriggered
    ? generateTradeProposal(
        valuation,
        input.targetAllocation,
        input.priceSnapshot,
        input.policy,
        cashFlowScheduleSummary,
        input.frictionModel,
      )
    : {
        trades: [],
        estimatedPostTradeCash: valuation.cash,
        warnings: [
          ...buildCashFlowProposalWarnings(valuation.cashFlowSummary),
          ...buildCashFlowScheduleProposalWarnings(cashFlowScheduleSummary),
        ],
        executionTargetMode: input.policy.executionTargetMode ?? 'full_reset',
        boundaryBandMode:
          input.policy.executionTargetMode === 'boundary'
            ? (input.policy.boundaryBandMode ?? 'absolute')
            : undefined,
      };

  let postTradeSimulation = simulatePostTrade(
    effectivePortfolioState,
    input.priceSnapshot,
    input.targetAllocation,
    input.policy,
    tradeProposal,
  );

  const qualityResults: Array<{ name: string; passed: boolean; reason?: string }> = [];

  // Evaluate quality indicators if trades are proposed
  if (input.indicators && input.indicators.length > 0 && tradeProposal.trades.length > 0) {
    const preTradeState: EvaluationState = {
      valuation,
      weightResults: weights,
      target: input.targetAllocation,
      policy: input.policy,
      proposedTrades: [],
      estimatedTco: 0
    };

    let estimatedTco = 0;
    if (input.frictionModel) {
      for (const t of tradeProposal.trades) {
        estimatedTco += input.frictionModel.estimateCost(t.quantity * input.priceSnapshot.prices[t.instrumentId], t.instrumentId);
      }
    }

    const postTradeState: EvaluationState = {
      valuation: postTradeSimulation.postTradeValuation,
      weightResults: postTradeSimulation.postTradeWeights,
      target: input.targetAllocation,
      policy: input.policy,
      proposedTrades: tradeProposal.trades,
      estimatedTco
    };

    let allPassed = true;
    for (const indicator of input.indicators) {
      const result = indicator.evaluate(preTradeState, postTradeState);
      qualityResults.push({ name: indicator.name, passed: result.passed, reason: result.reason });
      if (!result.passed) {
        allPassed = false;
      }
    }

    // If any quality indicator fails, we reject the trades
    if (!allPassed) {
      const failureReasons = qualityResults.filter(q => !q.passed).map(q => `${q.name}: ${q.reason}`).join(' | ');
      tradeProposal = {
        ...tradeProposal,
        trades: [],
        warnings: [...tradeProposal.warnings, { code: 'QUALITY_CHECK_FAILED', message: failureReasons }]
      };
      
      // Re-simulate post-trade with 0 trades
      postTradeSimulation = simulatePostTrade(
        effectivePortfolioState,
        input.priceSnapshot,
        input.targetAllocation,
        input.policy,
        tradeProposal,
      );
    }
  }

  const explanation = generateExplanation(
    trigger,
    tradeProposal,
    postTradeSimulation,
    cashFlowScheduleSummary,
  );
  const auditRecord = generateAuditRecord({
    eventId: input.eventId,
    createdAt: input.createdAt,
    portfolioState: input.portfolioState,
    targetAllocation: input.targetAllocation,
    priceSnapshot: input.priceSnapshot,
    policy: input.policy,
    driftMeasurements,
    trigger,
    tradeProposal,
    postTradeSimulation,
    explanation,
    cashFlowSummary: valuation.cashFlowSummary,
    cashFlowScheduleSummary,
  });

  return {
    valuation,
    weights,
    driftMeasurements,
    trigger,
    tradeProposal,
    postTradeSimulation,
    explanation,
    auditRecord,
    cashFlowScheduleSummary,
    qualityResults
  };
}

export function supportedStrategyTypes(): RebalancingStrategyType[] {
  return Object.keys(STRATEGY_REGISTRY).sort() as RebalancingStrategyType[];
}

export function selectStrategy(strategyType: string | undefined): StrategyInterface {
  const resolvedStrategyType = strategyType ?? 'threshold';
  const strategy = STRATEGY_REGISTRY[resolvedStrategyType as RebalancingStrategyType];

  if (strategy === undefined) {
    throw new Error(`Unsupported rebalancing strategy: ${resolvedStrategyType}`);
  }

  return strategy;
}

function resolveEvaluationDate(input: RebalanceEvaluationInput): string | undefined {
  const evaluationDate =
    input.evaluationDate ?? input.policy.evaluationDate ?? input.policy.calendar?.evaluationDate;

  if (evaluationDate !== undefined) {
    validateIsoDateOnly(evaluationDate, 'evaluationDate');
  }

  return evaluationDate;
}
