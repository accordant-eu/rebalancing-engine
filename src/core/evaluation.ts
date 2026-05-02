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
import { calculateDrift } from './drift';
import { PostTradeSimulation, simulatePostTrade } from './simulation';
import { generateTradeProposal } from './trades';
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

export interface RebalanceEvaluationInput {
  eventId: string;
  createdAt: string;
  portfolioState: PortfolioState;
  targetAllocation: TargetAllocation;
  priceSnapshot: PriceSnapshot;
  policy: RebalancingPolicy;
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
}

export function evaluateRebalance(input: RebalanceEvaluationInput): RebalanceEvaluation {
  const valuation = calculateValuation(input.portfolioState, input.priceSnapshot);
  const weights = calculateCurrentWeights(valuation);
  const driftMeasurements = calculateDrift(weights, input.targetAllocation, input.policy);
  const strategy = selectStrategy(input.policy.strategyType);
  const trigger = strategy.evaluateTrigger(input.portfolioState, driftMeasurements, input.policy);
  const tradeProposal = trigger.isTriggered
    ? generateTradeProposal(valuation, input.targetAllocation, input.priceSnapshot, input.policy)
    : {
        trades: [],
        estimatedPostTradeCash: valuation.cash,
        warnings: [],
        executionTargetMode: input.policy.executionTargetMode ?? 'full_reset',
        boundaryBandMode:
          input.policy.executionTargetMode === 'boundary'
            ? (input.policy.boundaryBandMode ?? 'absolute')
            : undefined,
      };
  const postTradeSimulation = simulatePostTrade(
    input.portfolioState,
    input.priceSnapshot,
    input.targetAllocation,
    input.policy,
    tradeProposal,
  );
  const explanation = generateExplanation(trigger, tradeProposal, postTradeSimulation);
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
