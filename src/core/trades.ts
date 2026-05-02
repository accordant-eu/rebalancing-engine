import { PriceSnapshot, ProposedTrade, TargetAllocation, TradeProposal } from '../models/domain';
import { validateTargetAllocation } from './drift';
import { ValuationResult } from './valuation';

const TRADE_EPSILON = 1e-8;

/**
 * Generates a deterministic, full-reset trade proposal.
 *
 * Slice 5 intentionally ignores minimum trade constraints and cash-routing
 * preferences; those are applied in Slice 6. This function only answers:
 * "what trades would restore the portfolio to target weights?"
 */
export function generateTradeProposal(
  valuation: ValuationResult,
  target: TargetAllocation,
  priceSnapshot: PriceSnapshot,
): TradeProposal {
  validateTargetAllocation(target);

  const targetWeights = new Map(target.targets.map((t) => [t.instrumentId, t.weight]));
  const currentValues = new Map(valuation.holdings.map((h) => [h.instrumentId, h.marketValue]));

  const instrumentIds = Array.from(
    new Set([...targetWeights.keys(), ...currentValues.keys()]),
  ).sort((a, b) => a.localeCompare(b));

  const trades: ProposedTrade[] = [];
  let netCashDelta = 0;

  for (const instrumentId of instrumentIds) {
    const currentValue = currentValues.get(instrumentId) ?? 0;
    const targetValue = (targetWeights.get(instrumentId) ?? 0) * valuation.totalPortfolioValue;
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

  return {
    trades,
    estimatedPostTradeCash: valuation.cash + netCashDelta,
  };
}
