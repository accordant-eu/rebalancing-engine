import {
  DriftMeasurement,
  PortfolioState,
  PriceSnapshot,
  RebalancingPolicy,
  TargetAllocation,
  TradeProposal,
  TriggerResult,
} from '../models/domain';
import { PostTradeSimulation } from '../core/simulation';
import { RecommendationExplanation } from '../explanation';

export interface AuditRecordInput {
  eventId: string;
  createdAt: string;
  portfolioState: PortfolioState;
  targetAllocation: TargetAllocation;
  priceSnapshot: PriceSnapshot;
  policy: RebalancingPolicy;
  driftMeasurements: DriftMeasurement[];
  trigger: TriggerResult;
  tradeProposal: TradeProposal;
  postTradeSimulation: PostTradeSimulation;
  explanation: RecommendationExplanation;
}

export interface AuditRecord {
  eventId: string;
  createdAt: string;
  accountId: string;
  inputs: {
    portfolioState: PortfolioState;
    targetAllocation: TargetAllocation;
    priceSnapshot: PriceSnapshot;
    policy: RebalancingPolicy;
  };
  outputs: {
    driftMeasurements: DriftMeasurement[];
    trigger: TriggerResult;
    tradeProposal: TradeProposal;
    postTradeSimulation: PostTradeSimulation;
    explanation: RecommendationExplanation;
  };
}

export function generateAuditRecord(input: AuditRecordInput): AuditRecord {
  return {
    eventId: input.eventId,
    createdAt: input.createdAt,
    accountId: input.portfolioState.accountId,
    inputs: {
      portfolioState: input.portfolioState,
      targetAllocation: input.targetAllocation,
      priceSnapshot: input.priceSnapshot,
      policy: input.policy,
    },
    outputs: {
      driftMeasurements: input.driftMeasurements,
      trigger: input.trigger,
      tradeProposal: input.tradeProposal,
      postTradeSimulation: input.postTradeSimulation,
      explanation: input.explanation,
    },
  };
}

export function serializeAuditRecord(record: AuditRecord): string {
  return JSON.stringify(record, null, 2);
}
