import {
  DriftMeasurement,
  Holding,
  PortfolioState,
  PriceSnapshot,
  RebalancingPolicy,
  TargetAllocation,
  TradeProposal,
} from '../models/domain';
import { calculateDrift } from './drift';
import { CALCULATION_EPSILON, decimalDifference, isWithinEpsilon, toDecimal } from './numeric';
import {
  calculateCurrentWeights,
  calculateValuation,
  ValuationResult,
  WeightResult,
} from './valuation';

const SIMULATION_EPSILON = CALCULATION_EPSILON;

export interface PostTradeSimulation {
  postTradeState: PortfolioState;
  postTradeValuation: ValuationResult;
  postTradeWeights: WeightResult[];
  residualDrift: DriftMeasurement[];
  turnover: number;
}

export function simulatePostTrade(
  state: PortfolioState,
  priceSnapshot: PriceSnapshot,
  target: TargetAllocation,
  policy: RebalancingPolicy,
  proposal: TradeProposal,
): PostTradeSimulation {
  const startingValuation = calculateValuation(state, priceSnapshot);
  const quantities = new Map(
    state.holdings.map((holding) => [holding.instrumentId, holding.quantity]),
  );
  let postTradeCash = toDecimal(startingValuation.cash);
  let sellValue = toDecimal(0);

  const lotsByInstrument = new Map<string, NonNullable<Holding['taxLots']>>();
  for (const holding of state.holdings) {
    if (holding.taxLots !== undefined) {
      lotsByInstrument.set(
        holding.instrumentId,
        holding.taxLots.map((lot) => ({ ...lot })),
      );
    }
  }
  let buyLotCounter = 1;

  for (const trade of proposal.trades) {
    const snapshotPrice = priceSnapshot.prices[trade.instrumentId];
    if (snapshotPrice === undefined || snapshotPrice === null) {
      throw new Error(`Missing price for simulation instrument: ${trade.instrumentId}`);
    }
    if (Math.abs(decimalDifference(snapshotPrice, trade.estimatedPrice)) > SIMULATION_EPSILON) {
      throw new Error(
        `Trade price does not match price snapshot for instrument: ${trade.instrumentId}`,
      );
    }

    const expectedValue = toDecimal(trade.quantity).mul(snapshotPrice);
    const diff = expectedValue.minus(trade.estimatedValue).abs();
    // Allow up to 0.01 absolute OR 0.01% relative error for float serialization rounding.
    if (diff.gt(0.01) && diff.div(expectedValue.abs().plus(1)).gt(0.0001)) {
      throw new Error(
        `Trade quantity and value do not reconcile for instrument: ${trade.instrumentId}`,
      );
    }

    const currentQuantity = quantities.get(trade.instrumentId) ?? 0;
    if (trade.direction === 'BUY') {
      quantities.set(
        trade.instrumentId,
        toDecimal(currentQuantity).plus(trade.quantity).toNumber(),
      );
      postTradeCash = postTradeCash.minus(trade.estimatedValue);

      const trackedLots = lotsByInstrument.get(trade.instrumentId);
      if (trackedLots !== undefined) {
        trackedLots.push({
          lotId: `sim-buy-${trade.instrumentId}-${buyLotCounter++}`,
          quantity: trade.quantity,
          unitCost: trade.estimatedPrice,
          acquisitionDate: policy.evaluationDate ?? priceSnapshot.asOf?.slice(0, 10) ?? '1970-01-01',
        });
      }
    } else {
      if (toDecimal(trade.quantity).minus(currentQuantity).gt(SIMULATION_EPSILON)) {
        throw new Error(
          `Cannot sell more than current holding for instrument: ${trade.instrumentId}`,
        );
      }
      quantities.set(
        trade.instrumentId,
        toDecimal(currentQuantity).minus(trade.quantity).toNumber(),
      );
      postTradeCash = postTradeCash.plus(trade.estimatedValue);
      sellValue = sellValue.plus(trade.estimatedValue);

      const trackedLots = lotsByInstrument.get(trade.instrumentId);
      if (trackedLots !== undefined) {
        if (
          trade.lotAllocations &&
          trade.lotAllocations.length > 0 &&
          trade.lotAllocations[0].lotId !== 'SECTION_104_POOL'
        ) {
          for (const alloc of trade.lotAllocations) {
            const targetLot = trackedLots.find((l) => l.lotId === alloc.lotId);
            if (targetLot) {
              targetLot.quantity = toDecimal(targetLot.quantity).minus(alloc.quantity).toNumber();
            }
          }
        } else {
          let remainingToDeduct = toDecimal(trade.quantity);
          for (const lot of trackedLots) {
            if (remainingToDeduct.lte(SIMULATION_EPSILON)) break;
            const deduct = remainingToDeduct.lte(lot.quantity)
              ? remainingToDeduct
              : toDecimal(lot.quantity);
            lot.quantity = toDecimal(lot.quantity).minus(deduct).toNumber();
            remainingToDeduct = remainingToDeduct.minus(deduct);
          }
        }
        lotsByInstrument.set(
          trade.instrumentId,
          trackedLots.filter((l) => l.quantity > SIMULATION_EPSILON),
        );
      }
    }
  }

  const cashDiff = postTradeCash.minus(proposal.estimatedPostTradeCash).abs();
  if (cashDiff.gt(SIMULATION_EPSILON)) {
    throw new Error('Simulated cash does not reconcile with proposal estimated post-trade cash');
  }
  if (postTradeCash.lt(-SIMULATION_EPSILON)) {
    throw new Error('Post-trade simulation produced negative cash');
  }
  if (isWithinEpsilon(postTradeCash.toNumber(), SIMULATION_EPSILON)) {
    postTradeCash = toDecimal(0);
  }

  const postTradeHoldings: Holding[] = Array.from(quantities.entries())
    .filter(([, quantity]) => !isWithinEpsilon(quantity, SIMULATION_EPSILON))
    .map(([instrumentId, quantity]) => {
      const trackedLots = lotsByInstrument.get(instrumentId);
      if (trackedLots !== undefined && trackedLots.length > 0) {
        const sumLots = trackedLots.reduce((acc, l) => acc.plus(l.quantity), toDecimal(0));
        const residual = toDecimal(quantity).minus(sumLots);
        if (!residual.isZero()) {
          const lastIdx = trackedLots.length - 1;
          trackedLots[lastIdx] = {
            ...trackedLots[lastIdx],
            quantity: toDecimal(trackedLots[lastIdx].quantity).plus(residual).toNumber(),
          };
        }
        return { instrumentId, quantity, taxLots: trackedLots };
      }
      return { instrumentId, quantity };
    })
    .sort((a, b) => a.instrumentId.localeCompare(b.instrumentId));

  const postTradeState: PortfolioState = {
    ...state,
    accountId: state.accountId,
    cash: postTradeCash.abs().lte(SIMULATION_EPSILON) ? 0 : postTradeCash.toNumber(),
    holdings: postTradeHoldings,
  };
  delete postTradeState.cashFlows;
  delete postTradeState.cashFlowSchedules;

  const postTradeValuation = calculateValuation(postTradeState, priceSnapshot);
  const postTradeWeights = calculateCurrentWeights(postTradeValuation);
  const residualDrift = calculateDrift(postTradeWeights, target, policy);

  return {
    postTradeState,
    postTradeValuation,
    postTradeWeights,
    residualDrift,
    turnover:
      startingValuation.totalPortfolioValue === 0
        ? 0
        : sellValue.div(startingValuation.totalPortfolioValue).toNumber(),
  };
}
