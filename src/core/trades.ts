import {
  BoundaryBandMode,
  ExecutionTargetMode,
  PriceSnapshot,
  ProposedTrade,
  ProposalWarning,
  RebalancingPolicy,
  SellSelectionMode,
  TargetAllocation,
  TaxLot,
  TradeProposal,
} from '../models/domain';
import { validateTargetAllocation } from './drift';
import { CALCULATION_EPSILON, formatFixed, toDecimal } from './numeric';
import { CashFlowScheduleSummary } from './cash-flows';
import { CashFlowSummary, ValuationResult } from './valuation';
import { buildCashFlowProposalWarnings, buildCashFlowScheduleProposalWarnings } from '../explanation/warnings';

const TRADE_EPSILON = CALCULATION_EPSILON;

/**
 * Generates a deterministic trade proposal.
 *
 * The default execution mode restores the portfolio to target weights.
 * Boundary mode trades breached positions back to the configured absolute or
 * relative tolerance boundary. Minimum trade constraints are applied before returning.
 */
export function generateTradeProposal(
  valuation: ValuationResult,
  target: TargetAllocation,
  priceSnapshot: PriceSnapshot,
  policy?: RebalancingPolicy,
  cashFlowScheduleSummary?: CashFlowScheduleSummary,
): TradeProposal {
  validateTargetAllocation(target);
  if (valuation.cash < 0 && !valuation.cashFlowSummary?.hasSettledWithdrawalDeficit) {
    throw new Error('Cannot generate trade proposal for negative cash balance');
  }

  const executionTargetMode = policy?.executionTargetMode ?? 'full_reset';
  const boundaryBandMode = resolveBoundaryBandMode(executionTargetMode, policy);
  const initialWarnings = [
    ...buildCashFlowProposalWarnings(valuation.cashFlowSummary),
    ...buildCashFlowScheduleProposalWarnings(cashFlowScheduleSummary),
  ];
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
      boundaryBandMode,
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

    const trade: ProposedTrade = {
      instrumentId,
      direction,
      quantity: estimatedValue.div(estimatedPrice).toNumber(),
      estimatedPrice,
      estimatedValue: estimatedValue.toNumber(),
    };
    if (direction === 'SELL') {
      const holding = valuation.holdings.find((h) => h.instrumentId === instrumentId);
      if (holding?.taxLots !== undefined && holding.taxLots.length > 0) {
        trade.lotAllocations = allocateSellLots(
          holding.taxLots,
          trade.quantity,
          trade.estimatedPrice,
          policy?.sellSelectionMode ?? 'FIFO',
        );
      }
    }

    trades.push(trade);

    netCashDelta =
      direction === 'BUY' ? netCashDelta.minus(estimatedValue) : netCashDelta.plus(estimatedValue);
  }

  const proposal = applyMinimumTradeSize(
    {
      trades,
      estimatedPostTradeCash: toDecimal(valuation.cash).plus(netCashDelta).toNumber(),
      warnings: initialWarnings,
      executionTargetMode,
      boundaryBandMode,
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
    boundaryBandMode: proposal.boundaryBandMode,
  };
}

function resolveBoundaryBandMode(
  executionTargetMode: ExecutionTargetMode,
  policy: RebalancingPolicy | undefined,
): BoundaryBandMode | undefined {
  if (executionTargetMode !== 'boundary') {
    return undefined;
  }

  return policy?.boundaryBandMode ?? 'absolute';
}

function calculateTargetValue(
  currentValue: number,
  targetWeight: number,
  totalPortfolioValue: number,
  policy: RebalancingPolicy | undefined,
  executionTargetMode: ExecutionTargetMode,
  boundaryBandMode: BoundaryBandMode | undefined,
): ReturnType<typeof toDecimal> {
  if (executionTargetMode === 'full_reset') {
    return toDecimal(targetWeight).mul(totalPortfolioValue);
  }

  if (policy === undefined) {
    throw new Error('Boundary execution target mode requires a rebalancing policy');
  }

  const currentWeight =
    totalPortfolioValue === 0 ? toDecimal(0) : toDecimal(currentValue).div(totalPortfolioValue);
  const { lowerBoundary, upperBoundary } = calculateBoundaryWeights(
    currentWeight.toNumber(),
    targetWeight,
    policy,
    boundaryBandMode ?? 'absolute',
  );

  if (currentWeight.gt(upperBoundary)) {
    return upperBoundary.mul(totalPortfolioValue);
  }
  if (currentWeight.lt(lowerBoundary)) {
    return lowerBoundary.mul(totalPortfolioValue);
  }

  return toDecimal(currentValue);
}

function calculateBoundaryWeights(
  currentWeight: number,
  targetWeight: number,
  policy: RebalancingPolicy,
  boundaryBandMode: BoundaryBandMode,
): {
  lowerBoundary: ReturnType<typeof toDecimal>;
  upperBoundary: ReturnType<typeof toDecimal>;
} {
  if (boundaryBandMode === 'absolute') {
    return {
      lowerBoundary: decimalMax(0, toDecimal(targetWeight).minus(policy.absoluteDriftTolerance)),
      upperBoundary: decimalMin(1, toDecimal(targetWeight).plus(policy.absoluteDriftTolerance)),
    };
  }

  if (policy.relativeDriftTolerance === undefined) {
    throw new Error('Relative boundary mode requires relativeDriftTolerance');
  }
  if (policy.relativeDriftTolerance < 0) {
    throw new Error('Relative boundary mode requires non-negative relativeDriftTolerance');
  }
  if (targetWeight <= 0) {
    if (toDecimal(currentWeight).abs().lte(TRADE_EPSILON)) {
      return {
        lowerBoundary: toDecimal(0),
        upperBoundary: toDecimal(0),
      };
    }
    throw new Error('Relative boundary mode cannot target instruments with zero target weight');
  }

  const relativeWidth = toDecimal(targetWeight).mul(policy.relativeDriftTolerance);

  return {
    lowerBoundary: decimalMax(0, toDecimal(targetWeight).minus(relativeWidth)),
    upperBoundary: decimalMin(1, toDecimal(targetWeight).plus(relativeWidth)),
  };
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

function allocateSellLots(
  lots: TaxLot[],
  sellQuantity: number,
  estimatedPrice: number,
  sellSelectionMode: SellSelectionMode,
): ProposedTrade['lotAllocations'] {
  const orderedLots = orderLots(lots, sellSelectionMode);
  let remainingQuantity = toDecimal(sellQuantity);
  const allocations: NonNullable<ProposedTrade['lotAllocations']> = [];

  for (const lot of orderedLots) {
    if (remainingQuantity.lte(TRADE_EPSILON)) {
      break;
    }

    const allocatedQuantity = decimalMinValue(remainingQuantity, toDecimal(lot.quantity));
    allocations.push({
      lotId: lot.lotId,
      quantity: allocatedQuantity.toNumber(),
      estimatedValue: allocatedQuantity.mul(estimatedPrice).toNumber(),
      unitCost: lot.unitCost,
      acquisitionDate: lot.acquisitionDate,
    });
    remainingQuantity = remainingQuantity.minus(allocatedQuantity);
  }

  if (remainingQuantity.gt(TRADE_EPSILON)) {
    throw new Error('Tax lot quantities are insufficient for proposed sell trade');
  }

  return allocations;
}

function orderLots(lots: TaxLot[], sellSelectionMode: SellSelectionMode): TaxLot[] {
  const lotsWithIndex = lots.map((lot, index) => ({ lot, index }));

  switch (sellSelectionMode) {
    case 'FIFO':
      return lotsWithIndex
        .sort((a, b) => compareLotDates(a.lot, b.lot) || a.index - b.index)
        .map(({ lot }) => lot);
    case 'LIFO':
      return lotsWithIndex
        .sort((a, b) => compareLotDates(b.lot, a.lot) || b.index - a.index)
        .map(({ lot }) => lot);
    case 'HIGHEST_COST':
      validateLotCosts(lots, sellSelectionMode);
      return lotsWithIndex
        .sort((a, b) => (b.lot.unitCost ?? 0) - (a.lot.unitCost ?? 0) || a.index - b.index)
        .map(({ lot }) => lot);
    case 'LOWEST_COST':
      validateLotCosts(lots, sellSelectionMode);
      return lotsWithIndex
        .sort((a, b) => (a.lot.unitCost ?? 0) - (b.lot.unitCost ?? 0) || a.index - b.index)
        .map(({ lot }) => lot);
  }
}

function compareLotDates(left: TaxLot, right: TaxLot): number {
  const leftDate = left.acquisitionDate ?? '';
  const rightDate = right.acquisitionDate ?? '';
  return leftDate.localeCompare(rightDate);
}

function validateLotCosts(lots: TaxLot[], sellSelectionMode: SellSelectionMode): void {
  const missingCost = lots.find((lot) => lot.unitCost === undefined);
  if (missingCost !== undefined) {
    throw new Error(
      `Sell selection mode ${sellSelectionMode} requires unitCost for tax lot: ${missingCost.lotId}`,
    );
  }
}

function decimalMinValue(
  left: ReturnType<typeof toDecimal>,
  right: ReturnType<typeof toDecimal>,
): ReturnType<typeof toDecimal> {
  return left.lte(right) ? left : right;
}
