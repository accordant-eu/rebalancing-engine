import { TradeProposal, TriggerResult } from '../models/domain';
import { CashFlowScheduleSummary } from '../core/cash-flows';
import { PostTradeSimulation } from '../core/simulation';
import { formatFixed } from '../core/numeric';

export interface RecommendationExplanation {
  summary: string;
  triggerExplanation: string;
  cashFlowScheduleExplanation: string | null;
  tradeExplanation: string;
  warningExplanation: string | null;
  residualDriftExplanation: string;
}

export function generateExplanation(
  trigger: TriggerResult,
  proposal: TradeProposal,
  simulation?: PostTradeSimulation,
  cashFlowScheduleSummary?: CashFlowScheduleSummary,
): RecommendationExplanation {
  const summary = buildSummary(trigger, proposal, simulation);
  const strategyPrefix = `Strategy ${trigger.strategyType}`;
  const triggerExplanation = trigger.isTriggered
    ? `${strategyPrefix} triggered rebalance: ${trigger.reason ?? 'one or more policy thresholds were breached.'}`
    : `${strategyPrefix} did not trigger rebalance. No rebalance was triggered because the strategy conditions were not met.`;

  const tradeExplanation =
    proposal.trades.length === 0
      ? 'No trades are proposed.'
      : `Proposed ${describeExecutionTarget(proposal)} trades: ${proposal.trades
          .map(
            (trade) =>
              `${trade.direction} ${formatFixed(trade.quantity, 6)} ${trade.instrumentId} for approximately ${formatFixed(trade.estimatedValue, 2)}${describeLotAllocations(trade)}`,
          )
          .join('; ')}.`;

  const warningExplanation =
    proposal.warnings.length === 0
      ? null
      : `Warnings: ${proposal.warnings.map((warning) => warning.message).join(' ')}`;

  return {
    summary,
    triggerExplanation,
    cashFlowScheduleExplanation: buildCashFlowScheduleExplanation(cashFlowScheduleSummary),
    tradeExplanation,
    warningExplanation,
    residualDriftExplanation: buildResidualDriftExplanation(simulation),
  };
}

function buildCashFlowScheduleExplanation(
  summary: CashFlowScheduleSummary | undefined,
): string | null {
  if (summary === undefined) {
    return null;
  }

  return `Scheduled cash flows evaluated on ${summary.evaluationDate}: applied ${summary.appliedEventCount} event${summary.appliedEventCount === 1 ? '' : 's'} with net cash flow ${formatFixed(summary.netAppliedCashFlow, 2)}; excluded ${summary.futureEventCount} future event${summary.futureEventCount === 1 ? '' : 's'} with net future cash flow ${formatFixed(summary.netFutureCashFlow, 2)}; skipped ${summary.alreadyRepresentedEventCount} already represented event${summary.alreadyRepresentedEventCount === 1 ? '' : 's'}.`;
}

function describeLotAllocations(trade: TradeProposal['trades'][number]): string {
  if (trade.lotAllocations === undefined || trade.lotAllocations.length === 0) {
    return '';
  }

  return ` using lots ${trade.lotAllocations
    .map((allocation) => `${allocation.lotId}: ${formatFixed(allocation.quantity, 6)}`)
    .join(', ')}`;
}

function describeExecutionTarget(proposal: TradeProposal): string {
  if (proposal.executionTargetMode !== 'boundary') {
    return proposal.executionTargetMode;
  }

  return `${proposal.executionTargetMode} (${proposal.boundaryBandMode ?? 'absolute'} bands)`;
}

function buildSummary(
  trigger: TriggerResult,
  proposal: TradeProposal,
  simulation?: PostTradeSimulation,
): string {
  if (!trigger.isTriggered && proposal.trades.length === 0) {
    const hasResidualOutOfBandDrift =
      simulation?.residualDrift.some((drift) => drift.isOutOfBand) ?? false;
    if (hasResidualOutOfBandDrift) {
      return 'Strategy did not trigger; no rebalance is recommended.';
    }
    return 'Portfolio is within tolerance; no rebalance is recommended.';
  }
  if (proposal.trades.length === 0 && proposal.warnings.length > 0) {
    return 'Rebalance was triggered, but all proposed trades were suppressed by constraints.';
  }
  return `Rebalance recommendation includes ${proposal.trades.length} proposed trade${proposal.trades.length === 1 ? '' : 's'}.`;
}

function buildResidualDriftExplanation(simulation?: PostTradeSimulation): string {
  if (simulation === undefined) {
    return 'Residual drift was not simulated.';
  }

  const outOfBand = simulation.residualDrift.filter((drift) => drift.isOutOfBand);
  if (outOfBand.length === 0) {
    return `Post-trade simulation leaves all assets within tolerance. Estimated sell-side turnover is ${formatFixed(simulation.turnover * 100, 2)}%.`;
  }

  return `Post-trade simulation leaves residual out-of-band drift for: ${outOfBand
    .map((drift) => `${drift.instrumentId} (${formatFixed(drift.absoluteDrift * 100, 2)}%)`)
    .join(', ')}. Estimated sell-side turnover is ${formatFixed(simulation.turnover * 100, 2)}%.`;
}
