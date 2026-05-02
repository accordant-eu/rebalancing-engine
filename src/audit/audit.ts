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
import { CashFlowSummary } from '../core/valuation';
import {
  roundDrift,
  roundMoney,
  roundPrice,
  roundQuantity,
  roundTurnover,
  roundWeight,
} from '../core/numeric';
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
  cashFlowSummary?: CashFlowSummary;
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
    strategyType: TriggerResult['strategyType'];
    executionTargetMode: TradeProposal['executionTargetMode'];
    boundaryBandMode?: TradeProposal['boundaryBandMode'];
    driftMeasurements: DriftMeasurement[];
    cashFlowSummary?: CashFlowSummary;
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
      strategyType: input.trigger.strategyType,
      executionTargetMode: input.tradeProposal.executionTargetMode,
      boundaryBandMode: input.tradeProposal.boundaryBandMode,
      driftMeasurements: input.driftMeasurements,
      cashFlowSummary: input.cashFlowSummary,
      trigger: input.trigger,
      tradeProposal: input.tradeProposal,
      postTradeSimulation: input.postTradeSimulation,
      explanation: input.explanation,
    },
  };
}

export function serializeAuditRecord(record: AuditRecord): string {
  return JSON.stringify(roundAuditRecordOutputs(record), null, 2);
}

export function roundAuditRecordOutputs(record: AuditRecord): AuditRecord {
  return {
    ...record,
    inputs: record.inputs,
    outputs: roundSerializableValue(record.outputs) as AuditRecord['outputs'],
  };
}

function roundSerializableValue(value: unknown, key?: string): unknown {
  if (typeof value === 'number') {
    return roundAuditNumber(value, key);
  }

  if (Array.isArray(value)) {
    return value.map((item) => roundSerializableValue(item));
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        roundSerializableValue(entryValue, entryKey),
      ]),
    );
  }

  return value;
}

function roundAuditNumber(value: number, key?: string): number {
  switch (key) {
    case 'quantity':
      return roundQuantity(value);
    case 'price':
    case 'estimatedPrice':
      return roundPrice(value);
    case 'weight':
    case 'currentWeight':
    case 'targetWeight':
      return roundWeight(value);
    case 'absoluteDrift':
    case 'relativeDrift':
      return roundDrift(value);
    case 'turnover':
      return roundTurnover(value);
    case 'cash':
    case 'estimatedValue':
    case 'marketValue':
    case 'minimumTradeSize':
    case 'estimatedPostTradeCash':
    case 'totalHoldingsValue':
    case 'totalPortfolioValue':
      return roundMoney(value);
    default:
      return value;
  }
}
