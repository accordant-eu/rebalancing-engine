import {
  CashFlow,
  CashFlowDirection,
  CashFlowStatus,
  Holding,
  PortfolioState,
  PriceSnapshot,
  ProposedTrade,
} from '../models/domain';
import { CALCULATION_EPSILON, toDecimal } from './numeric';

export interface HoldingValue {
  instrumentId: string;
  quantity: number;
  price: number;
  marketValue: number;
  taxLots?: Holding['taxLots'];
}

export interface ValuationResult {
  holdings: HoldingValue[];
  totalHoldingsValue: number;
  cash: number;
  totalPortfolioValue: number;
  cashFlowSummary?: CashFlowSummary;
}

export interface WeightResult {
  instrumentId: string;
  weight: number;
}

export interface CashFlowSummary {
  startingCash: number;
  settledDeposits: number;
  settledWithdrawals: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  netSettledCashFlow: number;
  netPendingCashFlow: number;
  availableCash: number;
  settledCashFlowCount: number;
  pendingCashFlowCount: number;
  hasPendingCashFlows: boolean;
  hasSettledWithdrawalDeficit: boolean;
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
    validateHoldingTaxLots(holding);

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
      taxLots: holding.taxLots,
    });
  }

  const cashFlowSummary = summarizeCashFlows(state.cash, state.cashFlows);
  const availableCash = cashFlowSummary?.availableCash ?? state.cash;
  const totalPortfolioValue = totalHoldingsValue.plus(availableCash);

  if (totalPortfolioValue.lt(0)) {
    throw new Error('Cash flows exceed total portfolio value');
  }

  return {
    holdings: holdingsValues,
    totalHoldingsValue: totalHoldingsValue.toNumber(),
    cash: availableCash,
    totalPortfolioValue: totalPortfolioValue.toNumber(),
    cashFlowSummary,
  };
}

function validateHoldingTaxLots(holding: Holding): void {
  if (holding.taxLots === undefined || holding.taxLots.length === 0) {
    return;
  }

  let lotQuantityTotal = toDecimal(0);
  const seenLotIds = new Set<string>();

  for (const lot of holding.taxLots) {
    if (lot.lotId.trim() === '') {
      throw new Error(`Tax lot ID is required for instrument: ${holding.instrumentId}`);
    }
    if (seenLotIds.has(lot.lotId)) {
      throw new Error(`Duplicate tax lot ID for instrument ${holding.instrumentId}: ${lot.lotId}`);
    }
    seenLotIds.add(lot.lotId);
    if (lot.quantity <= 0) {
      throw new Error(`Tax lot quantity must be positive: ${lot.lotId}`);
    }
    if (lot.unitCost !== undefined && lot.unitCost < 0) {
      throw new Error(`Tax lot unit cost cannot be negative: ${lot.lotId}`);
    }

    lotQuantityTotal = lotQuantityTotal.plus(lot.quantity);
  }

  if (lotQuantityTotal.minus(holding.quantity).abs().gt(CALCULATION_EPSILON)) {
    throw new Error(
      `Tax lot quantities do not sum to holding quantity for instrument: ${holding.instrumentId}`,
    );
  }
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

/**
 * Simulates the post-trade valuation given a set of trades and estimated friction cost.
 */
export function simulatePostTradeValuation(
  preTradeValuation: ValuationResult,
  trades: ProposedTrade[],
  totalEstimatedTco: number
): ValuationResult {
  let estimatedCash = toDecimal(preTradeValuation.cash).minus(totalEstimatedTco);

  const postHoldingsMap = new Map<string, HoldingValue>();
  for (const h of preTradeValuation.holdings) {
    postHoldingsMap.set(h.instrumentId, { ...h });
  }

  for (const trade of trades) {
    if (trade.direction === 'BUY') {
      estimatedCash = estimatedCash.minus(trade.estimatedValue);
      let holding = postHoldingsMap.get(trade.instrumentId);
      if (!holding) {
        holding = {
          instrumentId: trade.instrumentId,
          quantity: 0,
          price: trade.estimatedPrice,
          marketValue: 0
        };
        postHoldingsMap.set(trade.instrumentId, holding);
      }
      holding.quantity = toDecimal(holding.quantity).plus(trade.quantity).toNumber();
      holding.marketValue = toDecimal(holding.quantity).mul(holding.price).toNumber();
    } else {
      estimatedCash = estimatedCash.plus(trade.estimatedValue);
      const holding = postHoldingsMap.get(trade.instrumentId);
      if (holding) {
        holding.quantity = toDecimal(holding.quantity).minus(trade.quantity).toNumber();
        holding.marketValue = toDecimal(holding.quantity).mul(holding.price).toNumber();
        if (holding.quantity <= 0) {
          postHoldingsMap.delete(trade.instrumentId);
        }
      }
    }
  }

  const holdings = Array.from(postHoldingsMap.values());
  const totalHoldingsValue = holdings.reduce((acc, h) => acc.plus(h.marketValue), toDecimal(0));
  const totalPortfolioValue = totalHoldingsValue.plus(estimatedCash);

  return {
    holdings,
    totalHoldingsValue: totalHoldingsValue.toNumber(),
    cash: estimatedCash.toNumber(),
    totalPortfolioValue: totalPortfolioValue.toNumber(),
    cashFlowSummary: preTradeValuation.cashFlowSummary
  };
}

function summarizeCashFlows(
  startingCash: number,
  cashFlows: CashFlow[] | undefined,
): CashFlowSummary | undefined {
  if (cashFlows === undefined || cashFlows.length === 0) {
    return undefined;
  }

  let settledDeposits = toDecimal(0);
  let settledWithdrawals = toDecimal(0);
  let pendingDeposits = toDecimal(0);
  let pendingWithdrawals = toDecimal(0);
  let settledCashFlowCount = 0;
  let pendingCashFlowCount = 0;

  for (const cashFlow of cashFlows) {
    validateCashFlow(cashFlow);

    if (cashFlow.status === 'SETTLED') {
      settledCashFlowCount += 1;
      if (cashFlow.direction === 'DEPOSIT') {
        settledDeposits = settledDeposits.plus(cashFlow.amount);
      } else {
        settledWithdrawals = settledWithdrawals.plus(cashFlow.amount);
      }
      continue;
    }

    pendingCashFlowCount += 1;
    if (cashFlow.direction === 'DEPOSIT') {
      pendingDeposits = pendingDeposits.plus(cashFlow.amount);
    } else {
      pendingWithdrawals = pendingWithdrawals.plus(cashFlow.amount);
    }
  }

  const netSettledCashFlow = settledDeposits.minus(settledWithdrawals);
  const netPendingCashFlow = pendingDeposits.minus(pendingWithdrawals);
  const availableCash = toDecimal(startingCash).plus(netSettledCashFlow);

  return {
    startingCash,
    settledDeposits: settledDeposits.toNumber(),
    settledWithdrawals: settledWithdrawals.toNumber(),
    pendingDeposits: pendingDeposits.toNumber(),
    pendingWithdrawals: pendingWithdrawals.toNumber(),
    netSettledCashFlow: netSettledCashFlow.toNumber(),
    netPendingCashFlow: netPendingCashFlow.toNumber(),
    availableCash: availableCash.toNumber(),
    settledCashFlowCount,
    pendingCashFlowCount,
    hasPendingCashFlows: pendingCashFlowCount > 0,
    hasSettledWithdrawalDeficit: availableCash.lt(0) && settledWithdrawals.gt(0),
  };
}

function validateCashFlow(cashFlow: CashFlow): void {
  if (cashFlow.cashFlowId.trim() === '') {
    throw new Error('Cash flow ID is required');
  }
  if (!isCashFlowDirection(cashFlow.direction)) {
    throw new Error(`Unsupported cash flow direction: ${cashFlow.direction}`);
  }
  if (!isCashFlowStatus(cashFlow.status)) {
    throw new Error(`Unsupported cash flow status: ${cashFlow.status}`);
  }
  if (cashFlow.amount <= 0) {
    throw new Error(`Cash flow amount must be positive: ${cashFlow.cashFlowId}`);
  }
}

function isCashFlowDirection(value: string): value is CashFlowDirection {
  return value === 'DEPOSIT' || value === 'WITHDRAWAL';
}

function isCashFlowStatus(value: string): value is CashFlowStatus {
  return value === 'SETTLED' || value === 'PENDING';
}
