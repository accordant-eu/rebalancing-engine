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
import {
  calculateCurrentWeights,
  calculateValuation,
  ValuationResult,
  WeightResult,
} from './valuation';

const SIMULATION_EPSILON = 1e-8;

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
  let postTradeCash = state.cash;
  let sellValue = 0;

  for (const trade of proposal.trades) {
    const snapshotPrice = priceSnapshot.prices[trade.instrumentId];
    if (snapshotPrice === undefined || snapshotPrice === null) {
      throw new Error(`Missing price for simulation instrument: ${trade.instrumentId}`);
    }
    if (Math.abs(snapshotPrice - trade.estimatedPrice) > SIMULATION_EPSILON) {
      throw new Error(
        `Trade price does not match price snapshot for instrument: ${trade.instrumentId}`,
      );
    }

    const expectedValue = trade.quantity * snapshotPrice;
    if (Math.abs(expectedValue - trade.estimatedValue) > SIMULATION_EPSILON) {
      throw new Error(
        `Trade quantity and value do not reconcile for instrument: ${trade.instrumentId}`,
      );
    }

    const currentQuantity = quantities.get(trade.instrumentId) ?? 0;
    if (trade.direction === 'BUY') {
      quantities.set(trade.instrumentId, currentQuantity + trade.quantity);
      postTradeCash -= trade.estimatedValue;
    } else {
      if (trade.quantity - currentQuantity > SIMULATION_EPSILON) {
        throw new Error(
          `Cannot sell more than current holding for instrument: ${trade.instrumentId}`,
        );
      }
      quantities.set(trade.instrumentId, currentQuantity - trade.quantity);
      postTradeCash += trade.estimatedValue;
      sellValue += trade.estimatedValue;
    }
  }

  if (Math.abs(postTradeCash - proposal.estimatedPostTradeCash) > SIMULATION_EPSILON) {
    throw new Error('Simulated cash does not reconcile with proposal estimated post-trade cash');
  }
  if (postTradeCash < -SIMULATION_EPSILON) {
    throw new Error('Post-trade simulation produced negative cash');
  }

  const postTradeHoldings: Holding[] = Array.from(quantities.entries())
    .filter(([, quantity]) => Math.abs(quantity) > SIMULATION_EPSILON)
    .map(([instrumentId, quantity]) => ({ instrumentId, quantity }))
    .sort((a, b) => a.instrumentId.localeCompare(b.instrumentId));

  const postTradeState: PortfolioState = {
    accountId: state.accountId,
    cash: Math.abs(postTradeCash) <= SIMULATION_EPSILON ? 0 : postTradeCash,
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
        : sellValue / startingValuation.totalPortfolioValue,
  };
}
