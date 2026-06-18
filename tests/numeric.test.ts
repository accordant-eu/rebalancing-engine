import { serializeAuditRecord } from '../src/audit';
import { calculateDrift } from '../src/core/drift';
import { simulatePostTrade } from '../src/core/simulation';
import { generateTradeProposal } from '../src/core/trades';
import { calculateCurrentWeights, calculateValuation } from '../src/core/valuation';
import {
  PortfolioState,
  PriceSnapshot,
  RebalancingPolicy,
  TargetAllocation,
} from '../src/models/domain';
import { ThresholdStrategy } from '../src/strategy';
import { generateExplanation } from '../src/explanation';
import { generateAuditRecord } from '../src/audit';

describe('Numeric precision and rounding policy', () => {
  const policy: RebalancingPolicy = {
    absoluteDriftTolerance: 0.01,
    minimumTradeSize: 0,
  };

  it('uses decimal arithmetic for valuation totals and weights', () => {
    const state: PortfolioState = {
      accountId: 'precision-1',
      cash: 0.3,
      holdings: [{ instrumentId: 'US0378331005:XNAS:USD', quantity: 0.1 }],
    };
    const prices: PriceSnapshot = { prices: { 'US0378331005:XNAS:USD': 0.2 } };

    const valuation = calculateValuation(state, prices);
    const weights = calculateCurrentWeights(valuation);

    expect(valuation.holdings[0].marketValue).toBe(0.02);
    expect(valuation.totalPortfolioValue).toBe(0.32);
    expect(weights[0].weight).toBe(0.0625);
  });

  it('calculates precision-sensitive trade values without binary float artifacts', () => {
    const state: PortfolioState = {
      accountId: 'precision-2',
      cash: 0,
      holdings: [
        { instrumentId: 'US0378331005:XNAS:USD', quantity: 1 },
        { instrumentId: 'US5949181045:XNAS:USD', quantity: 2 },
      ],
    };
    const prices: PriceSnapshot = { prices: { 'US0378331005:XNAS:USD': 0.1, 'US5949181045:XNAS:USD': 0.1 } };
    const target: TargetAllocation = {
      targets: [
        { instrumentId: 'US0378331005:XNAS:USD', weight: 0.5 },
        { instrumentId: 'US5949181045:XNAS:USD', weight: 0.5 },
      ],
    };
    const valuation = calculateValuation(state, prices);

    const proposal = generateTradeProposal(valuation, target, prices, policy);

    expect(valuation.totalPortfolioValue).toBe(0.3);
    expect(proposal.trades).toHaveLength(2);
    expect(proposal.trades[0].estimatedValue).toBe(0.05);
    expect(proposal.trades[1].estimatedValue).toBe(0.05);
    expect(proposal.estimatedPostTradeCash).toBe(0);
  });

  it('serializes rounded audit outputs deterministically without mutating input snapshots', () => {
    const state: PortfolioState = {
      accountId: 'precision-audit',
      cash: 0,
      holdings: [
        { instrumentId: 'US0378331005:XNAS:USD', quantity: 1 },
        { instrumentId: 'US5949181045:XNAS:USD', quantity: 2 },
      ],
    };
    const prices: PriceSnapshot = { prices: { 'US0378331005:XNAS:USD': 0.1, 'US5949181045:XNAS:USD': 0.1 } };
    const target: TargetAllocation = {
      targets: [
        { instrumentId: 'US0378331005:XNAS:USD', weight: 0.5 },
        { instrumentId: 'US5949181045:XNAS:USD', weight: 0.5 },
      ],
    };
    const valuation = calculateValuation(state, prices);
    const weights = calculateCurrentWeights(valuation);
    const drift = calculateDrift(weights, target, policy);
    const trigger = new ThresholdStrategy().evaluateTrigger(state, drift, policy);
    const proposal = generateTradeProposal(valuation, target, prices, policy);
    const simulation = simulatePostTrade(state, prices, target, policy, proposal);
    const explanation = generateExplanation(trigger, proposal, simulation);
    const record = generateAuditRecord({
      eventId: 'audit-precision',
      createdAt: '2026-05-02T00:00:00.000Z',
      portfolioState: state,
      targetAllocation: target,
      priceSnapshot: prices,
      policy,
      driftMeasurements: drift,
      trigger,
      tradeProposal: proposal,
      postTradeSimulation: simulation,
      explanation,
    });

    const first = serializeAuditRecord(record);
    const second = serializeAuditRecord(record);
    const serialized = JSON.parse(first);

    expect(first).toBe(second);
    expect(serialized.inputs).toEqual(record.inputs);
    expect(serialized.outputs.tradeProposal.trades[0].estimatedValue).toBe(0.05);
    expect(serialized.outputs.postTradeSimulation.turnover).toBe(0.1666666667);
  });
});
