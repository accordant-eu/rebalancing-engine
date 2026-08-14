import {
  OpportunisticLossHarvestingOverlay,
  WashSaleLockoutOverlay,
  ExclusionListOverlay,
  HoldingConcentrationCapOverlay,
} from '../src/core/overlays';
import { EvaluationState, ConcentrationLimitIndicator } from '../src/core/quality';
import { evaluateRebalance } from '../src/core/evaluation';
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

  describe('Jurisdiction Matrix & Failure Mode Tests (Issue #92)', () => {
    it('Zero-constraint jurisdiction allows simultaneous buy and loss-harvesting without wash-sale lockout', () => {
      const generativeOverlay = new OpportunisticLossHarvestingOverlay();
      
      // In a zero-constraint jurisdiction, only the generative overlay is configured (no WashSaleLockoutOverlay)
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

      const proposalAfterHarvest = generativeOverlay.apply(proposal, evaluationState, priceSnapshot);
      
      // All trades execute: 1 drift BUY + 1 TLH SELL + 1 TLH BUY
      expect(proposalAfterHarvest.trades.length).toBe(3);
      expect(proposalAfterHarvest.trades.map(t => t.instrumentId)).toEqual(['IVV', 'IVV', 'VOO']);
      expect(proposalAfterHarvest.warnings.some(w => w.code === 'WASH_SALE_LOCKOUT')).toBe(false);
      expect(proposalAfterHarvest.warnings.some(w => w.code === 'TLH_HARVEST_GENERATED')).toBe(true);
    });

    it('Failure Mode: No substitute available in equivalency group or missing substitute price', () => {
      const overlay = new OpportunisticLossHarvestingOverlay();

      // Policy with asset in a group of 1 (no alternate substitute)
      const isolatedPolicy: RebalancingPolicy = {
        ...policy,
        equivalencyGroups: [['IVV']] // No substitute counterpart
      };

      const stateWithoutSubstitute: EvaluationState = {
        ...evaluationState,
        policy: isolatedPolicy
      };

      const proposal: TradeProposal = {
        trades: [],
        estimatedPostTradeCash: 0,
        warnings: [],
        executionTargetMode: 'full_reset'
      };

      const result = overlay.apply(proposal, stateWithoutSubstitute, priceSnapshot);
      // No trades should be generated when substitute is missing
      expect(result.trades.length).toBe(0);

      // Price snapshot missing price for substitute VOO
      const priceSnapshotNoVOO: PriceSnapshot = {
        prices: { 'IVV': 90 }
      };

      const resultMissingPrice = overlay.apply(proposal, evaluationState, priceSnapshotNoVOO);
      expect(resultMissingPrice.trades.length).toBe(0);
    });

    it('Failure Mode: Non-convergence / concentration limit breach after overlay injection is caught by QualityPipeline', () => {
      // Portfolio with IVV holding that has a large loss
      const portfolioState = {
        cash: 100,
        holdings: [
          {
            instrumentId: 'IVV',
            quantity: 10,
            taxLots: [
              { lotId: 'lot1', quantity: 10, unitCost: 100, acquisitionDate: '2026-01-01' }
            ]
          }
        ]
      };

      const prices: PriceSnapshot = {
        prices: { 'IVV': 90, 'VOO': 90 }
      };

      const targetAlloc: TargetAllocation = {
        targets: [{ instrumentId: 'IVV', weight: 1.0 }],
        cashBuffer: 0
      };

      const tlhPolicy: RebalancingPolicy = {
        strategyType: 'manual',
        absoluteDriftTolerance: 0.05,
        tlhLossThresholdBps: 500, // 5% loss -> triggers TLH
        equivalencyGroups: [['IVV', 'VOO']],
        executionOverlays: ['OpportunisticLossHarvestingOverlay']
      };

      // Quality indicator enforcing max 50% concentration per asset
      // The TLH overlay will attempt to allocate 100% of the portfolio into substitute VOO
      const strictConcentrationIndicator = new ConcentrationLimitIndicator(0.50);

      const evaluation = evaluateRebalance({
        eventId: 'test-event-non-convergence',
        createdAt: '2026-08-01T00:00:00Z',
        portfolioState,
        targetAllocation: targetAlloc,
        priceSnapshot: prices,
        policy: tlhPolicy,
        indicators: [strictConcentrationIndicator]
      });

      // Overlay would have generated trades, but QualityIndicator fails due to concentration limit breach
      expect(evaluation.qualityResults).toBeDefined();
      expect(evaluation.qualityResults?.[0].passed).toBe(false);
      expect(evaluation.tradeProposal.trades.length).toBe(0);
      expect(evaluation.tradeProposal.warnings.some(w => w.code === 'QUALITY_CHECK_FAILED')).toBe(true);
    });

    it('Multi-Asset: Resolves first alternate substitute in 3-asset equivalency group', () => {
      const overlay = new OpportunisticLossHarvestingOverlay();
      const multiGroupPolicy: RebalancingPolicy = {
        ...policy,
        equivalencyGroups: [['IVV', 'VOO', 'SPLG']] // 3-asset group
      };

      const multiPriceSnapshot: PriceSnapshot = {
        prices: {
          'IVV': 90,
          'VOO': 90,
          'SPLG': 45
        }
      };

      const multiState: EvaluationState = {
        ...evaluationState,
        policy: multiGroupPolicy
      };

      const proposal: TradeProposal = {
        trades: [],
        estimatedPostTradeCash: 0,
        warnings: [],
        executionTargetMode: 'full_reset'
      };

      const result = overlay.apply(proposal, multiState, multiPriceSnapshot);
      expect(result.trades.length).toBe(2);
      expect(result.trades[0].instrumentId).toBe('IVV');
      expect(result.trades[0].direction).toBe('SELL');
      expect(result.trades[1].instrumentId).toBe('VOO');
      expect(result.trades[1].direction).toBe('BUY');
    });
  });

  describe('ExclusionListOverlay', () => {
    const overlay = new ExclusionListOverlay();

    it('suppresses BUY orders for excluded assets and restores estimated cash', () => {
      const state: EvaluationState = {
        valuation: {
          timestamp: '2026-08-01T00:00:00Z',
          cash: 1000,
          totalPortfolioValue: 10000,
          holdings: [],
        },
        weightResults: [],
        target: { targets: [], cashBuffer: 0 },
        policy: {
          absoluteDriftTolerance: 0.05,
          minimumTradeSize: 10,
          exclusionList: ['EXCLUDED_ESG', 'SANCTIONED_CO'],
        },
        proposedTrades: [],
        estimatedTco: 0,
      };

      const proposal: TradeProposal = {
        trades: [
          {
            instrumentId: 'EXCLUDED_ESG',
            direction: 'BUY',
            quantity: 10,
            estimatedPrice: 100,
            estimatedValue: 1000,
          },
          {
            instrumentId: 'ALLOWED_ASSET',
            direction: 'BUY',
            quantity: 5,
            estimatedPrice: 200,
            estimatedValue: 1000,
          },
        ],
        estimatedPostTradeCash: 0,
        warnings: [],
        executionTargetMode: 'full_reset',
      };

      const result = overlay.apply(proposal, state, { prices: {} });

      expect(result.trades).toHaveLength(1);
      expect(result.trades[0].instrumentId).toBe('ALLOWED_ASSET');
      expect(result.estimatedPostTradeCash).toBe(1000); // 1000 cash restored
      expect(result.warnings.some((w) => w.code === 'TRADE_SUPPRESSED_BY_OVERLAY')).toBe(true);
    });

    it('allows SELL orders (divestment) for excluded assets to proceed', () => {
      const state: EvaluationState = {
        valuation: {
          timestamp: '2026-08-01T00:00:00Z',
          cash: 0,
          totalPortfolioValue: 5000,
          holdings: [{ instrumentId: 'EXCLUDED_ESG', quantity: 50, marketValue: 5000 }],
        },
        weightResults: [],
        target: { targets: [], cashBuffer: 0 },
        policy: {
          absoluteDriftTolerance: 0.05,
          minimumTradeSize: 10,
          exclusionList: ['EXCLUDED_ESG'],
        },
        proposedTrades: [],
        estimatedTco: 0,
      };

      const proposal: TradeProposal = {
        trades: [
          {
            instrumentId: 'EXCLUDED_ESG',
            direction: 'SELL',
            quantity: 50,
            estimatedPrice: 100,
            estimatedValue: 5000,
          },
        ],
        estimatedPostTradeCash: 5000,
        warnings: [],
        executionTargetMode: 'full_reset',
      };

      const result = overlay.apply(proposal, state, { prices: {} });

      expect(result.trades).toHaveLength(1);
      expect(result.trades[0].direction).toBe('SELL');
      expect(result.estimatedPostTradeCash).toBe(5000);
    });
  });

  describe('HoldingConcentrationCapOverlay', () => {
    const overlay = new HoldingConcentrationCapOverlay();

    it('resizes oversized BUY orders down to the maximum concentration ceiling', () => {
      // Total portfolio value = $10,000. Cap = 20% ($2,000 max allowed value).
      // Current holding AAPL = $1,500 (15 shares @ $100).
      // Proposed BUY AAPL = $1,000 (10 shares @ $100) -> Post-trade value would be $2,500 (25% > 20% cap).
      // Resized BUY should be $500 (5 shares @ $100) -> Post-trade value = $2,000 (20% exact cap).
      const state: EvaluationState = {
        valuation: {
          timestamp: '2026-08-01T00:00:00Z',
          cash: 1000,
          totalPortfolioValue: 10000,
          holdings: [{ instrumentId: 'AAPL', quantity: 15, marketValue: 1500 }],
        },
        weightResults: [],
        target: { targets: [], cashBuffer: 0 },
        policy: {
          absoluteDriftTolerance: 0.05,
          minimumTradeSize: 50,
          maxHoldingConcentration: 0.20, // 20% cap
        },
        proposedTrades: [],
        estimatedTco: 0,
      };

      const proposal: TradeProposal = {
        trades: [
          {
            instrumentId: 'AAPL',
            direction: 'BUY',
            quantity: 10,
            estimatedPrice: 100,
            estimatedValue: 1000,
          },
        ],
        estimatedPostTradeCash: 0,
        warnings: [],
        executionTargetMode: 'full_reset',
      };

      const result = overlay.apply(proposal, state, { prices: { AAPL: 100 } });

      expect(result.trades).toHaveLength(1);
      expect(result.trades[0].instrumentId).toBe('AAPL');
      expect(result.trades[0].quantity).toBe(5);
      expect(result.trades[0].estimatedValue).toBe(500);
      expect(result.estimatedPostTradeCash).toBe(500); // $500 unspent cash refunded
      expect(result.warnings.some((w) => w.code === 'TRADE_RESIZED_BY_OVERLAY')).toBe(true);
    });

    it('suppresses BUY orders entirely when holding is already at or above concentration cap', () => {
      // Total portfolio value = $10,000. Cap = 20% ($2,000). Current holding = $2,000 (20%).
      const state: EvaluationState = {
        valuation: {
          timestamp: '2026-08-01T00:00:00Z',
          cash: 1000,
          totalPortfolioValue: 10000,
          holdings: [{ instrumentId: 'AAPL', quantity: 20, marketValue: 2000 }],
        },
        weightResults: [],
        target: { targets: [], cashBuffer: 0 },
        policy: {
          absoluteDriftTolerance: 0.05,
          minimumTradeSize: 50,
          maxHoldingConcentration: 0.20,
        },
        proposedTrades: [],
        estimatedTco: 0,
      };

      const proposal: TradeProposal = {
        trades: [
          {
            instrumentId: 'AAPL',
            direction: 'BUY',
            quantity: 5,
            estimatedPrice: 100,
            estimatedValue: 500,
          },
        ],
        estimatedPostTradeCash: 0,
        warnings: [],
        executionTargetMode: 'full_reset',
      };

      const result = overlay.apply(proposal, state, { prices: { AAPL: 100 } });

      expect(result.trades).toHaveLength(0);
      expect(result.estimatedPostTradeCash).toBe(500); // Full refund
      expect(result.warnings.some((w) => w.code === 'TRADE_SUPPRESSED_BY_OVERLAY')).toBe(true);
    });
  });

  describe('Full Evaluation with Composable Overlays', () => {
    it('evaluates rebalance with exclusion list and concentration cap in evaluateRebalance pipeline', () => {
      const portfolioState = {
        accountId: 'acc-compliance',
        cash: 5000,
        holdings: [
          { instrumentId: 'ALLOWED_A', quantity: 20 }, // $2,000
          { instrumentId: 'EXCLUDED_X', quantity: 30 }, // $3,000
        ],
      };

      const prices: PriceSnapshot = {
        prices: {
          ALLOWED_A: 100,
          EXCLUDED_X: 100,
          ALLOWED_B: 100,
        },
      };

      const targetAlloc: TargetAllocation = {
        targets: [
          { instrumentId: 'ALLOWED_A', weight: 0.40 }, // $4,000 target
          { instrumentId: 'EXCLUDED_X', weight: 0.00 }, // $0 target (divest)
          { instrumentId: 'ALLOWED_B', weight: 0.60 }, // $6,000 target
        ],
        cashBuffer: 0,
      };

      const policy: RebalancingPolicy = {
        strategyType: 'manual',
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 10,
        exclusionList: ['EXCLUDED_X'],
        maxHoldingConcentration: 0.50, // 50% max cap ($5,000 of $10,000 portfolio)
      };

      const evaluation = evaluateRebalance({
        eventId: 'evt-compliance-test',
        createdAt: '2026-08-01T00:00:00Z',
        portfolioState,
        targetAllocation: targetAlloc,
        priceSnapshot: prices,
        policy,
      });

      // Total portfolio value = $10,000.
      // EXCLUDED_X: SELL 30 shares ($3,000) allowed.
      // ALLOWED_A: BUY 20 shares ($2,000) -> post-trade $4,000 (40% <= 50% cap).
      // ALLOWED_B: Target is $6,000 (60%), but concentration cap is 50% ($5,000). BUY is resized to 50 shares ($5,000).
      expect(evaluation.tradeProposal.trades).toHaveLength(3);

      const sellExcluded = evaluation.tradeProposal.trades.find((t) => t.instrumentId === 'EXCLUDED_X');
      expect(sellExcluded?.direction).toBe('SELL');
      expect(sellExcluded?.quantity).toBe(30);

      const buyA = evaluation.tradeProposal.trades.find((t) => t.instrumentId === 'ALLOWED_A');
      expect(buyA?.direction).toBe('BUY');
      expect(buyA?.quantity).toBe(20);

      const buyB = evaluation.tradeProposal.trades.find((t) => t.instrumentId === 'ALLOWED_B');
      expect(buyB?.direction).toBe('BUY');
      expect(buyB?.quantity).toBe(50); // Resized from 60 to 50 to respect 50% cap
      expect(buyB?.estimatedValue).toBe(5000);
    });
  });
});


