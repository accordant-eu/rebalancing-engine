import { applyCorporateActionToPortfolio, CorporateAction } from '../../src/core/corporate-actions';
import { evaluateRebalance } from '../../src/core/evaluation';
import { PortfolioState, TargetAllocation, PriceSnapshot, RebalancingPolicy } from '../../src/models/domain';
import { CircuitBreaker } from '../../src/orchestrator/circuit-breaker';
import { Executor } from '../../src/orchestrator/executor';
import { systemEventBus } from '../../src/events/bus';

describe('Cross-Feature & Interaction Verification', () => {
  describe('Corporate Action Split -> Downstream TLH Loss Harvesting (§11.1)', () => {
    it('calculates loss thresholds against post-split unit costs and harvests substitute assets', () => {
      // 1. Initial State: 10 shares of IVV acquired at $200 ($2,000 basis), cash: 0
      const initialPortfolio: PortfolioState = {
        accountId: 'acc-tlh-split',
        cash: 0,
        holdings: [
          {
            instrumentId: 'IVV',
            quantity: 10,
            taxLots: [
              {
                lotId: 'lot-ivv-initial',
                quantity: 10,
                unitCost: 200,
                acquisitionDate: '2026-01-15',
              },
            ],
          },
        ],
      };

      // 2. Corporate Action: 2-for-1 forward split on IVV
      const splitAction: CorporateAction = {
        type: 'SPLIT',
        instrumentId: 'IVV',
        ratio: 2.0,
        exDate: '2026-06-01',
      };

      const { updatedPortfolio } = applyCorporateActionToPortfolio(initialPortfolio, splitAction);

      // Verify post-split holding: 20 shares at $100 unit cost ($2,000 basis preserved)
      const ivvHolding = updatedPortfolio.holdings.find((h) => h.instrumentId === 'IVV');
      expect(ivvHolding?.quantity).toBe(20);
      expect(ivvHolding?.taxLots?.[0].quantity).toBe(20);
      expect(ivvHolding?.taxLots?.[0].unitCost).toBe(100);

      // 3. Market Update: IVV drops to $90 (10% loss against the new $100 post-split unit cost)
      const prices: PriceSnapshot = {
        prices: {
          IVV: 90,
          VOO: 90, // Correlated substitute
        },
      };

      const target: TargetAllocation = {
        targets: [{ instrumentId: 'IVV', weight: 1.0 }],
        cashBuffer: 0,
      };

      const tlhPolicy: RebalancingPolicy = {
        strategyType: 'manual',
        absoluteDriftTolerance: 0.05,
        tlhLossThresholdBps: 500, // 5% loss threshold triggers TLH
        equivalencyGroups: [['IVV', 'VOO']],
        executionOverlays: ['OpportunisticLossHarvestingOverlay'],
      };

      // 4. Downstream Evaluation: Run evaluateRebalance
      const evaluation = evaluateRebalance({
        eventId: 'evt-split-tlh-harvest',
        createdAt: '2026-06-02T00:00:00Z',
        portfolioState: updatedPortfolio,
        targetAllocation: target,
        priceSnapshot: prices,
        policy: tlhPolicy,
      });

      // Assert that TLH harvested all 20 post-split shares of IVV into substitute VOO
      expect(evaluation.tradeProposal.trades).toHaveLength(2);
      
      const sellTrade = evaluation.tradeProposal.trades.find((t) => t.direction === 'SELL');
      const buyTrade = evaluation.tradeProposal.trades.find((t) => t.direction === 'BUY');

      expect(sellTrade?.instrumentId).toBe('IVV');
      expect(sellTrade?.quantity).toBe(20);
      expect(sellTrade?.estimatedPrice).toBe(90);
      expect(sellTrade?.estimatedValue).toBe(1800);

      expect(buyTrade?.instrumentId).toBe('VOO');
      expect(buyTrade?.quantity).toBe(20);
      expect(buyTrade?.estimatedPrice).toBe(90);
      expect(buyTrade?.estimatedValue).toBe(1800);
    });
  });

  describe('Model Portfolio Fan-Out -> Circuit Breaker Safety Limits (§11.3)', () => {
    it('halts execution when batched fan-out trade proposals exceed gross notional thresholds', async () => {
      const mockTargetExecutor: jest.Mocked<Executor> = {
        execute: jest.fn().mockResolvedValue(undefined),
      };

      const circuitBreaker = new CircuitBreaker(mockTargetExecutor, {
        maxTradesPerSession: 50,
        maxGrossNotionalPerTrade: 10000, // $10k max notional per evaluation
      });

      const haltListener = jest.fn();
      systemEventBus.on('system_event', haltListener);

      const context = {
        tenantId: 'tenant-fanout',
        brokerConfig: { brokerType: 'ALPACA', brokerApiKey: 'k', brokerApiSecret: 's' },
      };

      // Proposal with $15,000 gross notional (exceeds $10,000 limit)
      const oversizedProposal = {
        trades: [
          {
            instrumentId: 'US0378331005:XNAS:USD',
            direction: 'BUY' as const,
            quantity: 50,
            estimatedPrice: 300,
            estimatedValue: 15000,
          },
        ],
        estimatedPostTradeCash: 0,
        warnings: [],
        executionTargetMode: 'full_reset' as const,
      };

      await expect(
        circuitBreaker.execute(context, 'acc-fanout-1', oversizedProposal, 'evt-fanout-1')
      ).rejects.toThrow('CIRCUIT BREAKER: Gross notional value (15000) exceeds limit (10000)');

      // Ensure target executor was blocked
      expect(mockTargetExecutor.execute).not.toHaveBeenCalled();

      // Ensure systemEventBus emitted circuit breaker halt
      expect(haltListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CIRCUIT_BREAKER_HALT',
          accountId: 'acc-fanout-1',
          tenantId: 'tenant-fanout',
          reason: 'MAX_GROSS_NOTIONAL_PER_TRADE_EXCEEDED',
          grossNotional: 15000,
        })
      );

      systemEventBus.off('system_event', haltListener);
    });
  });
});
