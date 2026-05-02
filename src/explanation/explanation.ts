import { TradeProposal, TriggerResult } from '../models/domain';
import { PostTradeSimulation } from '../core/simulation';

export interface RecommendationExplanation {
  summary: string;
  triggerExplanation: string;
  tradeExplanation: string;
  warningExplanation: string | null;
  residualDriftExplanation: string;
}

export function generateExplanation(
  trigger: TriggerResult,
  proposal: TradeProposal,
  simulation?: PostTradeSimulation,
): RecommendationExplanation {
  const summary = buildSummary(trigger, proposal);
  const triggerExplanation = trigger.isTriggered
    ? `Rebalance was triggered because ${trigger.reason ?? 'one or more policy thresholds were breached'}.`
    : 'No rebalance was triggered because all measured drift is within policy tolerance.';

  const tradeExplanation =
    proposal.trades.length === 0
      ? 'No trades are proposed.'
      : `Proposed trades: ${proposal.trades
          .map(
            (trade) =>
              `${trade.direction} ${trade.quantity.toFixed(6)} ${trade.instrumentId} for approximately ${trade.estimatedValue.toFixed(2)}`,
          )
          .join('; ')}.`;

  const warningExplanation =
    proposal.warnings.length === 0
      ? null
      : `Warnings: ${proposal.warnings.map((warning) => warning.message).join(' ')}`;

  return {
    summary,
    triggerExplanation,
    tradeExplanation,
    warningExplanation,
    residualDriftExplanation: buildResidualDriftExplanation(simulation),
  };
}

function buildSummary(trigger: TriggerResult, proposal: TradeProposal): string {
  if (!trigger.isTriggered && proposal.trades.length === 0) {
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
    return `Post-trade simulation leaves all assets within tolerance. Estimated sell-side turnover is ${(simulation.turnover * 100).toFixed(2)}%.`;
  }

  return `Post-trade simulation leaves residual out-of-band drift for: ${outOfBand
    .map((drift) => `${drift.instrumentId} (${(drift.absoluteDrift * 100).toFixed(2)}%)`)
    .join(', ')}. Estimated sell-side turnover is ${(simulation.turnover * 100).toFixed(2)}%.`;
}
