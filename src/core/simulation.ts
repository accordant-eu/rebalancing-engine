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
  let postTradeCash = toDecimal(state.cash);
  let sellValue = toDecimal(0);

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
    if (expectedValue.minus(trade.estimatedValue).abs().gt(SIMULATION_EPSILON)) {
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
    }
  }

  if (postTradeCash.minus(proposal.estimatedPostTradeCash).abs().gt(SIMULATION_EPSILON)) {
    throw new Error('Simulated cash does not reconcile with proposal estimated post-trade cash');
  }
  if (postTradeCash.lt(-SIMULATION_EPSILON)) {
    throw new Error('Post-trade simulation produced negative cash');
  }

  const postTradeHoldings: Holding[] = Array.from(quantities.entries())
    .filter(([, quantity]) => !isWithinEpsilon(quantity, SIMULATION_EPSILON))
    .map(([instrumentId, quantity]) => ({ instrumentId, quantity }))
    .sort((a, b) => a.instrumentId.localeCompare(b.instrumentId));

  const postTradeState: PortfolioState = {
    accountId: state.accountId,
    cash: postTradeCash.abs().lte(SIMULATION_EPSILON) ? 0 : postTradeCash.toNumber(),
    holdings: postTradeHoldings,
  };
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
