import * as fs from 'fs';
import * as path from 'path';
import { calculateValuation, calculateCurrentWeights } from '../src/core/valuation';
import { calculateDrift, validateTargetAllocation } from '../src/core/drift';
import {
  PortfolioState,
  PriceSnapshot,
  TargetAllocation,
  RebalancingPolicy,
} from '../src/models/domain';

const scenariosPath = path.join(__dirname, 'fixtures', 'scenarios.json');
const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));

describe('Drift Calculation', () => {
  it('validates target allocations correctly', () => {
    const validTarget: TargetAllocation = {
      targets: [
        { instrumentId: 'A', weight: 0.5 },
        { instrumentId: 'B', weight: 0.5 },
      ],
    };
    expect(() => validateTargetAllocation(validTarget)).not.toThrow();

    const invalidTarget: TargetAllocation = {
      targets: [
        { instrumentId: 'A', weight: 0.5 },
        { instrumentId: 'B', weight: 0.6 },
      ],
    };
    expect(() => validateTargetAllocation(invalidTarget)).toThrow(
      'Target allocation (assets + cash buffer) does not sum to 100%. Total: 110.00%',
    );

    const validTargetWithCash: TargetAllocation = {
      targets: [
        { instrumentId: 'A', weight: 0.8 },
      ],
      cashBuffer: 0.2
    };
    expect(() => validateTargetAllocation(validTargetWithCash)).not.toThrow();

    const invalidTargetWithCash: TargetAllocation = {
      targets: [
        { instrumentId: 'A', weight: 0.8 },
      ],
      cashBuffer: 0.3
    };
    expect(() => validateTargetAllocation(invalidTargetWithCash)).toThrow(
      'Target allocation (assets + cash buffer) does not sum to 100%. Total: 110.00%',
    );

    const sumErrorScenario = scenariosData.scenarios.find(
      (s: any) => s.id === 'target_allocation_sum_error',
    );
    expect(() => validateTargetAllocation(sumErrorScenario.targetAllocation)).toThrow();
  });

  it('calculates zero drift for on-target portfolio', () => {
    const scenario = scenariosData.scenarios.find((s: any) => s.id === 'on_target');
    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;
    const target: TargetAllocation = scenario.targetAllocation;
    const policy: RebalancingPolicy = scenario.policy;

    const valuation = calculateValuation(state, prices);
    const weights = calculateCurrentWeights(valuation);
    const drift = calculateDrift(weights, target, policy);

    expect(drift.length).toBe(2);
    for (const d of drift) {
      expect(d.absoluteDrift).toBeCloseTo(0, 4);
      expect(d.isOutOfBand).toBe(false);
    }
  });

  it('detects out of band assets', () => {
    const scenario = scenariosData.scenarios.find((s: any) => s.id === 'one_asset_out_of_band');
    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;
    const target: TargetAllocation = scenario.targetAllocation;
    const policy: RebalancingPolicy = scenario.policy;

    const valuation = calculateValuation(state, prices);
    const weights = calculateCurrentWeights(valuation);
    const drift = calculateDrift(weights, target, policy);

    // Total value: 120*150 + 80*150 = 18000 + 12000 = 30000
    // US0378331005:XNAS:USD current weight: 18000/30000 = 0.6
    // US5949181045:XNAS:USD current weight: 12000/30000 = 0.4
    // US0378331005:XNAS:USD absolute drift: 0.6 - 0.5 = +0.1
    // US5949181045:XNAS:USD absolute drift: 0.4 - 0.5 = -0.1
    // Policy tolerance: 0.05
    // Both should be out of band.

    expect(drift.length).toBe(2);

    const aapl = drift.find((d) => d.instrumentId === 'US0378331005:XNAS:USD')!;
    expect(aapl.absoluteDrift).toBeCloseTo(0.1, 4);
    expect(aapl.isOutOfBand).toBe(true);

    const msft = drift.find((d) => d.instrumentId === 'US5949181045:XNAS:USD')!;
    expect(msft.absoluteDrift).toBeCloseTo(-0.1, 4);
    expect(msft.isOutOfBand).toBe(true);
  });

  it('handles holding outside universe', () => {
    const scenario = scenariosData.scenarios.find((s: any) => s.id === 'holding_outside_universe');
    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;
    const target: TargetAllocation = scenario.targetAllocation;
    const policy: RebalancingPolicy = scenario.policy;

    const valuation = calculateValuation(state, prices);
    const weights = calculateCurrentWeights(valuation);
    const drift = calculateDrift(weights, target, policy);

    // Value: US0378331005:XNAS:USD 100*150 = 15000, US88160R1014:XNAS:USD 50*200 = 10000. Total 25000.
    // US0378331005:XNAS:USD weight = 15000/25000 = 0.6
    // US88160R1014:XNAS:USD weight = 10000/25000 = 0.4
    // US88160R1014:XNAS:USD is not in target, so target weight = 0
    // US88160R1014:XNAS:USD abs drift = +0.4 (out of band)

    const tsla = drift.find((d) => d.instrumentId === 'US88160R1014:XNAS:USD')!;
    expect(tsla.targetWeight).toBe(0);
    expect(tsla.currentWeight).toBe(0.4);
    expect(tsla.absoluteDrift).toBe(0.4);
    expect(tsla.isOutOfBand).toBe(true);

    // US0378331005:XNAS:USD is in the target (weight 1.0) but currently only 0.6 — severely underweight.
    // Value: US0378331005:XNAS:USD 100*150=15000, US88160R1014:XNAS:USD 50*200=10000, total=25000.
    // US0378331005:XNAS:USD current weight = 15000/25000 = 0.6, target = 1.0, drift = −0.4.
    const aapl = drift.find((d) => d.instrumentId === 'US0378331005:XNAS:USD')!;
    expect(aapl.targetWeight).toBe(1.0);
    expect(aapl.currentWeight).toBeCloseTo(0.6, 4);
    expect(aapl.absoluteDrift).toBeCloseTo(-0.4, 4);
    expect(aapl.isOutOfBand).toBe(true);
  });

  it('handles target not in holdings', () => {
    // Create a scenario where we have a target but hold 0
    const state: PortfolioState = { accountId: '1', cash: 10000, holdings: [] };
    const target: TargetAllocation = { targets: [{ instrumentId: 'US0378331005:XNAS:USD', weight: 1.0 }] };
    const policy: RebalancingPolicy = { absoluteDriftTolerance: 0.05, minimumTradeSize: 0 };
    const prices: PriceSnapshot = { prices: { 'US0378331005:XNAS:USD': 100 } };

    const valuation = calculateValuation(state, prices);
    const weights = calculateCurrentWeights(valuation);
    const drift = calculateDrift(weights, target, policy);

    const aapl = drift.find((d) => d.instrumentId === 'US0378331005:XNAS:USD')!;
    expect(aapl.currentWeight).toBe(0);
    expect(aapl.targetWeight).toBe(1.0);
    expect(aapl.absoluteDrift).toBe(-1.0);
    expect(aapl.isOutOfBand).toBe(true);
  });

  it('reports correct per-asset drift for multiple_assets_out_of_band scenario', () => {
    // Fixture: US0378331005:XNAS:USD qty=150, US5949181045:XNAS:USD qty=50, US38259P5089:XNAS:USD qty=50 — all at price 100.
    // Total value: 150*100 + 50*100 + 50*100 = 25000.
    // US0378331005:XNAS:USD current weight: 15000/25000 = 0.60, target 0.40 → drift +0.20 (out of band).
    // US5949181045:XNAS:USD current weight:  5000/25000 = 0.20, target 0.40 → drift −0.20 (out of band).
    // US38259P5089:XNAS:USD current weight:  5000/25000 = 0.20, target 0.20 → drift  0.00 (in band).
    const scenario = scenariosData.scenarios.find(
      (s: any) => s.id === 'multiple_assets_out_of_band',
    );
    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;
    const target: TargetAllocation = scenario.targetAllocation;
    const policy: RebalancingPolicy = scenario.policy;

    const valuation = calculateValuation(state, prices);
    const weights = calculateCurrentWeights(valuation);
    const drift = calculateDrift(weights, target, policy);

    expect(drift.length).toBe(3);

    const aapl = drift.find((d) => d.instrumentId === 'US0378331005:XNAS:USD')!;
    expect(aapl.currentWeight).toBeCloseTo(0.6, 4);
    expect(aapl.targetWeight).toBe(0.4);
    expect(aapl.absoluteDrift).toBeCloseTo(0.2, 4);
    expect(aapl.isOutOfBand).toBe(true);

    const msft = drift.find((d) => d.instrumentId === 'US5949181045:XNAS:USD')!;
    expect(msft.currentWeight).toBeCloseTo(0.2, 4);
    expect(msft.targetWeight).toBe(0.4);
    expect(msft.absoluteDrift).toBeCloseTo(-0.2, 4);
    expect(msft.isOutOfBand).toBe(true);

    const goog = drift.find((d) => d.instrumentId === 'US38259P5089:XNAS:USD')!;
    expect(goog.currentWeight).toBeCloseTo(0.2, 4);
    expect(goog.targetWeight).toBe(0.2);
    expect(goog.absoluteDrift).toBeCloseTo(0.0, 4);
    expect(goog.isOutOfBand).toBe(false);
  });
});
