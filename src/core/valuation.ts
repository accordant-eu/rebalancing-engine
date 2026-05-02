import { PortfolioState, PriceSnapshot } from '../models/domain';
import { toDecimal } from './numeric';

export interface HoldingValue {
  instrumentId: string;
  quantity: number;
  price: number;
  marketValue: number;
}

export interface ValuationResult {
  holdings: HoldingValue[];
  totalHoldingsValue: number;
  cash: number;
  totalPortfolioValue: number;
}

export interface WeightResult {
  instrumentId: string;
  weight: number;
}

/**
 * Calculates the market value of all holdings and the total portfolio value.
 * Throws an error if a required price is missing.
 */
export function calculateValuation(
  state: PortfolioState,
  priceSnapshot: PriceSnapshot,
): ValuationResult {
  let totalHoldingsValue = toDecimal(0);
  const holdingsValues: HoldingValue[] = [];

  for (const holding of state.holdings) {
    const price = priceSnapshot.prices[holding.instrumentId];
    if (price === undefined || price === null) {
      throw new Error(`Missing price for instrument: ${holding.instrumentId}`);
    }

    const marketValueDecimal = toDecimal(holding.quantity).mul(price);
    const marketValue = marketValueDecimal.toNumber();
    totalHoldingsValue = totalHoldingsValue.plus(marketValueDecimal);

    holdingsValues.push({
      instrumentId: holding.instrumentId,
      quantity: holding.quantity,
      price,
      marketValue,
    });
  }

  return {
    holdings: holdingsValues,
    totalHoldingsValue: totalHoldingsValue.toNumber(),
    cash: state.cash,
    totalPortfolioValue: totalHoldingsValue.plus(state.cash).toNumber(),
  };
}

/**
 * Calculates the current weight of each holding relative to the total portfolio value.
 * Includes cash as an implicit zero-weight asset unless explicitly modeled (for now, we just model instrument weights).
 */
export function calculateCurrentWeights(valuation: ValuationResult): WeightResult[] {
  if (valuation.totalPortfolioValue === 0) {
    return valuation.holdings.map((h) => ({
      instrumentId: h.instrumentId,
      weight: 0,
    }));
  }

  return valuation.holdings.map((h) => ({
    instrumentId: h.instrumentId,
    weight: toDecimal(h.marketValue).div(valuation.totalPortfolioValue).toNumber(),
  }));
}
