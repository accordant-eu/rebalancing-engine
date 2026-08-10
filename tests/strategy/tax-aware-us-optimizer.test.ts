import { TaxAwareUsTradeGenerator } from '../../src/strategy/optimizers/tax-aware-us-optimizer';
import { TaxAwareUsStrategy } from '../../src/strategy/tax-aware-us';
import { TradeOptimizerContext } from '../../src/core/trade-optimizer';
import { calculateValuation } from '../../src/core/valuation';
import { PortfolioState, RebalancingPolicy, TargetAllocation, PriceSnapshot } from '../../src/models/domain';

describe('TaxAwareUsTradeGenerator & Strategy', () => {
  const portfolioState: PortfolioState = {
    accountId: 'us-acc-1',
    taxJurisdiction: 'US',
    cash: 1000,
    holdings: [
      { instrumentId: 'AAPL', quantity: 10 },
      { instrumentId: 'MSFT', quantity: 5 },
    ],
  };

  const targetAllocation: TargetAllocation = {
    targets: [
      { instrumentId: 'AAPL', weight: 0.5 },
      { instrumentId: 'MSFT', weight: 0.5 },
    ],
  };

  const priceSnapshot: PriceSnapshot = {
    prices: {
      AAPL: 150,
      MSFT: 300,
    },
  };

  const policy: RebalancingPolicy = {
    absoluteDriftTolerance: 0.05,
    minimumTradeSize: 10,
    strategyType: 'tax_aware_us',
    optimizerType: 'tax_aware_us',
  };

  it('allows execution when taxJurisdiction is US', () => {
    const generator = new TaxAwareUsTradeGenerator();
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

    const proposal = generator.generateProposal(context);
    expect(proposal).toBeDefined();
    expect(proposal.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'TAX_AWARE_US_STUB',
        }),
      ])
    );
  });

  it('throws an error if taxJurisdiction is non-US (e.g., DE)', () => {
    const generator = new TaxAwareUsTradeGenerator();
    const deState: PortfolioState = {
      ...portfolioState,
      taxJurisdiction: 'DE',
    };
    const valuation = calculateValuation(deState, priceSnapshot);
    const context: TradeOptimizerContext = {
      valuation,
      weights: [],
      driftMeasurements: [],
      targetAllocation,
      priceSnapshot,
      portfolioState: deState,
      policy,
    };

    expect(() => generator.generateProposal(context)).toThrow(
      'TAX_AWARE_US optimizer is restricted to US tax jurisdictions'
    );
  });

  it('evaluates trigger in TaxAwareUsStrategy correctly for non-US state', () => {
    const strategy = new TaxAwareUsStrategy();
    const deState: PortfolioState = {
      ...portfolioState,
      taxJurisdiction: 'DE',
    };

    const trigger = strategy.evaluateTrigger(deState, [], policy);
    expect(trigger.isTriggered).toBe(false);
    expect(trigger.reason).toContain('TAX_AWARE_US strategy is restricted to US tax jurisdictions');
  });
});
