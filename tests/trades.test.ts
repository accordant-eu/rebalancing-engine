import * as fs from 'fs';
import * as path from 'path';
import { calculateValuation } from '../src/core/valuation';
import { generateTradeProposal } from '../src/core/trades';
import {
  PortfolioState,
  PriceSnapshot,
  ProposedTrade,
  TargetAllocation,
} from '../src/models/domain';

const scenariosPath = path.join(__dirname, 'fixtures', 'scenarios.json');
const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));

function scenarioById(id: string) {
  const scenario = scenariosData.scenarios.find((s: any) => s.id === id);
  expect(scenario).toBeDefined();
  return scenario;
}

function findTrade(trades: ProposedTrade[], instrumentId: string): ProposedTrade {
  const trade = trades.find((t) => t.instrumentId === instrumentId);
  expect(trade).toBeDefined();
  return trade!;
}

describe('Trade Proposal Generation', () => {
  it('returns no trades for an on-target portfolio', () => {
    const scenario = scenarioById('on_target');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);

    const proposal = generateTradeProposal(
      valuation,
      scenario.targetAllocation,
      scenario.priceSnapshot,
    );

    expect(proposal.trades).toEqual([]);
    expect(proposal.estimatedPostTradeCash).toBe(0);
    expect(proposal.warnings).toEqual([]);
  });

  it('generates deterministic full-reset trades for an out-of-band portfolio', () => {
    const scenario = scenarioById('one_asset_out_of_band');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);

    const proposal = generateTradeProposal(
      valuation,
      scenario.targetAllocation,
      scenario.priceSnapshot,
    );

    expect(proposal.trades.map((t) => t.instrumentId)).toEqual(['AAPL', 'MSFT']);

    const aapl = findTrade(proposal.trades, 'AAPL');
    expect(aapl.direction).toBe('SELL');
    expect(aapl.estimatedValue).toBeCloseTo(3000, 8);
    expect(aapl.quantity).toBeCloseTo(20, 8);
    expect(aapl.estimatedPrice).toBe(150);

    const msft = findTrade(proposal.trades, 'MSFT');
    expect(msft.direction).toBe('BUY');
    expect(msft.estimatedValue).toBeCloseTo(3000, 8);
    expect(msft.quantity).toBeCloseTo(20, 8);
    expect(msft.estimatedPrice).toBe(150);

    expect(proposal.estimatedPostTradeCash).toBeCloseTo(0, 8);
    expect(proposal.warnings).toEqual([]);
  });

  it('uses available cash when a full reset only requires buys', () => {
    const scenario = scenarioById('positive_cash');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);

    const proposal = generateTradeProposal(
      valuation,
      scenario.targetAllocation,
      scenario.priceSnapshot,
    );

    expect(proposal.trades.map((t) => t.instrumentId)).toEqual(['AAPL', 'MSFT']);
    for (const trade of proposal.trades) {
      expect(trade.direction).toBe('BUY');
      expect(trade.estimatedValue).toBeCloseTo(2500, 8);
      expect(trade.quantity).toBeCloseTo(25, 8);
      expect(trade.estimatedPrice).toBe(100);
    }
    expect(proposal.estimatedPostTradeCash).toBeCloseTo(0, 8);
    expect(proposal.warnings).toEqual([]);
  });

  it('sells holdings outside the target universe and buys underweight target assets', () => {
    const scenario = scenarioById('holding_outside_universe');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);

    const proposal = generateTradeProposal(
      valuation,
      scenario.targetAllocation,
      scenario.priceSnapshot,
    );

    expect(proposal.trades.map((t) => t.instrumentId)).toEqual(['AAPL', 'TSLA']);

    const aapl = findTrade(proposal.trades, 'AAPL');
    expect(aapl.direction).toBe('BUY');
    expect(aapl.estimatedValue).toBeCloseTo(10000, 8);
    expect(aapl.quantity).toBeCloseTo(10000 / 150, 8);

    const tsla = findTrade(proposal.trades, 'TSLA');
    expect(tsla.direction).toBe('SELL');
    expect(tsla.estimatedValue).toBeCloseTo(10000, 8);
    expect(tsla.quantity).toBeCloseTo(50, 8);

    expect(proposal.estimatedPostTradeCash).toBeCloseTo(0, 8);
    expect(proposal.warnings).toEqual([]);
  });

  it('generates trades in stable instrument order independent of fixture order', () => {
    const state: PortfolioState = {
      accountId: 'ordering-1',
      cash: 0,
      holdings: [
        { instrumentId: 'MSFT', quantity: 50 },
        { instrumentId: 'AAPL', quantity: 150 },
        { instrumentId: 'GOOG', quantity: 50 },
      ],
    };
    const target: TargetAllocation = {
      targets: [
        { instrumentId: 'GOOG', weight: 0.2 },
        { instrumentId: 'MSFT', weight: 0.4 },
        { instrumentId: 'AAPL', weight: 0.4 },
      ],
    };
    const prices: PriceSnapshot = { prices: { AAPL: 100, GOOG: 100, MSFT: 100 } };
    const valuation = calculateValuation(state, prices);

    const proposal = generateTradeProposal(valuation, target, prices);

    expect(proposal.trades.map((t) => t.instrumentId)).toEqual(['AAPL', 'MSFT']);
    expect(proposal.warnings).toEqual([]);
  });

  it('throws when a target-only instrument needs a trade but has no price', () => {
    const state: PortfolioState = {
      accountId: 'missing-target-price-1',
      cash: 10000,
      holdings: [],
    };
    const target: TargetAllocation = {
      targets: [{ instrumentId: 'AAPL', weight: 1.0 }],
    };
    const prices: PriceSnapshot = { prices: {} };
    const valuation = calculateValuation(state, prices);

    expect(() => generateTradeProposal(valuation, target, prices)).toThrow(
      'Missing price for trade proposal instrument: AAPL',
    );
  });

  it('rejects invalid target allocations before generating trades', () => {
    const scenario = scenarioById('target_allocation_sum_error');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);

    expect(() =>
      generateTradeProposal(valuation, scenario.targetAllocation, scenario.priceSnapshot),
    ).toThrow('Target allocation does not sum to 100%');
  });

  it('rejects negative cash balances when generating proposals', () => {
    const state: PortfolioState = {
      accountId: 'negative-cash-1',
      cash: -100,
      holdings: [{ instrumentId: 'AAPL', quantity: 101 }],
    };
    const target: TargetAllocation = {
      targets: [{ instrumentId: 'AAPL', weight: 1.0 }],
    };
    const prices: PriceSnapshot = { prices: { AAPL: 100 } };
    const valuation = calculateValuation(state, prices);

    expect(() => generateTradeProposal(valuation, target, prices)).toThrow(
      'Cannot generate trade proposal for negative cash balance',
    );
  });

  it('suppresses trades below the global minimum trade size and emits warnings', () => {
    const scenario = scenarioById('min_trade_size_issue');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);

    const proposal = generateTradeProposal(
      valuation,
      scenario.targetAllocation,
      scenario.priceSnapshot,
      scenario.policy,
    );

    expect(proposal.trades).toEqual([]);
    expect(proposal.estimatedPostTradeCash).toBe(0);
    expect(proposal.warnings).toHaveLength(2);
    expect(proposal.warnings.map((warning) => warning.instrumentId)).toEqual(['AAPL', 'MSFT']);
    for (const warning of proposal.warnings) {
      expect(warning.code).toBe('MINIMUM_TRADE_SIZE');
      expect(warning.estimatedValue).toBeCloseTo(50, 8);
      expect(warning.minimumTradeSize).toBe(1000);
      expect(warning.message).toContain('below minimum trade size');
    }
  });

  it('generates boundary-target trades when configured for proportional-cost threshold execution', () => {
    const scenario = scenarioById('threshold_boundary_target');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);

    const proposal = generateTradeProposal(
      valuation,
      scenario.targetAllocation,
      scenario.priceSnapshot,
      scenario.policy,
    );

    expect(proposal.executionTargetMode).toBe('boundary');
    expect(proposal.trades.map((t) => t.instrumentId)).toEqual(['AAPL', 'MSFT']);

    const aapl = findTrade(proposal.trades, 'AAPL');
    expect(aapl.direction).toBe('SELL');
    expect(aapl.estimatedValue).toBeCloseTo(1500, 8);
    expect(aapl.quantity).toBeCloseTo(10, 8);

    const msft = findTrade(proposal.trades, 'MSFT');
    expect(msft.direction).toBe('BUY');
    expect(msft.estimatedValue).toBeCloseTo(1500, 8);
    expect(msft.quantity).toBeCloseTo(10, 8);

    expect(proposal.estimatedPostTradeCash).toBeCloseTo(0, 8);
    expect(proposal.warnings).toEqual([]);
  });
});
