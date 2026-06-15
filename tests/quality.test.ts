import { 
  DriftReductionIndicator, 
  ConcentrationLimitIndicator, 
  DriftUtilityTranslator,
  EvaluationState
} from '../src/core/quality';
import { TargetAllocation, RebalancingPolicy, ProposedTrade } from '../src/models/domain';

describe('Quality Indicators', () => {
  const mockPolicy: RebalancingPolicy = {
    absoluteDriftTolerance: 0.05,
    minimumTradeSize: 10,
  };

  const mockTarget: TargetAllocation = {
    targets: [
      { instrumentId: 'AAPL', weight: 0.5 },
      { instrumentId: 'MSFT', weight: 0.5 }
    ]
  };

  describe('ConcentrationLimitIndicator', () => {
    it('should pass if no weights exceed the limit', () => {
      const indicator = new ConcentrationLimitIndicator(0.6); // 60% limit
      const state: EvaluationState = {
        valuation: { totalPortfolioValue: 1000, cash: 0, holdings: [], totalHoldingsValue: 1000 },
        weightResults: [
          { instrumentId: 'AAPL', weight: 0.5 },
          { instrumentId: 'MSFT', weight: 0.5 }
        ],
        target: mockTarget,
        policy: mockPolicy,
        proposedTrades: [],
        estimatedTco: 0
      };

      const result = indicator.evaluate(state, state); // Pre-trade doesn't matter for this
      expect(result.passed).toBe(true);
    });

    it('should fail if any weight exceeds the limit', () => {
      const indicator = new ConcentrationLimitIndicator(0.6);
      const state: EvaluationState = {
        valuation: { totalPortfolioValue: 1000, cash: 0, holdings: [], totalHoldingsValue: 1000 },
        weightResults: [
          { instrumentId: 'AAPL', weight: 0.65 }, // Breaches 60%
          { instrumentId: 'MSFT', weight: 0.35 }
        ],
        target: mockTarget,
        policy: mockPolicy,
        proposedTrades: [],
        estimatedTco: 0
      };

      const result = indicator.evaluate(state, state);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('Concentration limit breached');
    });
  });

  describe('DriftReductionIndicator', () => {
    it('should pass when drift reduction utility exceeds TCO utility', () => {
      const translator = new DriftUtilityTranslator();
      const indicator = new DriftReductionIndicator(translator);

      // Pre-trade: 20% drift on both (40% total absolute drift)
      const preState: EvaluationState = {
        valuation: { totalPortfolioValue: 10000, cash: 0, holdings: [], totalHoldingsValue: 10000 },
        weightResults: [
          { instrumentId: 'AAPL', weight: 0.7 },
          { instrumentId: 'MSFT', weight: 0.3 }
        ],
        target: mockTarget,
        policy: mockPolicy,
        proposedTrades: [],
        estimatedTco: 0
      };

      // Post-trade: 0% drift
      const postState: EvaluationState = {
        valuation: { totalPortfolioValue: 10000, cash: 0, holdings: [], totalHoldingsValue: 10000 },
        weightResults: [
          { instrumentId: 'AAPL', weight: 0.5 },
          { instrumentId: 'MSFT', weight: 0.5 }
        ],
        target: mockTarget,
        policy: mockPolicy,
        proposedTrades: [],
        estimatedTco: 10 // $10 TCO on a $10,000 portfolio = 10 bps
      };

      const result = indicator.evaluate(preState, postState);
      
      expect(result.passed).toBe(true);
      // Drift went from 0.4 total absolute to 0.0. Reduction = 0.4 = 4000 bps.
      // TCO = 10 / 10000 = 10 bps.
      // Net = 3990 bps.
      expect(result.netUtilityBps).toBe(3990);
    });

    it('should fail when TCO utility exceeds drift reduction utility', () => {
      const translator = new DriftUtilityTranslator();
      const indicator = new DriftReductionIndicator(translator);

      // Pre-trade: Minor drift (e.g. 1% off target, total 2% absolute drift)
      const preState: EvaluationState = {
        valuation: { totalPortfolioValue: 10000, cash: 0, holdings: [], totalHoldingsValue: 10000 },
        weightResults: [
          { instrumentId: 'AAPL', weight: 0.51 },
          { instrumentId: 'MSFT', weight: 0.49 }
        ],
        target: mockTarget,
        policy: mockPolicy,
        proposedTrades: [],
        estimatedTco: 0
      };

      // Post-trade: 0% drift, but $250 TCO
      const postState: EvaluationState = {
        valuation: { totalPortfolioValue: 10000, cash: 0, holdings: [], totalHoldingsValue: 10000 },
        weightResults: [
          { instrumentId: 'AAPL', weight: 0.5 },
          { instrumentId: 'MSFT', weight: 0.5 }
        ],
        target: mockTarget,
        policy: mockPolicy,
        proposedTrades: [],
        estimatedTco: 250 // $250 TCO on a $10,000 portfolio = 250 bps
      };

      const result = indicator.evaluate(preState, postState);
      
      expect(result.passed).toBe(false);
      // Drift reduction = 0.02 (absolute drift sum went from 0.02 to 0.0) = 200 bps.
      // TCO = 250 bps.
      // Net = 200 - 250 = -50 bps.
      expect(result.netUtilityBps).toBe(-50);
      expect(result.reason).toContain('is not positive');
    });
  });
});
