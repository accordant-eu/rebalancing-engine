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
import { CALCULATION_EPSILON, formatFixed, toDecimal } from './numeric';
import { ValuationResult } from './valuation';

const TRADE_EPSILON = CALCULATION_EPSILON;

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
  let netCashDelta = toDecimal(0);

  for (const instrumentId of instrumentIds) {
    const currentValue = currentValues.get(instrumentId) ?? 0;
    const targetValue = calculateTargetValue(
      currentValue,
      targetWeights.get(instrumentId) ?? 0,
      valuation.totalPortfolioValue,
      policy,
      executionTargetMode,
    );
    const valueDelta = targetValue.minus(currentValue);

    if (valueDelta.abs().lte(TRADE_EPSILON)) {
      continue;
    }

    const estimatedPrice = priceSnapshot.prices[instrumentId];
    if (estimatedPrice === undefined || estimatedPrice === null) {
      throw new Error(`Missing price for trade proposal instrument: ${instrumentId}`);
    }
    if (estimatedPrice <= 0) {
      throw new Error(`Invalid non-positive price for trade proposal instrument: ${instrumentId}`);
    }

    const direction = valueDelta.gt(0) ? 'BUY' : 'SELL';
    const estimatedValue = valueDelta.abs();

    trades.push({
      instrumentId,
      direction,
      quantity: estimatedValue.div(estimatedPrice).toNumber(),
      estimatedPrice,
      estimatedValue: estimatedValue.toNumber(),
    });

    netCashDelta =
      direction === 'BUY' ? netCashDelta.minus(estimatedValue) : netCashDelta.plus(estimatedValue);
  }

  const proposal = applyMinimumTradeSize(
    {
      trades,
      estimatedPostTradeCash: toDecimal(valuation.cash).plus(netCashDelta).toNumber(),
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
      message: `Suppressed ${trade.direction} for ${trade.instrumentId}: estimated value ${formatFixed(trade.estimatedValue, 2)} is below minimum trade size ${formatFixed(minimumTradeSize, 2)}.`,
    });

    return false;
  });

  const estimatedPostTradeCash = trades
    .reduce((cash, trade) => {
      return trade.direction === 'BUY'
        ? cash.minus(trade.estimatedValue)
        : cash.plus(trade.estimatedValue);
    }, toDecimal(startingCash))
    .toNumber();

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
): ReturnType<typeof toDecimal> {
  if (executionTargetMode === 'full_reset') {
    return toDecimal(targetWeight).mul(totalPortfolioValue);
  }

  if (policy === undefined) {
    throw new Error('Boundary execution target mode requires a rebalancing policy');
  }

  const currentWeight =
    totalPortfolioValue === 0 ? toDecimal(0) : toDecimal(currentValue).div(totalPortfolioValue);
  const lowerBoundary = decimalMax(0, toDecimal(targetWeight).minus(policy.absoluteDriftTolerance));
  const upperBoundary = decimalMin(1, toDecimal(targetWeight).plus(policy.absoluteDriftTolerance));

  if (currentWeight.gt(upperBoundary)) {
    return upperBoundary.mul(totalPortfolioValue);
  }
  if (currentWeight.lt(lowerBoundary)) {
    return lowerBoundary.mul(totalPortfolioValue);
  }

  return toDecimal(currentValue);
}

function decimalMax(
  left: number,
  right: ReturnType<typeof toDecimal>,
): ReturnType<typeof toDecimal> {
  return right.lt(left) ? toDecimal(left) : right;
}

function decimalMin(
  left: number,
  right: ReturnType<typeof toDecimal>,
): ReturnType<typeof toDecimal> {
  return right.gt(left) ? toDecimal(left) : right;
}
