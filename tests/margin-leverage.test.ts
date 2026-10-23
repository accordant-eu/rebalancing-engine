import { validateTargetAllocation } from '../src/core/drift';
import { generateTradeProposal } from '../src/core/trades';
import { simulatePostTrade } from '../src/core/simulation';
import { evaluateRebalance } from '../src/core/evaluation';
import {
  PortfolioState,
  PriceSnapshot,
  RebalancingPolicy,
  TargetAllocation,
  TradeProposal,
} from '../src/models/domain';

describe('Direct Margin & Leveraged Mandates (Slice 5 / ADR-0072)', () => {
  describe('validateTargetAllocation', () => {
    it('enforces 100% allocation on standard non-leveraged policies', () => {
      const standardPolicy: RebalancingPolicy = {
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 10,
      };

      const validTarget: TargetAllocation = {
        targets: [
          { instrumentId: 'AAPL', weight: 0.6 },
          { instrumentId: 'MSFT', weight: 0.4 },
        ],
      };
      expect(() => validateTargetAllocation(validTarget, standardPolicy)).not.toThrow();

      const leveragedTarget: TargetAllocation = {
        targets: [
          { instrumentId: 'AAPL', weight: 0.8 },
          { instrumentId: 'MSFT', weight: 0.6 }, // 140%
        ],
      };
      expect(() => validateTargetAllocation(leveragedTarget, standardPolicy)).toThrow(
        'Target allocation (assets + cash buffer) does not sum to 100%',
      );
    });

    it('permits allocations > 100% up to maxLeverageRatio when allowLeverage is enabled', () => {
      const marginPolicy: RebalancingPolicy = {
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 10,
        allowLeverage: true,
        maxLeverageRatio: 1.8,
      };

      const leveragedTarget140: TargetAllocation = {
        targets: [
          { instrumentId: 'AAPL', weight: 0.9 },
          { instrumentId: 'MSFT', weight: 0.5 }, // 140%
        ],
      };
      expect(() => validateTargetAllocation(leveragedTarget140, marginPolicy)).not.toThrow();

      const excessiveLeverage200: TargetAllocation = {
        targets: [
          { instrumentId: 'AAPL', weight: 1.2 },
          { instrumentId: 'MSFT', weight: 0.8 }, // 200% > 180%
        ],
      };
      expect(() => validateTargetAllocation(excessiveLeverage200, marginPolicy)).toThrow(
        'Leveraged target allocation exceeds maximum authorized leverage ratio of 1.80x. Total: 200.00%',
      );

      const negativeTarget: TargetAllocation = {
        targets: [{ instrumentId: 'AAPL', weight: -0.1 }],
      };
      expect(() => validateTargetAllocation(negativeTarget, marginPolicy)).toThrow(
        'Target allocation must be greater than 0%',
      );
    });
  });

  describe('generateTradeProposal with Margin Borrowing', () => {
    const prices: PriceSnapshot = {
      asOf: '2026-10-23T11:00:00Z',
      prices: { AAPL: 100, MSFT: 100 },
    };

    it('rejects negative cash on non-leveraged policies per ADR-0006', () => {
      const valuation = {
        holdings: [{ instrumentId: 'AAPL', quantity: 100, price: 100, marketValue: 10000 }],
        totalHoldingsValue: 10000,
        cash: -500,
        totalPortfolioValue: 9500,
      };

      const target: TargetAllocation = {
        targets: [{ instrumentId: 'AAPL', weight: 1.0 }],
      };

      const policy: RebalancingPolicy = {
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 10,
        allowLeverage: false,
      };

      expect(() => generateTradeProposal(valuation, target, prices, policy)).toThrow(
        'Cannot generate trade proposal for negative cash balance',
      );
    });

    it('generates buy orders utilizing margin borrowing for leveraged targets', () => {
      // Portfolio with $10,000 cash, 0 holdings.
      const valuation = {
        holdings: [],
        totalHoldingsValue: 0,
        cash: 10000,
        totalPortfolioValue: 10000,
      };

      // 140% AAPL mandate (1.4x leverage -> $14,000 of AAPL)
      const target: TargetAllocation = {
        targets: [{ instrumentId: 'AAPL', weight: 1.4 }],
      };

      const policy: RebalancingPolicy = {
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 10,
        allowLeverage: true,
        maxLeverageRatio: 2.0,
        marginExcessBuffer: 0.15,
      };

      const proposal = generateTradeProposal(valuation, target, prices, policy);

      expect(proposal.trades).toHaveLength(1);
      expect(proposal.trades[0]).toEqual(
        expect.objectContaining({
          instrumentId: 'AAPL',
          direction: 'BUY',
          quantity: 140,
          estimatedValue: 14000,
        }),
      );
      // Post-trade cash is 10,000 - 14,000 = -4,000
      expect(proposal.estimatedPostTradeCash).toBe(-4000);
      expect(proposal.warnings).toEqual([]);
    });

    it('emits MARGIN_BUFFER_BREACH warning when post-trade margin excess drops below safety buffer', () => {
      // Portfolio with $10,000 equity
      const valuation = {
        holdings: [],
        totalHoldingsValue: 0,
        cash: 10000,
        totalPortfolioValue: 10000,
      };

      // 180% AAPL mandate ($18,000 holdings, -$8,000 cash)
      // NAV = 10,000. Maintenance Margin @ 25% = 18,000 * 0.25 = 4,500.
      // Margin Excess = 10,000 - 4,500 = 5,500 (55% excess ratio).
      // If policy requires 60% buffer, this triggers warning.
      const target: TargetAllocation = {
        targets: [{ instrumentId: 'AAPL', weight: 1.8 }],
      };

      const policy: RebalancingPolicy = {
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 10,
        allowLeverage: true,
        maxLeverageRatio: 2.0,
        maintenanceMarginRequirement: 0.25,
        marginExcessBuffer: 0.60, // Requires 60% excess buffer
      };

      const proposal = generateTradeProposal(valuation, target, prices, policy);

      expect(proposal.estimatedPostTradeCash).toBe(-8000);
      expect(proposal.warnings).toContainEqual(
        expect.objectContaining({
          code: 'MARGIN_BUFFER_BREACH',
          marginExcessRatio: 0.55,
          requiredBuffer: 0.60,
        }),
      );
    });

    it('throws immediate error if proposal would cause equity to breach maintenance margin', () => {
      // Portfolio with $10,000 equity
      const valuation = {
        holdings: [],
        totalHoldingsValue: 0,
        cash: 10000,
        totalPortfolioValue: 10000,
      };

      // 250% mandate ($25,000 holdings, -$15,000 cash).
      // Maintenance margin @ 45% = 25,000 * 0.45 = 11,250.
      // Equity = 10,000 < 11,250 maintenance requirement -> immediate margin call!
      const target: TargetAllocation = {
        targets: [{ instrumentId: 'AAPL', weight: 2.5 }],
      };

      const policy: RebalancingPolicy = {
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 10,
        allowLeverage: true,
        maxLeverageRatio: 3.0,
        maintenanceMarginRequirement: 0.45,
      };

      expect(() => generateTradeProposal(valuation, target, prices, policy)).toThrow(
        'Trade proposal causes immediate margin call: equity (10000.00) is below maintenance margin requirement (11250.00)',
      );
    });
  });

  describe('simulatePostTrade with Leveraged Mandates', () => {
    const prices: PriceSnapshot = {
      asOf: '2026-10-23T11:00:00Z',
      prices: { AAPL: 100 },
    };

    it('simulates leveraged portfolio with negative cash and weights > 100%', () => {
      const state: PortfolioState = {
        accountId: 'margin-acc-1',
        cash: 10000,
        holdings: [],
      };

      const target: TargetAllocation = {
        targets: [{ instrumentId: 'AAPL', weight: 1.5 }], // 150%
      };

      const policy: RebalancingPolicy = {
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 10,
        allowLeverage: true,
      };

      const proposal: TradeProposal = {
        trades: [
          {
            instrumentId: 'AAPL',
            direction: 'BUY',
            quantity: 150,
            estimatedPrice: 100,
            estimatedValue: 15000,
          },
        ],
        estimatedPostTradeCash: -5000,
        warnings: [],
        executionTargetMode: 'full_reset',
      };

      const sim = simulatePostTrade(state, prices, target, policy, proposal);

      expect(sim.postTradeState.cash).toBe(-5000);
      expect(sim.postTradeValuation.totalHoldingsValue).toBe(15000);
      expect(sim.postTradeValuation.totalPortfolioValue).toBe(10000); // NAV / Equity
      expect(sim.postTradeWeights).toEqual([{ instrumentId: 'AAPL', weight: 1.5 }]);
      expect(sim.residualDrift[0].absoluteDrift).toBe(0);
      expect(sim.residualDrift[0].isOutOfBand).toBe(false);
    });

    it('throws if simulation results in negative cash when allowLeverage is false', () => {
      const state: PortfolioState = {
        accountId: 'cash-acc-1',
        cash: 5000,
        holdings: [],
      };

      const target: TargetAllocation = {
        targets: [{ instrumentId: 'AAPL', weight: 1.0 }],
      };

      const policy: RebalancingPolicy = {
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 10,
        allowLeverage: false,
      };

      const proposal: TradeProposal = {
        trades: [
          {
            instrumentId: 'AAPL',
            direction: 'BUY',
            quantity: 100,
            estimatedPrice: 100,
            estimatedValue: 10000,
          },
        ],
        estimatedPostTradeCash: -5000,
        warnings: [],
        executionTargetMode: 'full_reset',
      };

      expect(() => simulatePostTrade(state, prices, target, policy, proposal)).toThrow(
        'Post-trade simulation produced negative cash',
      );
    });
  });

  describe('Full Rebalance Evaluation Loop (evaluateRebalance)', () => {
    it('executes end-to-end leveraged evaluation and records audit trail', () => {
      const prices: PriceSnapshot = {
        asOf: '2026-10-23T11:00:00Z',
        prices: { AAPL: 100, MSFT: 100 },
      };

      const portfolioState: PortfolioState = {
        accountId: 'leveraged-book-1',
        cash: 20000,
        holdings: [],
      };

      // 150% aggregate target: 90% AAPL, 60% MSFT
      const targetAllocation: TargetAllocation = {
        targets: [
          { instrumentId: 'AAPL', weight: 0.9 },
          { instrumentId: 'MSFT', weight: 0.6 },
        ],
      };

      const policy: RebalancingPolicy = {
        strategyType: 'threshold',
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 10,
        allowLeverage: true,
        maxLeverageRatio: 2.0,
      };

      const evalResult = evaluateRebalance({
        eventId: 'evt-lev-1',
        createdAt: '2026-10-23T11:00:00Z',
        portfolioState,
        targetAllocation,
        priceSnapshot: prices,
        policy,
      });

      expect(evalResult.trigger.isTriggered).toBe(true);
      expect(evalResult.tradeProposal.trades).toHaveLength(2);

      // Buy $18,000 AAPL (180 shares) + $12,000 MSFT (120 shares) = $30,000 total
      const aaplTrade = evalResult.tradeProposal.trades.find((t) => t.instrumentId === 'AAPL');
      const msftTrade = evalResult.tradeProposal.trades.find((t) => t.instrumentId === 'MSFT');

      expect(aaplTrade?.quantity).toBe(180);
      expect(msftTrade?.quantity).toBe(120);
      expect(evalResult.tradeProposal.estimatedPostTradeCash).toBe(-10000); // 20k - 30k = -10k

      // Post trade simulation checks
      expect(evalResult.postTradeSimulation.postTradeState.cash).toBe(-10000);
      expect(evalResult.postTradeSimulation.postTradeValuation.totalPortfolioValue).toBe(20000); // Equity
      expect(evalResult.postTradeSimulation.postTradeValuation.totalHoldingsValue).toBe(30000); // GAV

      // Verify weights: AAPL = 18k / 20k = 0.9 (90%), MSFT = 12k / 20k = 0.6 (60%)
      const aaplWeight = evalResult.postTradeSimulation.postTradeWeights.find((w) => w.instrumentId === 'AAPL');
      const msftWeight = evalResult.postTradeSimulation.postTradeWeights.find((w) => w.instrumentId === 'MSFT');
      expect(aaplWeight?.weight).toBeCloseTo(0.9, 4);
      expect(msftWeight?.weight).toBeCloseTo(0.6, 4);

      // Audit Record
      expect(evalResult.auditRecord.outputs.tradeProposal.estimatedPostTradeCash).toBe(-10000);
    });
  });
});
