import { generateAuditRecord } from '../src/audit';
import { calculateValuation, calculateCurrentWeights } from '../src/core/valuation';
import { calculateDrift, validateTargetAllocation } from '../src/core/drift';
import { simulatePostTrade } from '../src/core/simulation';
import { generateExplanation } from '../src/explanation';
import { runScenarios } from '../src/runner';
import { ManualRebalanceStrategy, ThresholdStrategy } from '../src/strategy';

/**
 * Structural smoke tests: verify that core modules are importable and return
 * the expected types without throwing. These act as a canary — if a major
 * refactor or build issue breaks exports, this suite will fail immediately.
 */
describe('Smoke Test — Core Module Imports', () => {
  it('calculateValuation is importable and returns a ValuationResult', () => {
    const state = {
      accountId: 'smoke-1',
      cash: 0,
      holdings: [{ instrumentId: 'A', quantity: 10 }],
    };
    const prices = { prices: { A: 100 } };
    const result = calculateValuation(state, prices);
    expect(typeof result.totalPortfolioValue).toBe('number');
    expect(typeof result.totalHoldingsValue).toBe('number');
    expect(Array.isArray(result.holdings)).toBe(true);
  });

  it('calculateCurrentWeights is importable and returns WeightResult[]', () => {
    const state = {
      accountId: 'smoke-2',
      cash: 0,
      holdings: [{ instrumentId: 'A', quantity: 10 }],
    };
    const prices = { prices: { A: 100 } };
    const valuation = calculateValuation(state, prices);
    const weights = calculateCurrentWeights(valuation);
    expect(Array.isArray(weights)).toBe(true);
  });

  it('calculateDrift is importable and returns DriftMeasurement[]', () => {
    const weights = [{ instrumentId: 'A', weight: 0.5 }];
    const target = { targets: [{ instrumentId: 'A', weight: 1.0 }] };
    const policy = { absoluteDriftTolerance: 0.05, minimumTradeSize: 0 };
    const drift = calculateDrift(weights, target, policy);
    expect(Array.isArray(drift)).toBe(true);
  });

  it('validateTargetAllocation is importable and validates correctly', () => {
    const valid = {
      targets: [
        { instrumentId: 'A', weight: 0.6 },
        { instrumentId: 'B', weight: 0.4 },
      ],
    };
    expect(() => validateTargetAllocation(valid)).not.toThrow();
  });

  it('ThresholdStrategy is importable and implements evaluateTrigger', () => {
    const strategy = new ThresholdStrategy();
    expect(typeof strategy.evaluateTrigger).toBe('function');
  });

  it('ManualRebalanceStrategy is importable and implements evaluateTrigger', () => {
    const strategy = new ManualRebalanceStrategy();
    expect(typeof strategy.evaluateTrigger).toBe('function');
  });

  it('simulatePostTrade is importable', () => {
    expect(typeof simulatePostTrade).toBe('function');
  });

  it('generateExplanation is importable', () => {
    expect(typeof generateExplanation).toBe('function');
  });

  it('generateAuditRecord is importable', () => {
    expect(typeof generateAuditRecord).toBe('function');
  });

  it('runScenarios is importable', () => {
    expect(typeof runScenarios).toBe('function');
  });
});
