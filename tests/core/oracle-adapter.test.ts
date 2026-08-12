import { OracleTaxOptimizerAdapter } from '../../src/core/oracle-adapter';
import { OracleMockServer } from '../../src/core/oracle-mock';
import { TradeOptimizerContext } from '../../src/core/trade-optimizer';
import { calculateValuation } from '../../src/core/valuation';
import { PortfolioState, RebalancingPolicy, TargetAllocation, PriceSnapshot } from '../../src/models/domain';

describe('OracleTaxOptimizerAdapter', () => {
  const portfolioState: PortfolioState = {
    accountId: 'us-acc-1',
    taxJurisdiction: 'US',
    cash: 1000,
    holdings: [
      {
        instrumentId: 'AAPL',
        quantity: 10,
        taxLots: [
          { lotId: 'lot_a1', quantity: 5, unitCost: 200, acquisitionDate: '2024-01-01' },
          { lotId: 'lot_a2', quantity: 5, unitCost: 100, acquisitionDate: '2024-02-01' },
        ],
      },
    ],
  };

  const targetAllocation: TargetAllocation = {
    targets: [{ instrumentId: 'AAPL', weight: 1.0 }],
  };

  const priceSnapshot: PriceSnapshot = {
    prices: { AAPL: 150 },
  };

  const policy: RebalancingPolicy = {
    absoluteDriftTolerance: 0.05,
    minimumTradeSize: 10,
    strategyType: 'tax_aware_us',
    optimizerType: 'tax_aware_us',
  };

  it('builds Oracle optimization payload correctly', () => {
    const adapter = new OracleTaxOptimizerAdapter();
    const valuation = calculateValuation(portfolioState, priceSnapshot);
    const context: TradeOptimizerContext = {
      valuation,
      weights: [],
      driftMeasurements: [],
      targetAllocation,
      priceSnapshot,
      portfolioState,
      policy,
    };

    const payload = adapter.buildPayload(context);
    expect(payload.targets).toHaveLength(1);
    expect(payload.targets[0].asset_class).toBe('AAPL');
    expect(payload.tax_lots).toHaveLength(2);
    expect(payload.tax_lots[0].tax_lot_id).toBe('lot_a1');
    expect(payload.tax_lots[0].cost_basis).toBe(200);
  });

  it('handles mock server response cleanly', () => {
    const valuation = calculateValuation(portfolioState, priceSnapshot);
    const context: TradeOptimizerContext = {
      valuation,
      weights: [],
      driftMeasurements: [],
      targetAllocation,
      priceSnapshot,
      portfolioState,
      policy,
    };

    const adapter = new OracleTaxOptimizerAdapter();
    const payload = adapter.buildPayload(context);
    const mockResponse = OracleMockServer.handleOptimizationRequest(payload);

    expect(mockResponse.status).toBe('success');
    expect(mockResponse.trades).toHaveLength(1);
    expect(mockResponse.trades[0].lot_id).toBe('lot_a1');
    expect(mockResponse.metrics?.estimated_realized_loss).toBe(250);
  });

  it('falls back to standard rule-based engine when service is unreachable', async () => {
    // Points to invalid port to force fetch connection failure
    const adapter = new OracleTaxOptimizerAdapter({
      serviceUrl: 'http://localhost:59999/invalid-oracle-service',
      timeoutMs: 500,
    });

    const valuation = calculateValuation(portfolioState, priceSnapshot);
    const context: TradeOptimizerContext = {
      valuation,
      weights: [],
      driftMeasurements: [],
      targetAllocation,
      priceSnapshot,
      portfolioState,
      policy,
    };

    const proposal = await adapter.generateProposal(context);
    expect(proposal).toBeDefined();
    expect(proposal.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'TAX_OPTIMIZER_UNREACHABLE_FALLBACK',
        }),
      ])
    );
  });
});
