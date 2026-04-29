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
      'Target allocation does not sum to 100%. Total: 110.00%',
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
    // AAPL current weight: 18000/30000 = 0.6
    // MSFT current weight: 12000/30000 = 0.4
    // AAPL absolute drift: 0.6 - 0.5 = +0.1
    // MSFT absolute drift: 0.4 - 0.5 = -0.1
    // Policy tolerance: 0.05
    // Both should be out of band.

    expect(drift.length).toBe(2);

    const aapl = drift.find((d) => d.instrumentId === 'AAPL')!;
    expect(aapl.absoluteDrift).toBeCloseTo(0.1, 4);
    expect(aapl.isOutOfBand).toBe(true);

    const msft = drift.find((d) => d.instrumentId === 'MSFT')!;
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

    // Value: AAPL 100*150 = 15000, TSLA 50*200 = 10000. Total 25000.
    // AAPL weight = 15000/25000 = 0.6
    // TSLA weight = 10000/25000 = 0.4
    // TSLA is not in target, so target weight = 0
    // TSLA abs drift = +0.4 (out of band)

    const tsla = drift.find((d) => d.instrumentId === 'TSLA')!;
    expect(tsla.targetWeight).toBe(0);
    expect(tsla.currentWeight).toBe(0.4);
    expect(tsla.absoluteDrift).toBe(0.4);
    expect(tsla.isOutOfBand).toBe(true);
  });

  it('handles target not in holdings', () => {
    // Create a scenario where we have a target but hold 0
    const state: PortfolioState = { accountId: '1', cash: 10000, holdings: [] };
    const target: TargetAllocation = { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] };
    const policy: RebalancingPolicy = { absoluteDriftTolerance: 0.05, minimumTradeSize: 0 };
    const prices: PriceSnapshot = { prices: { AAPL: 100 } };

    const valuation = calculateValuation(state, prices);
    const weights = calculateCurrentWeights(valuation);
    const drift = calculateDrift(weights, target, policy);

    const aapl = drift.find((d) => d.instrumentId === 'AAPL')!;
    expect(aapl.currentWeight).toBe(0);
    expect(aapl.targetWeight).toBe(1.0);
    expect(aapl.absoluteDrift).toBe(-1.0);
    expect(aapl.isOutOfBand).toBe(true);
  });
});
