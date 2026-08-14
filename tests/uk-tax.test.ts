import {
  calculateSection104Pool,
  allocateSection104SellLots,
  getCalendarDayDiff,
  isUkBedAndBreakfastWindow,
} from '../src/core/uk-tax';
import { OpportunisticLossHarvestingOverlay, UkBedAndBreakfastOverlay } from '../src/core/overlays';
import { evaluateRebalance } from '../src/core/evaluation';
import { EvaluationState } from '../src/core/quality';
import {
  PortfolioState,
  PriceSnapshot,
  RebalancingPolicy,
  TargetAllocation,
  TaxLot,
  TradeProposal,
  ValuationResult,
} from '../src/models/domain';

describe('UK Capital Gains Tax Rules & Section 104 Pooling', () => {
  const sampleTaxLots: TaxLot[] = [
    { lotId: 'lot-1', quantity: 100, unitCost: 10, acquisitionDate: '2026-01-01' }, // 1000 total
    { lotId: 'lot-2', quantity: 200, unitCost: 20, acquisitionDate: '2026-02-01' }, // 4000 total
    { lotId: 'lot-3', quantity: 100, unitCost: 30, acquisitionDate: '2026-03-01' }, // 3000 total
  ]; // Total quantity: 400, Total cost: 8000 -> Average unit cost: 20

  it('calculateSection104Pool calculates weighted average unit cost across lots', () => {
    const pool = calculateSection104Pool(sampleTaxLots);
    expect(pool.totalQuantity).toBe(400);
    expect(pool.totalCost).toBe(8000);
    expect(pool.averageUnitCost).toBe(20);
  });

  it('calculateSection104Pool handles empty lots or zero quantities gracefully', () => {
    const emptyPool = calculateSection104Pool([]);
    expect(emptyPool.totalQuantity).toBe(0);
    expect(emptyPool.totalCost).toBe(0);
    expect(emptyPool.averageUnitCost).toBe(0);
  });

  it('allocateSection104SellLots applies pooled average unit cost to allocated lots', () => {
    const allocations = allocateSection104SellLots(sampleTaxLots, 150, 25);
    expect(allocations.length).toBe(2);
    expect(allocations[0]).toEqual({
      lotId: 'lot-1',
      quantity: 100,
      estimatedValue: 2500,
      unitCost: 20, // Pooled unit cost, NOT individual lot unit cost of 10
      acquisitionDate: '2026-01-01',
    });
    expect(allocations[1]).toEqual({
      lotId: 'lot-2',
      quantity: 50,
      estimatedValue: 1250,
      unitCost: 20, // Pooled unit cost, NOT individual lot unit cost of 20
      acquisitionDate: '2026-02-01',
    });
  });

  it('allocateSection104SellLots throws if sell quantity exceeds pool quantity', () => {
    expect(() => allocateSection104SellLots(sampleTaxLots, 500, 25)).toThrow(
      'Tax lot quantities are insufficient for Section 104 sell allocation'
    );
  });

  describe('UK Bed-and-Breakfast Matching Utilities', () => {
    it('calculates calendar day differences correctly', () => {
      expect(getCalendarDayDiff('2026-08-01', '2026-08-01')).toBe(0);
      expect(getCalendarDayDiff('2026-08-01', '2026-08-15')).toBe(14);
      expect(getCalendarDayDiff('2026-08-01', '2026-08-31')).toBe(30);
      expect(getCalendarDayDiff('2026-08-01', '2026-09-01')).toBe(31);
    });

    it('identifies statutory 30-day Bed-and-Breakfast window (0 to 30 days)', () => {
      expect(isUkBedAndBreakfastWindow('2026-08-01', '2026-08-01')).toBe(true);
      expect(isUkBedAndBreakfastWindow('2026-08-01', '2026-08-20')).toBe(true);
      expect(isUkBedAndBreakfastWindow('2026-08-01', '2026-08-31')).toBe(true);
      expect(isUkBedAndBreakfastWindow('2026-08-01', '2026-09-02')).toBe(false);
      expect(isUkBedAndBreakfastWindow('2026-08-10', '2026-08-01')).toBe(false); // Prior acquisition
    });
  });

  describe('UkBedAndBreakfastOverlay', () => {
    const policy: RebalancingPolicy = {
      strategyType: 'threshold',
      absoluteDriftTolerance: 0.05,
      minimumTradeSize: 10,
      evaluationDate: '2026-08-15',
      tlhLossThresholdBps: 500, // 5%
      equivalencyGroups: [['VOD.L', 'BT-A.L']],
    };

    const target: TargetAllocation = {
      targets: [{ instrumentId: 'VOD.L', weight: 1.0 }],
      cashBuffer: 0,
    };

    const priceSnapshot: PriceSnapshot = {
      prices: {
        'VOD.L': 80, // Dropped from 100 to 80 (20% loss)
        'BT-A.L': 80,
      },
    };

    const valuation: ValuationResult = {
      timestamp: '2026-08-15T00:00:00Z',
      cash: 0,
      holdings: [
        {
          instrumentId: 'VOD.L',
          quantity: 10,
          price: 80,
          marketValue: 800,
          taxLots: [
            { lotId: 'lot1', quantity: 10, unitCost: 100, acquisitionDate: '2026-01-01' },
          ],
        },
      ],
      totalPortfolioValue: 800,
    };

    const evaluationState: EvaluationState = {
      valuation,
      weightResults: [{ instrumentId: 'VOD.L', weight: 1.0 }],
      target,
      policy,
      proposedTrades: [],
      estimatedTco: 0,
    };

    it('suppresses TLH trades if a non-TLH BUY exists in the same equivalency group', () => {
      const generativeOverlay = new OpportunisticLossHarvestingOverlay();
      const bnbOverlay = new UkBedAndBreakfastOverlay();

      const driftBuyTrade = {
        instrumentId: 'VOD.L',
        direction: 'BUY' as const,
        quantity: 5,
        estimatedPrice: 80,
        estimatedValue: 400,
        metadata: { origin: 'DRIFT_STRATEGY' },
      };

      const proposal: TradeProposal = {
        trades: [driftBuyTrade],
        estimatedPostTradeCash: 0,
        warnings: [],
        executionTargetMode: 'full_reset',
      };

      // 1. Generative overlay creates TLH SELL for VOD.L and BUY for BT-A.L
      const proposalWithTlh = generativeOverlay.apply(proposal, evaluationState, priceSnapshot);
      expect(proposalWithTlh.trades.length).toBe(3);

      // 2. UK B&B Overlay detects overlap and suppresses TLH harvest trades
      const finalProposal = bnbOverlay.apply(proposalWithTlh, evaluationState, priceSnapshot);
      expect(finalProposal.trades.length).toBe(1);
      expect(finalProposal.trades[0]).toEqual(driftBuyTrade);

      const warning = finalProposal.warnings.find(
        (w) => w.code === 'UK_BED_AND_BREAKFAST_LOCKOUT'
      );
      expect(warning).toBeDefined();
      expect(warning?.instrumentId).toBe('VOD.L');
    });

    it('suppresses TLH trades if the asset was acquired within the past 30 days', () => {
      const generativeOverlay = new OpportunisticLossHarvestingOverlay();
      const bnbOverlay = new UkBedAndBreakfastOverlay();

      // Holding acquired 10 days ago (2026-08-05 vs eval date 2026-08-15)
      const recentValuation: ValuationResult = {
        ...valuation,
        holdings: [
          {
            instrumentId: 'VOD.L',
            quantity: 10,
            price: 80,
            marketValue: 800,
            taxLots: [
              { lotId: 'lot1', quantity: 10, unitCost: 100, acquisitionDate: '2026-08-05' },
            ],
          },
        ],
      };

      const recentState: EvaluationState = {
        ...evaluationState,
        valuation: recentValuation,
      };

      const proposal: TradeProposal = {
        trades: [],
        estimatedPostTradeCash: 0,
        warnings: [],
        executionTargetMode: 'full_reset',
      };

      const proposalWithTlh = generativeOverlay.apply(proposal, recentState, priceSnapshot);
      expect(proposalWithTlh.trades.length).toBe(2);

      const finalProposal = bnbOverlay.apply(proposalWithTlh, recentState, priceSnapshot);
      expect(finalProposal.trades.length).toBe(0);

      const warning = finalProposal.warnings.find(
        (w) => w.code === 'UK_BED_AND_BREAKFAST_LOCKOUT'
      );
      expect(warning).toBeDefined();
    });

    it('allows TLH trades when acquisition is older than 30 days and no matching buys occur', () => {
      const generativeOverlay = new OpportunisticLossHarvestingOverlay();
      const bnbOverlay = new UkBedAndBreakfastOverlay();

      const proposal: TradeProposal = {
        trades: [],
        estimatedPostTradeCash: 0,
        warnings: [],
        executionTargetMode: 'full_reset',
      };

      // Acquisition was on 2026-01-01 (>30 days before eval date 2026-08-15)
      const proposalWithTlh = generativeOverlay.apply(proposal, evaluationState, priceSnapshot);
      expect(proposalWithTlh.trades.length).toBe(2);

      const finalProposal = bnbOverlay.apply(proposalWithTlh, evaluationState, priceSnapshot);
      // Trades should NOT be suppressed
      expect(finalProposal.trades.length).toBe(2);
      expect(
        finalProposal.warnings.some((w) => w.code === 'UK_BED_AND_BREAKFAST_LOCKOUT')
      ).toBe(false);
    });
  });

  describe('Full UK Rebalancing Integration via evaluateRebalance', () => {
    it('evaluates UK portfolio rebalance with SECTION_104 sell lot allocation and overlays', () => {
      const portfolioState: PortfolioState = {
        accountId: 'uk-client-1',
        taxJurisdiction: 'UK',
        cash: 100,
        holdings: [
          {
            instrumentId: 'VOD.L',
            quantity: 200,
            taxLots: [
              { lotId: 'lot-a', quantity: 100, unitCost: 100, acquisitionDate: '2025-01-01' },
              { lotId: 'lot-b', quantity: 100, unitCost: 200, acquisitionDate: '2025-06-01' },
            ], // Pool: 200 units @ 150 average cost
          },
        ],
      };

      const prices: PriceSnapshot = {
        prices: {
          'VOD.L': 120,
          'SHEL.L': 50,
        },
      };

      const targetAlloc: TargetAllocation = {
        targets: [
          { instrumentId: 'VOD.L', weight: 0.50 },
          { instrumentId: 'SHEL.L', weight: 0.50 },
        ],
        cashBuffer: 0,
      };

      const ukPolicy: RebalancingPolicy = {
        strategyType: 'threshold',
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 10,
        sellSelectionMode: 'SECTION_104',
        executionOverlays: ['UkBedAndBreakfastOverlay'],
      };

      const evaluation = evaluateRebalance({
        eventId: 'uk-rebalance-test',
        createdAt: '2026-08-15T00:00:00Z',
        portfolioState,
        targetAllocation: targetAlloc,
        priceSnapshot: prices,
        policy: ukPolicy,
      });

      expect(evaluation.trigger.isTriggered).toBe(true);
      const sellTrade = evaluation.tradeProposal.trades.find(
        (t) => t.instrumentId === 'VOD.L' && t.direction === 'SELL'
      );
      expect(sellTrade).toBeDefined();
      expect(sellTrade?.lotAllocations).toBeDefined();
      // Verify all lot allocations reflect the Section 104 pooled average unit cost (150)
      for (const allocation of sellTrade!.lotAllocations!) {
        expect(allocation.unitCost).toBe(150);
      }
    });
  });
});
