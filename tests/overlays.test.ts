import { OpportunisticLossHarvestingOverlay, WashSaleLockoutOverlay } from '../src/core/overlays';
import { EvaluationState } from '../src/core/quality';
import { PriceSnapshot, RebalancingPolicy, TargetAllocation, TradeProposal, ValuationResult } from '../src/models/domain';

describe('Execution Overlays (TLH)', () => {
  const policy: RebalancingPolicy = {
    strategyType: 'threshold',
    absoluteDriftTolerance: 0.05,
    minimumTradeSize: 10,
    tlhLossThresholdBps: 500, // 5%
    equivalencyGroups: [['IVV', 'VOO']]
  };

  const target: TargetAllocation = {
    targets: [{ instrumentId: 'IVV', weight: 1.0 }],
    cashBuffer: 0
  };

  const priceSnapshot: PriceSnapshot = {
    asOf: '2026-08-01T00:00:00Z',
    prices: {
      'IVV': 90, // Price dropped from 100 to 90 (10% loss)
      'VOO': 90
    }
  };

  const valuation: ValuationResult = {
    timestamp: '2026-08-01T00:00:00Z',
    cash: 0,
    holdings: [
      {
        instrumentId: 'IVV',
        quantity: 10,
        price: 90,
        marketValue: 900,
        taxLots: [
          { lotId: 'lot1', quantity: 10, unitCost: 100, acquisitionDate: '2026-01-01' }
        ]
      }
    ],
    totalPortfolioValue: 900
  };

  const evaluationState: EvaluationState = {
    valuation,
    weightResults: [{ instrumentId: 'IVV', weight: 1.0 }],
    target,
    policy,
    proposedTrades: [],
    estimatedTco: 0
  };

  it('OpportunisticLossHarvestingOverlay identifies losses and generates TLH trades with metadata', () => {
    const overlay = new OpportunisticLossHarvestingOverlay();
    
    const proposal: TradeProposal = {
      trades: [],
      estimatedPostTradeCash: 0,
      warnings: [],
      executionTargetMode: 'full_reset'
    };

    const newProposal = overlay.apply(proposal, evaluationState, priceSnapshot);

    expect(newProposal.trades.length).toBe(2);
    expect(newProposal.trades[0]).toEqual({
      instrumentId: 'IVV',
      direction: 'SELL',
      quantity: 10,
      estimatedPrice: 90,
      estimatedValue: 900,
      lotAllocations: [
        { lotId: 'lot1', quantity: 10, estimatedValue: 900, unitCost: 100, acquisitionDate: '2026-01-01' }
      ],
      metadata: { origin: 'OpportunisticLossHarvestingOverlay', reason: 'TLH_HARVEST' }
    });
    expect(newProposal.trades[1]).toEqual({
      instrumentId: 'VOO',
      direction: 'BUY',
      quantity: 10,
      estimatedPrice: 90,
      estimatedValue: 900,
      metadata: { origin: 'OpportunisticLossHarvestingOverlay', reason: 'TLH_HARVEST' }
    });
    
    expect(newProposal.temporaryEquivalencyMapping?.get('VOO')).toBe('IVV');
    expect(newProposal.warnings[0].code).toBe('TLH_HARVEST_GENERATED');
    
    // Ensure purity: original proposal is untouched
    expect(proposal.trades.length).toBe(0);
  });

  it('OpportunisticLossHarvestingOverlay ignores NaN, 0, or negative inputs', () => {
    const overlay = new OpportunisticLossHarvestingOverlay();
    
    const badValuation: ValuationResult = {
      ...valuation,
      holdings: [
        {
          instrumentId: 'IVV',
          quantity: 10,
          price: NaN,
          marketValue: 900,
          taxLots: [
            { lotId: 'lot1', quantity: 10, unitCost: -100, acquisitionDate: '2026-01-01' },
            { lotId: 'lot2', quantity: NaN, unitCost: 100, acquisitionDate: '2026-01-01' },
            { lotId: 'lot3', quantity: 10, unitCost: 100, acquisitionDate: '2026-01-01' } // Valid lot, but bad price below
          ]
        }
      ]
    };

    const badPriceSnapshot: PriceSnapshot = {
      prices: { 'IVV': 0, 'VOO': NaN }
    };

    const stateWithBadInputs: EvaluationState = {
      ...evaluationState,
      valuation: badValuation
    };

    const proposal: TradeProposal = { trades: [], estimatedPostTradeCash: 0, warnings: [], executionTargetMode: 'full_reset' };

    const newProposal = overlay.apply(proposal, stateWithBadInputs, badPriceSnapshot);
    expect(newProposal.trades.length).toBe(0); 
  });

  it('WashSaleLockoutOverlay suppresses TLH trades if a drift BUY exists for any asset in the equivalency group', () => {
    const generativeOverlay = new OpportunisticLossHarvestingOverlay();
    const constraintOverlay = new WashSaleLockoutOverlay();
    
    // The drift strategy ALREADY generated a BUY for IVV (tagged as DRIFT_STRATEGY)
    const driftTrade = { 
      instrumentId: 'IVV', 
      direction: 'BUY' as const, 
      quantity: 5, 
      estimatedPrice: 90, 
      estimatedValue: 450,
      metadata: { origin: 'DRIFT_STRATEGY' }
    };
    
    const proposal: TradeProposal = {
      trades: [driftTrade],
      estimatedPostTradeCash: 0,
      warnings: [],
      executionTargetMode: 'full_reset'
    };

    // 1. Generative overlay injects TLH SELL for IVV (at a loss) and BUY for VOO
    const proposalAfterGenerative = generativeOverlay.apply(proposal, evaluationState, priceSnapshot);
    expect(proposalAfterGenerative.trades.length).toBe(3); 

    // 2. Constraint overlay detects the overlap (Drift BUY IVV clashes with TLH SELL IVV/BUY VOO group)
    const finalProposal = constraintOverlay.apply(proposalAfterGenerative, evaluationState, priceSnapshot);
    
    // The TLH SELL and BUY should be gone!
    expect(finalProposal.trades.length).toBe(1);
    
    // The Drift BUY must remain
    expect(finalProposal.trades[0]).toEqual(driftTrade);
    
    // Warning emitted with full auditability
    const warning = finalProposal.warnings.find(w => w.code === 'WASH_SALE_LOCKOUT');
    expect(warning).toBeDefined();
    expect(warning?.instrumentId).toBe('IVV');
    expect(warning?.estimatedValue).toBe(900); // the suppressed TLH sell value
  });
});
