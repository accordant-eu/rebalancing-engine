import {
  DriftMeasurement,
  PortfolioState,
  PriceSnapshot,
  RebalancingPolicy,
  TargetAllocation,
  TradeProposal,
  TriggerResult, RebalancingStrategyType,
} from '../models/domain';
import { PostTradeSimulation } from '../core/simulation';
import { CashFlowScheduleSummary } from '../core/cash-flows';
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
  cashFlowScheduleSummary?: CashFlowScheduleSummary;
}

export interface TaxCostAttribution {
  oracleExecutionTimeMs?: number;
  estimatedRealizedLoss?: number;
  washSalesPrevented?: number;
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
    strategyType: RebalancingStrategyType | null;
    executionTargetMode: TradeProposal['executionTargetMode'];
    boundaryBandMode?: TradeProposal['boundaryBandMode'];
    driftMeasurements: DriftMeasurement[];
    cashFlowSummary?: CashFlowSummary;
    cashFlowScheduleSummary?: CashFlowScheduleSummary;
    trigger: TriggerResult;
    tradeProposal: TradeProposal;
    postTradeSimulation: PostTradeSimulation;
    explanation: RecommendationExplanation;
    taxCostAttribution?: TaxCostAttribution;
  };
}

export function generateAuditRecord(input: AuditRecordInput): AuditRecord {
  const metadata = input.tradeProposal.metadata;
  const hasTaxMetadata = metadata && (metadata.oracleExecutionTimeMs !== undefined || metadata.estimatedRealizedLoss !== undefined || metadata.washSalesPrevented !== undefined);
  const taxCostAttribution: TaxCostAttribution | undefined = hasTaxMetadata
    ? {
        oracleExecutionTimeMs: metadata.oracleExecutionTimeMs ? Number(metadata.oracleExecutionTimeMs) : undefined,
        estimatedRealizedLoss: metadata.estimatedRealizedLoss ? Number(metadata.estimatedRealizedLoss) : undefined,
        washSalesPrevented: metadata.washSalesPrevented ? Number(metadata.washSalesPrevented) : undefined,
      }
    : undefined;

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
      strategyType: 'strategyType' in input.trigger ? input.trigger.strategyType : null,
      executionTargetMode: input.tradeProposal.executionTargetMode,
      boundaryBandMode: input.tradeProposal.boundaryBandMode,
      driftMeasurements: input.driftMeasurements,
      cashFlowSummary: input.cashFlowSummary,
      cashFlowScheduleSummary: input.cashFlowScheduleSummary,
      trigger: input.trigger,
      tradeProposal: input.tradeProposal,
      postTradeSimulation: input.postTradeSimulation,
      explanation: input.explanation,
      ...(taxCostAttribution ? { taxCostAttribution } : {}),
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
