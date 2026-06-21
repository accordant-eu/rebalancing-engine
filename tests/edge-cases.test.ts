/**
 * Edge-case tests for MVP-scope behavior not covered elsewhere.
 *
 * Scope: Fixture-driven regression checks across valuation, drift, threshold
 * trigger, and the later MVP trade-proposal slices.
 */

import * as fs from 'fs';
import * as path from 'path';
import { calculateValuation, calculateCurrentWeights } from '../src/core/valuation';
import { calculateDrift, validateTargetAllocation } from '../src/core/drift';
import { generateTradeProposal } from '../src/core/trades';
import { ThresholdStrategy } from '../src/strategy/threshold';
import {
  PortfolioState,
  PriceSnapshot,
  TargetAllocation,
  RebalancingPolicy,
} from '../src/models/domain';

const scenariosPath = path.join(__dirname, 'fixtures', 'scenarios.json');
const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));

// ─── min_trade_size_issue ────────────────────────────────────────────────────
// Fixture: US0378331005:XNAS:USD qty=105, US5949181045:XNAS:USD qty=95, price=10 each.
// Total value: 2000. Tolerance: 1%. Min trade size: 1000.
// US0378331005:XNAS:USD weight: 1050/2000 = 0.525 → drift +0.025 → out of band (>0.01).
// US5949181045:XNAS:USD weight:  950/2000 = 0.475 → drift −0.025 → out of band (>0.01).
// Required rebalance trade: ~5 shares of US0378331005:XNAS:USD ($50 value) < $1000 min.
// Trade proposal should suppress below-minimum trades and emit warnings.
describe('Edge Cases — min_trade_size_issue fixture', () => {
  const strategy = new ThresholdStrategy();

  it('detects drift breach for both assets', () => {
    const scenario = scenariosData.scenarios.find((s: any) => s.id === 'min_trade_size_issue');
    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;
    const target: TargetAllocation = scenario.targetAllocation;
    const policy: RebalancingPolicy = scenario.policy;

    const valuation = calculateValuation(state, prices);
    // Total value: 105*10 + 95*10 = 2000
    expect(valuation.totalPortfolioValue).toBe(2000);

    const weights = calculateCurrentWeights(valuation);
    const aapl = weights.find((w) => w.instrumentId === 'US0378331005:XNAS:USD')!;
    const msft = weights.find((w) => w.instrumentId === 'US5949181045:XNAS:USD')!;
    expect(aapl.weight).toBeCloseTo(0.525, 4);
    expect(msft.weight).toBeCloseTo(0.475, 4);

    const drift = calculateDrift(weights, target, policy);
    const aaplDrift = drift.find((d) => d.instrumentId === 'US0378331005:XNAS:USD')!;
    const msftDrift = drift.find((d) => d.instrumentId === 'US5949181045:XNAS:USD')!;
    // Drift exceeds the tight 1% tolerance — trigger is warranted despite small size.
    expect(aaplDrift.absoluteDrift).toBeCloseTo(0.025, 4);
    expect(aaplDrift.isOutOfBand).toBe(true);
    expect(msftDrift.absoluteDrift).toBeCloseTo(-0.025, 4);
    expect(msftDrift.isOutOfBand).toBe(true);
  });

  it('triggers rebalance despite small portfolio', () => {
    // The threshold strategy fires on drift alone; minimum trade size suppression
    // is handled when proposal generation applies the policy constraints.
    const scenario = scenariosData.scenarios.find((s: any) => s.id === 'min_trade_size_issue');
    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;
    const target: TargetAllocation = scenario.targetAllocation;
    const policy: RebalancingPolicy = scenario.policy;

    const valuation = calculateValuation(state, prices);
    const weights = calculateCurrentWeights(valuation);
    const drift = calculateDrift(weights, target, policy);

    const triggerResult = strategy.evaluateTrigger(state, drift, policy);
    expect(triggerResult.isTriggered).toBe(true);
    expect(triggerResult.reason).toContain('US0378331005:XNAS:USD');
    expect(triggerResult.reason).toContain('US5949181045:XNAS:USD');
  });

  it('suppresses below-minimum proposal trades with explicit warnings', () => {
    const scenario = scenariosData.scenarios.find((s: any) => s.id === 'min_trade_size_issue');
    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;
    const target: TargetAllocation = scenario.targetAllocation;
    const policy: RebalancingPolicy = scenario.policy;

    const valuation = calculateValuation(state, prices);
    const proposal = generateTradeProposal(valuation, target, prices, policy);

    expect(proposal.trades).toEqual([]);
    expect(proposal.estimatedPostTradeCash).toBe(0);
    expect(proposal.warnings).toHaveLength(2);
    expect(proposal.warnings.map((warning) => warning.instrumentId)).toEqual(['US0378331005:XNAS:USD', 'US5949181045:XNAS:USD']);
    for (const warning of proposal.warnings) {
      expect(warning.code).toBe('MINIMUM_TRADE_SIZE');
      expect(warning.estimatedValue).toBeCloseTo(50, 8);
      expect(warning.minimumTradeSize).toBe(1000);
    }
  });
});

// ─── positive_cash — drift and trigger validation ────────────────────────────
// Fixture: cash=5000, US0378331005:XNAS:USD qty=50 ($5000), US5949181045:XNAS:USD qty=50 ($5000), total=15000.
// US0378331005:XNAS:USD weight: 5000/15000 ≈ 0.333, target 0.5 → drift ≈ −0.167 → out of band.
// US5949181045:XNAS:USD weight: 5000/15000 ≈ 0.333, target 0.5 → drift ≈ −0.167 → out of band.
// Both underweight because cash dilutes the instrument weights.
describe('Edge Cases — positive_cash drift and trigger', () => {
  const strategy = new ThresholdStrategy();

  it('detects both assets as underweight due to cash dilution', () => {
    const scenario = scenariosData.scenarios.find((s: any) => s.id === 'positive_cash');
    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;
    const target: TargetAllocation = scenario.targetAllocation;
    const policy: RebalancingPolicy = scenario.policy;

    const valuation = calculateValuation(state, prices);
    expect(valuation.totalPortfolioValue).toBe(15000);

    const weights = calculateCurrentWeights(valuation);
    const aapl = weights.find((w) => w.instrumentId === 'US0378331005:XNAS:USD')!;
    const msft = weights.find((w) => w.instrumentId === 'US5949181045:XNAS:USD')!;
    expect(aapl.weight).toBeCloseTo(1 / 3, 4);
    expect(msft.weight).toBeCloseTo(1 / 3, 4);

    const drift = calculateDrift(weights, target, policy);
    const aaplDrift = drift.find((d) => d.instrumentId === 'US0378331005:XNAS:USD')!;
    const msftDrift = drift.find((d) => d.instrumentId === 'US5949181045:XNAS:USD')!;

    // Both instruments are underweight by ~16.7% — well outside the 5% tolerance.
    expect(aaplDrift.absoluteDrift).toBeCloseTo(-1 / 6, 4);
    expect(aaplDrift.isOutOfBand).toBe(true);
    expect(msftDrift.absoluteDrift).toBeCloseTo(-1 / 6, 4);
    expect(msftDrift.isOutOfBand).toBe(true);
  });

  it('triggers rebalance for cash-diluted portfolio', () => {
    const scenario = scenariosData.scenarios.find((s: any) => s.id === 'positive_cash');
    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;
    const target: TargetAllocation = scenario.targetAllocation;
    const policy: RebalancingPolicy = scenario.policy;

    const valuation = calculateValuation(state, prices);
    const weights = calculateCurrentWeights(valuation);
    const drift = calculateDrift(weights, target, policy);

    const triggerResult = strategy.evaluateTrigger(state, drift, policy);
    expect(triggerResult.isTriggered).toBe(true);
  });

  it('deploys available cash through buy-only proposal trades', () => {
    const scenario = scenariosData.scenarios.find((s: any) => s.id === 'positive_cash');
    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;
    const target: TargetAllocation = scenario.targetAllocation;

    const valuation = calculateValuation(state, prices);
    const proposal = generateTradeProposal(valuation, target, prices);

    expect(proposal.trades).toHaveLength(2);
    expect(proposal.trades.map((trade) => trade.direction)).toEqual(['BUY', 'BUY']);
    expect(proposal.trades.map((trade) => trade.instrumentId)).toEqual(['US0378331005:XNAS:USD', 'US5949181045:XNAS:USD']);
    expect(proposal.estimatedPostTradeCash).toBeCloseTo(0, 8);
  });
});

// ─── no-op case: on_target portfolio should not trigger ──────────────────────
describe('Edge Cases — no-op rebalance for on_target portfolio', () => {
  const strategy = new ThresholdStrategy();

  it('produces zero drift and no trigger for on-target portfolio', () => {
    const scenario = scenariosData.scenarios.find((s: any) => s.id === 'on_target');
    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;
    const target: TargetAllocation = scenario.targetAllocation;
    const policy: RebalancingPolicy = scenario.policy;

    const valuation = calculateValuation(state, prices);
    const weights = calculateCurrentWeights(valuation);
    const drift = calculateDrift(weights, target, policy);

    for (const d of drift) {
      expect(d.absoluteDrift).toBeCloseTo(0, 10);
      expect(d.isOutOfBand).toBe(false);
    }

    const triggerResult = strategy.evaluateTrigger(state, drift, policy);
    expect(triggerResult.isTriggered).toBe(false);
    expect(triggerResult.reason).toBeNull();
  });

  it('generates no proposal trades for an on-target portfolio', () => {
    const scenario = scenariosData.scenarios.find((s: any) => s.id === 'on_target');
    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;
    const target: TargetAllocation = scenario.targetAllocation;

    const valuation = calculateValuation(state, prices);
    const proposal = generateTradeProposal(valuation, target, prices);

    expect(proposal.trades).toEqual([]);
    expect(proposal.estimatedPostTradeCash).toBe(0);
    expect(proposal.warnings).toEqual([]);
  });
});

// ─── cash-only portfolio ─────────────────────────────────────────────────────
// Holdings are empty but there is $10 000 cash. All instrument weights are 0.
// With a target allocation of 100% US0378331005:XNAS:USD, drift = -100%, trigger should fire.
describe('Edge Cases — cash-only portfolio', () => {
  it('treats all target instruments as fully underweight', () => {
    const state: PortfolioState = { accountId: 'cash-only-1', cash: 10000, holdings: [] };
    const target: TargetAllocation = { targets: [{ instrumentId: 'US0378331005:XNAS:USD', weight: 1.0 }] };
    const policy: RebalancingPolicy = { absoluteDriftTolerance: 0.05, minimumTradeSize: 0 };
    const prices: PriceSnapshot = { prices: { 'US0378331005:XNAS:USD': 100 } };

    const valuation = calculateValuation(state, prices);
    expect(valuation.totalPortfolioValue).toBe(10000);
    expect(valuation.totalHoldingsValue).toBe(0);

    const weights = calculateCurrentWeights(valuation);
    // No holdings → no instrument weights returned from the valuation.
    expect(weights.length).toBe(0);

    const drift = calculateDrift(weights, target, policy);
    const aapl = drift.find((d) => d.instrumentId === 'US0378331005:XNAS:USD')!;
    expect(aapl).toBeDefined();
    expect(aapl.currentWeight).toBe(0);
    expect(aapl.targetWeight).toBe(1.0);
    expect(aapl.absoluteDrift).toBe(-1.0);
    expect(aapl.isOutOfBand).toBe(true);
  });
});

// ─── validateTargetAllocation edge cases ────────────────────────────────────
describe('Edge Cases — target allocation validation', () => {
  it('rejects targets that sum below 100%', () => {
    const underTarget: TargetAllocation = {
      targets: [
        { instrumentId: 'A', weight: 0.4 },
        { instrumentId: 'B', weight: 0.4 },
      ],
    };
    // Sum = 0.8; should throw
    expect(() => validateTargetAllocation(underTarget)).toThrow(
      'Target allocation (assets + cash buffer) does not sum to 100%. Total: 80.00%',
    );
  });

  it('accepts a single-asset 100% target', () => {
    const singleTarget: TargetAllocation = {
      targets: [{ instrumentId: 'A', weight: 1.0 }],
    };
    expect(() => validateTargetAllocation(singleTarget)).not.toThrow();
  });

  it('accepts targets summing within floating-point epsilon of 1.0', () => {
    // 0.1 + 0.2 + 0.3 + 0.4 in IEEE 754 may not be exactly 1.0 — verify epsilon guards this.
    const floatTarget: TargetAllocation = {
      targets: [
        { instrumentId: 'A', weight: 0.1 },
        { instrumentId: 'B', weight: 0.2 },
        { instrumentId: 'C', weight: 0.3 },
        { instrumentId: 'D', weight: 0.4 },
      ],
    };
    expect(() => validateTargetAllocation(floatTarget)).not.toThrow();
  });

  it('rejects an empty targets array', () => {
    // An empty allocation sums to 0.0 — not a valid target.
    const target: TargetAllocation = { targets: [] };
    expect(() => validateTargetAllocation(target)).toThrow(
      'Target allocation (assets + cash buffer) does not sum to 100%. Total: 0.00%',
    );
  });
});

// ─── determinism check ───────────────────────────────────────────────────────
// MVP plan requires deterministic output. Run the same scenario twice and
// assert identical results without relying on insertion order.
describe('Edge Cases — determinism of drift output ordering', () => {
  it('returns instruments sorted alphabetically regardless of input order', () => {
    // Supply weights in reverse-alphabetical order.
    const weights = [
      { instrumentId: 'US5949181045:XNAS:USD', weight: 0.4 },
      { instrumentId: 'US38259P5089:XNAS:USD', weight: 0.2 },
      { instrumentId: 'US0378331005:XNAS:USD', weight: 0.4 },
    ];
    const target: TargetAllocation = {
      targets: [
        { instrumentId: 'US0378331005:XNAS:USD', weight: 0.4 },
        { instrumentId: 'US38259P5089:XNAS:USD', weight: 0.2 },
        { instrumentId: 'US5949181045:XNAS:USD', weight: 0.4 },
      ],
    };
    const policy: RebalancingPolicy = { absoluteDriftTolerance: 0.05, minimumTradeSize: 0 };

    const drift = calculateDrift(weights, target, policy);
    expect(drift.map((d) => d.instrumentId)).toEqual(['US0378331005:XNAS:USD', 'US38259P5089:XNAS:USD', 'US5949181045:XNAS:USD']);
  });
});
