import * as fs from 'fs';
import * as path from 'path';
import { generateTradeProposal } from '../src/core/trades';
import { calculateValuation } from '../src/core/valuation';
import { simulatePostTrade } from '../src/core/simulation';
import {
  PortfolioState,
  PriceSnapshot,
  RebalancingPolicy,
  TargetAllocation,
  TradeProposal,
} from '../src/models/domain';

const scenariosPath = path.join(__dirname, 'fixtures', 'scenarios.json');
const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));

function scenarioById(id: string) {
  const scenario = scenariosData.scenarios.find((s: any) => s.id === id);
  expect(scenario).toBeDefined();
  return scenario;
}

describe('Post-Trade Simulation', () => {
  it('simulates a full-reset proposal and eliminates residual drift', () => {
    const scenario = scenarioById('one_asset_out_of_band');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);
    const proposal = generateTradeProposal(
      valuation,
      scenario.targetAllocation,
      scenario.priceSnapshot,
      scenario.policy,
    );

    const simulation = simulatePostTrade(
      scenario.portfolioState,
      scenario.priceSnapshot,
      scenario.targetAllocation,
      scenario.policy,
      proposal,
    );

    expect(simulation.postTradeState.cash).toBeCloseTo(0, 8);
    expect(simulation.postTradeState.holdings).toEqual([
      { instrumentId: 'US0378331005:XNAS:USD', quantity: 100 },
      { instrumentId: 'US5949181045:XNAS:USD', quantity: 100 },
    ]);
    for (const drift of simulation.residualDrift) {
      expect(drift.absoluteDrift).toBeCloseTo(0, 8);
      expect(drift.isOutOfBand).toBe(false);
    }
    expect(simulation.turnover).toBeCloseTo(3000 / 30000, 8);
  });

  it('simulates cash deployment without sell-side turnover', () => {
    const scenario = scenarioById('positive_cash');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);
    const proposal = generateTradeProposal(
      valuation,
      scenario.targetAllocation,
      scenario.priceSnapshot,
      scenario.policy,
    );

    const simulation = simulatePostTrade(
      scenario.portfolioState,
      scenario.priceSnapshot,
      scenario.targetAllocation,
      scenario.policy,
      proposal,
    );

    expect(simulation.postTradeState.cash).toBeCloseTo(0, 8);
    expect(simulation.postTradeState.holdings).toEqual([
      { instrumentId: 'US0378331005:XNAS:USD', quantity: 75 },
      { instrumentId: 'US5949181045:XNAS:USD', quantity: 75 },
    ]);
    expect(simulation.turnover).toBe(0);
  });

  it('surfaces residual drift when minimum trade constraints suppress trades', () => {
    const scenario = scenarioById('min_trade_size_issue');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);
    const proposal = generateTradeProposal(
      valuation,
      scenario.targetAllocation,
      scenario.priceSnapshot,
      scenario.policy,
    );

    const simulation = simulatePostTrade(
      scenario.portfolioState,
      scenario.priceSnapshot,
      scenario.targetAllocation,
      scenario.policy,
      proposal,
    );

    expect(proposal.trades).toEqual([]);
    expect(proposal.warnings).toHaveLength(2);
    expect(simulation.postTradeState).toEqual(scenario.portfolioState);
    expect(simulation.turnover).toBe(0);

    const aapl = simulation.residualDrift.find((drift) => drift.instrumentId === 'US0378331005:XNAS:USD')!;
    const msft = simulation.residualDrift.find((drift) => drift.instrumentId === 'US5949181045:XNAS:USD')!;
    expect(aapl.absoluteDrift).toBeCloseTo(0.025, 8);
    expect(aapl.isOutOfBand).toBe(true);
    expect(msft.absoluteDrift).toBeCloseTo(-0.025, 8);
    expect(msft.isOutOfBand).toBe(true);
  });

  it('rejects proposals that try to sell more than the current holding', () => {
    const state: PortfolioState = {
      accountId: 'oversell-1',
      cash: 0,
      holdings: [{ instrumentId: 'US0378331005:XNAS:USD', quantity: 1 }],
    };
    const prices: PriceSnapshot = { prices: { 'US0378331005:XNAS:USD': 100 } };
    const target: TargetAllocation = { targets: [{ instrumentId: 'US0378331005:XNAS:USD', weight: 1 }] };
    const policy: RebalancingPolicy = { absoluteDriftTolerance: 0.05, minimumTradeSize: 0 };
    const proposal: TradeProposal = {
      trades: [
        {
          instrumentId: 'US0378331005:XNAS:USD',
          direction: 'SELL',
          quantity: 2,
          estimatedPrice: 100,
          estimatedValue: 200,
        },
      ],
      estimatedPostTradeCash: 200,
      warnings: [],
      executionTargetMode: 'full_reset',
    };

    expect(() => simulatePostTrade(state, prices, target, policy, proposal)).toThrow(
      'Cannot sell more than current holding for instrument: US0378331005:XNAS:USD',
    );
  });

  it('rejects proposals whose cash estimate does not reconcile', () => {
    const scenario = scenarioById('one_asset_out_of_band');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);
    const proposal = generateTradeProposal(
      valuation,
      scenario.targetAllocation,
      scenario.priceSnapshot,
      scenario.policy,
    );

    expect(() =>
      simulatePostTrade(
        scenario.portfolioState,
        scenario.priceSnapshot,
        scenario.targetAllocation,
        scenario.policy,
        { ...proposal, estimatedPostTradeCash: 1 },
      ),
    ).toThrow('Simulated cash does not reconcile with proposal estimated post-trade cash');
  });

  it('simulates boundary-target trades with residual drift inside tolerance', () => {
    const scenario = scenarioById('threshold_boundary_target');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);
    const proposal = generateTradeProposal(
      valuation,
      scenario.targetAllocation,
      scenario.priceSnapshot,
      scenario.policy,
    );

    const simulation = simulatePostTrade(
      scenario.portfolioState,
      scenario.priceSnapshot,
      scenario.targetAllocation,
      scenario.policy,
      proposal,
    );

    const aapl = simulation.residualDrift.find((drift) => drift.instrumentId === 'US0378331005:XNAS:USD');
    const msft = simulation.residualDrift.find((drift) => drift.instrumentId === 'US5949181045:XNAS:USD');

    expect(aapl?.currentWeight).toBeCloseTo(0.55, 8);
    expect(aapl?.isOutOfBand).toBe(false);
    expect(msft?.currentWeight).toBeCloseTo(0.45, 8);
    expect(msft?.isOutOfBand).toBe(false);
    expect(simulation.turnover).toBeCloseTo(0.05, 8);
  });

  it('simulates relative-boundary trades with residual relative drift inside tolerance', () => {
    const scenario = scenarioById('threshold_relative_boundary_target');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);
    const proposal = generateTradeProposal(
      valuation,
      scenario.targetAllocation,
      scenario.priceSnapshot,
      scenario.policy,
    );

    const simulation = simulatePostTrade(
      scenario.portfolioState,
      scenario.priceSnapshot,
      scenario.targetAllocation,
      scenario.policy,
      proposal,
    );

    const aapl = simulation.residualDrift.find((drift) => drift.instrumentId === 'US0378331005:XNAS:USD');

    expect(proposal.boundaryBandMode).toBe('relative');
    expect(aapl?.currentWeight).toBeCloseTo(0.12, 8);
    expect(aapl?.relativeDrift).toBeCloseTo(0.2, 8);
    expect(aapl?.isOutOfBand).toBe(false);
    expect(simulation.postTradeState.cash).toBeCloseTo(300, 8);
    expect(simulation.turnover).toBeCloseTo(0.03, 8);
  });
});
