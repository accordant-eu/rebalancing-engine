import {
  ExecutionTargetMode,
  PriceSnapshot,
  ProposedTrade,
  ProposalWarning,
  RebalancingPolicy,
  TargetAllocation,
  TradeProposal,
} from '../models/domain';
import { validateTargetAllocation } from './drift';
import { ValuationResult } from './valuation';

const TRADE_EPSILON = 1e-8;

/**
 * Generates a deterministic trade proposal.
 *
 * The default execution mode restores the portfolio to target weights.
 * Boundary mode trades breached positions back to the configured absolute
 * tolerance boundary. Minimum trade constraints are applied before returning.
 */
export function generateTradeProposal(
  valuation: ValuationResult,
  target: TargetAllocation,
  priceSnapshot: PriceSnapshot,
  policy?: RebalancingPolicy,
): TradeProposal {
  validateTargetAllocation(target);
  if (valuation.cash < 0) {
    throw new Error('Cannot generate trade proposal for negative cash balance');
  }

  const executionTargetMode = policy?.executionTargetMode ?? 'full_reset';
  const targetWeights = new Map(target.targets.map((t) => [t.instrumentId, t.weight]));
  const currentValues = new Map(valuation.holdings.map((h) => [h.instrumentId, h.marketValue]));

  const instrumentIds = Array.from(
    new Set([...targetWeights.keys(), ...currentValues.keys()]),
  ).sort((a, b) => a.localeCompare(b));

  const trades: ProposedTrade[] = [];
  let netCashDelta = 0;

  for (const instrumentId of instrumentIds) {
    const currentValue = currentValues.get(instrumentId) ?? 0;
    const targetValue = calculateTargetValue(
      currentValue,
      targetWeights.get(instrumentId) ?? 0,
      valuation.totalPortfolioValue,
      policy,
      executionTargetMode,
    );
    const valueDelta = targetValue - currentValue;

    if (Math.abs(valueDelta) <= TRADE_EPSILON) {
      continue;
    }

    const estimatedPrice = priceSnapshot.prices[instrumentId];
    if (estimatedPrice === undefined || estimatedPrice === null) {
      throw new Error(`Missing price for trade proposal instrument: ${instrumentId}`);
    }
    if (estimatedPrice <= 0) {
      throw new Error(`Invalid non-positive price for trade proposal instrument: ${instrumentId}`);
    }

    const direction = valueDelta > 0 ? 'BUY' : 'SELL';
    const estimatedValue = Math.abs(valueDelta);

    trades.push({
      instrumentId,
      direction,
      quantity: estimatedValue / estimatedPrice,
      estimatedPrice,
      estimatedValue,
    });

    netCashDelta += direction === 'BUY' ? -estimatedValue : estimatedValue;
  }

  const proposal = applyMinimumTradeSize(
    {
      trades,
      estimatedPostTradeCash: valuation.cash + netCashDelta,
      warnings: [],
      executionTargetMode,
    },
    valuation.cash,
    policy?.minimumTradeSize ?? 0,
  );

  return proposal;
}

export function applyMinimumTradeSize(
  proposal: TradeProposal,
  startingCash: number,
  minimumTradeSize: number,
): TradeProposal {
  if (minimumTradeSize <= 0) {
    return {
      ...proposal,
      warnings: [...proposal.warnings],
    };
  }

  const warnings: ProposalWarning[] = [...proposal.warnings];
  const trades = proposal.trades.filter((trade) => {
    if (trade.estimatedValue >= minimumTradeSize) {
      return true;
    }

    warnings.push({
      code: 'MINIMUM_TRADE_SIZE',
      instrumentId: trade.instrumentId,
      estimatedValue: trade.estimatedValue,
      minimumTradeSize,
      message: `Suppressed ${trade.direction} for ${trade.instrumentId}: estimated value ${trade.estimatedValue.toFixed(2)} is below minimum trade size ${minimumTradeSize.toFixed(2)}.`,
    });

    return false;
  });

  const estimatedPostTradeCash = trades.reduce((cash, trade) => {
    return trade.direction === 'BUY' ? cash - trade.estimatedValue : cash + trade.estimatedValue;
  }, startingCash);

  return {
    trades,
    estimatedPostTradeCash,
    warnings,
    executionTargetMode: proposal.executionTargetMode,
  };
}

function calculateTargetValue(
  currentValue: number,
  targetWeight: number,
  totalPortfolioValue: number,
  policy: RebalancingPolicy | undefined,
  executionTargetMode: ExecutionTargetMode,
): number {
  if (executionTargetMode === 'full_reset') {
    return targetWeight * totalPortfolioValue;
  }

  if (policy === undefined) {
    throw new Error('Boundary execution target mode requires a rebalancing policy');
  }

  const currentWeight = totalPortfolioValue === 0 ? 0 : currentValue / totalPortfolioValue;
  const lowerBoundary = Math.max(0, targetWeight - policy.absoluteDriftTolerance);
  const upperBoundary = Math.min(1, targetWeight + policy.absoluteDriftTolerance);

  if (currentWeight > upperBoundary) {
    return upperBoundary * totalPortfolioValue;
  }
  if (currentWeight < lowerBoundary) {
    return lowerBoundary * totalPortfolioValue;
  }

  return currentValue;
}
