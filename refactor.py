import os
import re

domain_ts = "src/models/domain.ts"
with open(domain_ts, "r") as f:
    content = f.read()

# Replace TriggerResult
old_trigger = """export interface TriggerResult {
  isTriggered: boolean;
  reason: string | null;
  strategyType: RebalancingStrategyType;
  metadata?: Record<string, string | number | boolean | null>;
}"""
new_trigger = """export type TriggerResult =
  | { isTriggered: false }
  | {
      isTriggered: true;
      reason: string;
      strategyType: RebalancingStrategyType;
      metadata?: Record<string, string | number | boolean | null>;
    };"""
content = content.replace(old_trigger, new_trigger)

# Replace ProposalWarning
old_warning = """export interface ProposalWarning {
  code: ProposalWarningCode;
  message: string;
  instrumentId?: string;
  estimatedValue?: number;
  minimumTradeSize?: number;
  pendingCashFlowCount?: number;
  pendingNetAmount?: number;
  futureScheduledCashFlowCount?: number;
  futureScheduledNetAmount?: number;
}"""
new_warning = """export type ProposalWarning =
  | { code: 'ZERO_PRICE'; message: string; instrumentId: string }
  | { code: 'CASH_DEFICIT'; message: string; estimatedValue: number }
  | { code: 'WASH_SALE_LOCKOUT'; message: string; instrumentId: string }
  | { code: 'UK_BED_AND_BREAKFAST_LOCKOUT'; message: string; instrumentId: string }
  | { code: 'ROUNDING_PRECISION_LIMIT'; message: string; instrumentId: string }
  | { code: 'NEGATIVE_CASH_POST_TRADE'; message: string; estimatedValue: number }
  | { code: 'QUALITY_CHECK_FAILED'; message: string }
  | { code: 'MINIMUM_TRADE_SIZE'; message: string; instrumentId: string; estimatedValue: number; minimumTradeSize: number }
  | { code: 'PENDING_CASH_FLOW_EXCLUDED'; message: string; pendingCashFlowCount: number; pendingNetAmount: number }
  | { code: 'FUTURE_CASH_FLOW_SCHEDULED'; message: string; futureScheduledCashFlowCount: number; futureScheduledNetAmount: number }
  | { code: 'FRICTION_COST_EXCEEDED'; message: string; instrumentId: string; estimatedValue: number }
  | { code: 'QUALITY_EVALUATION_FAILED'; message: string }
  | { code: 'TLH_HARVEST_GENERATED'; message: string; instrumentId: string; estimatedValue: number }
  | { code: 'TAX_AWARE_US_STUB'; message: string }
  | { code: 'TAX_OPTIMIZER_UNREACHABLE_FALLBACK'; message: string }
  | { code: 'TAX_OPTIMIZER_SUCCESS'; message: string };"""
content = content.replace(old_warning, new_warning)

with open(domain_ts, "w") as f:
    f.write(content)

