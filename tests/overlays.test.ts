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
    timestamp: '2026-08-01T00:00:00Z',
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

  it('OpportunisticLossHarvestingOverlay identifies losses and generates TLH trades', () => {
    const overlay = new OpportunisticLossHarvestingOverlay();
    
    // An empty drift proposal
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
      ]
    });
    expect(newProposal.trades[1]).toEqual({
      instrumentId: 'VOO',
      direction: 'BUY',
      quantity: 10,
      estimatedPrice: 90,
      estimatedValue: 900
    });
    
    expect(evaluationState.temporaryEquivalencyMapping?.get('VOO')).toBe('IVV');
    expect(newProposal.warnings[0].code).toBe('TLH_HARVEST_GENERATED');
  });

  it('OpportunisticLossHarvestingOverlay skips harvesting if no substitute exists', () => {
    const overlay = new OpportunisticLossHarvestingOverlay();
    
    const stateWithoutSubstitutes = {
      ...evaluationState,
      policy: { ...policy, equivalencyGroups: [] }
    };

    const proposal: TradeProposal = {
      trades: [],
      estimatedPostTradeCash: 0,
      warnings: [],
      executionTargetMode: 'full_reset'
    };

    const newProposal = overlay.apply(proposal, stateWithoutSubstitutes, priceSnapshot);
    expect(newProposal.trades.length).toBe(0); // Skipped
  });

  it('WashSaleLockoutOverlay suppresses TLH SELL if a drift BUY exists for the same asset', () => {
    const generativeOverlay = new OpportunisticLossHarvestingOverlay();
    const constraintOverlay = new WashSaleLockoutOverlay();
    
    // Suppose the drift strategy ALREADY generated a BUY for IVV because we deposited cash
    const proposal: TradeProposal = {
      trades: [
        { instrumentId: 'IVV', direction: 'BUY', quantity: 5, estimatedPrice: 90, estimatedValue: 450 }
      ],
      estimatedPostTradeCash: 0,
      warnings: [],
      executionTargetMode: 'full_reset'
    };

    // 1. Generative overlay injects TLH SELL for IVV (at a loss)
    const proposalAfterGenerative = generativeOverlay.apply(proposal, evaluationState, priceSnapshot);
    expect(proposalAfterGenerative.trades.length).toBe(3); // Drift BUY IVV, TLH SELL IVV, TLH BUY VOO

    // 2. Constraint overlay detects the overlap (BUY IVV and SELL IVV at a loss) and suppresses the SELL
    const finalProposal = constraintOverlay.apply(proposalAfterGenerative, evaluationState, priceSnapshot);
    
    expect(finalProposal.trades.length).toBe(2);
    // The TLH SELL should be gone!
    expect(finalProposal.trades.find(t => t.direction === 'SELL' && t.instrumentId === 'IVV')).toBeUndefined();
    // The Drift BUY should remain
    expect(finalProposal.trades.find(t => t.direction === 'BUY' && t.instrumentId === 'IVV')).toBeDefined();
    
    // Warning emitted
    expect(finalProposal.warnings.find(w => w.code === 'WASH_SALE_LOCKOUT')).toBeDefined();
  });
});
