import {
  applyCorporateActionToPortfolio,
  applyCorporateActions,
  CorporateAction,
} from '../../src/core/corporate-actions';
import { PortfolioState } from '../../src/models/domain';
import { SqliteStateManager } from '../../src/orchestrator/sqlite-state';
import { initDb } from '../../src/db/sqlite';

describe('Corporate Actions Processor & Tax Lot Basis Recalculation', () => {
  const initialPortfolio: PortfolioState = {
    accountId: 'acc-corp-1',
    cash: 1000,
    holdings: [
      {
        instrumentId: 'AAPL',
        quantity: 100,
        taxLots: [
          { lotId: 'lot-1', quantity: 60, unitCost: 150, acquisitionDate: '2025-01-01' }, // Basis: 9000
          { lotId: 'lot-2', quantity: 40, unitCost: 200, acquisitionDate: '2025-06-01' }, // Basis: 8000
        ], // Total AAPL basis: 17000
      },
      {
        instrumentId: 'MSFT',
        quantity: 50,
        taxLots: [
          { lotId: 'lot-3', quantity: 50, unitCost: 300, acquisitionDate: '2025-03-01' }, // Basis: 15000
        ],
      },
    ],
  };

  describe('Stock Splits (Forward & Reverse)', () => {
    it('applies a 2-for-1 forward stock split with exact basis preservation', () => {
      const splitAction: CorporateAction = {
        type: 'SPLIT',
        instrumentId: 'AAPL',
        exDate: '2026-08-15',
        ratio: 2,
      };

      const { updatedPortfolio, log } = applyCorporateActionToPortfolio(initialPortfolio, splitAction);

      const aapl = updatedPortfolio.holdings.find(h => h.instrumentId === 'AAPL');
      expect(aapl).toBeDefined();
      expect(aapl?.quantity).toBe(200); // 100 * 2
      expect(aapl?.taxLots?.length).toBe(2);

      // Verify Lot 1: 60 -> 120 qty, 150 -> 75 cost
      expect(aapl?.taxLots?.[0]).toEqual({
        lotId: 'lot-1',
        quantity: 120,
        unitCost: 75,
        acquisitionDate: '2025-01-01',
      });
      // 120 * 75 = 9000 (Basis preserved!)
      expect(aapl!.taxLots![0].quantity * aapl!.taxLots![0].unitCost!).toBe(9000);

      // Verify Lot 2: 40 -> 80 qty, 200 -> 100 cost
      expect(aapl?.taxLots?.[1]).toEqual({
        lotId: 'lot-2',
        quantity: 80,
        unitCost: 100,
        acquisitionDate: '2025-06-01',
      });
      // 80 * 100 = 8000 (Basis preserved!)
      expect(aapl!.taxLots![1].quantity * aapl!.taxLots![1].unitCost!).toBe(8000);

      expect(log).toContain('Applied 2:1 split on AAPL: quantity adjusted from 100 to 200');
    });

    it('applies a 1-for-4 reverse stock split with exact basis preservation', () => {
      const reverseSplitAction: CorporateAction = {
        type: 'SPLIT',
        instrumentId: 'AAPL',
        exDate: '2026-08-15',
        ratio: 0.25,
      };

      const { updatedPortfolio } = applyCorporateActionToPortfolio(initialPortfolio, reverseSplitAction);

      const aapl = updatedPortfolio.holdings.find(h => h.instrumentId === 'AAPL');
      expect(aapl?.quantity).toBe(25); // 100 * 0.25

      // Lot 1: 60 * 0.25 = 15, unitCost: 150 / 0.25 = 600
      expect(aapl?.taxLots?.[0].quantity).toBe(15);
      expect(aapl?.taxLots?.[0].unitCost).toBe(600);
      expect(aapl!.taxLots![0].quantity * aapl!.taxLots![0].unitCost!).toBe(9000);

      // Lot 2: 40 * 0.25 = 10, unitCost: 200 / 0.25 = 800
      expect(aapl?.taxLots?.[1].quantity).toBe(10);
      expect(aapl?.taxLots?.[1].unitCost).toBe(800);
      expect(aapl!.taxLots![1].quantity * aapl!.taxLots![1].unitCost!).toBe(8000);
    });

    it('handles fractional sub-cent share quantities in reverse splits with 8-decimal precision', () => {
      const fractionalReverseSplit: CorporateAction = {
        type: 'SPLIT',
        instrumentId: 'AAPL',
        exDate: '2026-08-15',
        ratio: 1 / 3, // 1-for-3 reverse split
      };

      const { updatedPortfolio } = applyCorporateActionToPortfolio(initialPortfolio, fractionalReverseSplit);
      const aapl = updatedPortfolio.holdings.find(h => h.instrumentId === 'AAPL');
      
      // 100 * (1/3) = 33.33333333
      expect(aapl?.quantity).toBeCloseTo(33.33333333, 8);
      // Lot 1: 60 * (1/3) = 20 qty, 150 / (1/3) = 450 cost -> Basis 9000 preserved
      expect(aapl?.taxLots?.[0].quantity).toBe(20);
      expect(aapl?.taxLots?.[0].unitCost).toBe(450);
      expect(aapl!.taxLots![0].quantity * aapl!.taxLots![0].unitCost!).toBe(9000);

      // Lot 2: 40 * (1/3) = 13.33333333 qty, 200 / (1/3) = 600 cost -> Basis 8000 preserved
      expect(aapl?.taxLots?.[1].quantity).toBeCloseTo(13.33333333, 8);
      expect(aapl?.taxLots?.[1].unitCost).toBe(600);
      expect(aapl!.taxLots![1].quantity * aapl!.taxLots![1].unitCost!).toBeCloseTo(8000, 4);
    });

    it('throws when split ratio is invalid (zero or negative)', () => {
      expect(() =>
        applyCorporateActionToPortfolio(initialPortfolio, {
          type: 'SPLIT',
          instrumentId: 'AAPL',
          exDate: '2026-08-15',
          ratio: -1,
        })
      ).toThrow('Invalid split ratio: -1');
    });
  });

  describe('Cash Dividends', () => {
    it('distributes cash dividends and appends settled cash flows', () => {
      const dividendAction: CorporateAction = {
        type: 'CASH_DIVIDEND',
        instrumentId: 'MSFT',
        exDate: '2026-08-15',
        amountPerShare: 2.5,
        payDate: '2026-08-20',
      };

      const { updatedPortfolio, log } = applyCorporateActionToPortfolio(initialPortfolio, dividendAction);

      // 50 shares * $2.50 = $125 dividend
      expect(updatedPortfolio.cash).toBe(1125); // 1000 + 125
      expect(updatedPortfolio.cashFlows?.length).toBe(1);
      expect(updatedPortfolio.cashFlows?.[0]).toEqual({
        cashFlowId: 'div-MSFT-2026-08-15',
        direction: 'DEPOSIT',
        status: 'SETTLED',
        amount: 125,
        effectiveDate: '2026-08-20',
        description: 'Cash Dividend: MSFT ($2.5/sh on 50 shs)',
      });

      expect(log).toContain('Distributed $125 dividend for MSFT on 50 shares');
    });
  });

  describe('Mergers & Conversions', () => {
    it('converts holding and tax lots to target instrument with cash in lieu', () => {
      const mergerAction: CorporateAction = {
        type: 'MERGER',
        instrumentId: 'AAPL',
        targetInstrumentId: 'NEW_CO',
        conversionRatio: 1.5,
        cashInLieuPerShare: 10,
        exDate: '2026-08-15',
      };

      const { updatedPortfolio, log } = applyCorporateActionToPortfolio(initialPortfolio, mergerAction);

      // Old AAPL holding should be gone
      expect(updatedPortfolio.holdings.find(h => h.instrumentId === 'AAPL')).toBeUndefined();

      // New NEW_CO holding should exist with 100 * 1.5 = 150 shares
      const newCo = updatedPortfolio.holdings.find(h => h.instrumentId === 'NEW_CO');
      expect(newCo).toBeDefined();
      expect(newCo?.quantity).toBe(150);

      // Verify converted tax lots:
      // Lot 1: 60 * 1.5 = 90 qty, unitCost: 150 / 1.5 = 100
      expect(newCo?.taxLots?.[0]).toEqual({
        lotId: 'lot-1',
        quantity: 90,
        unitCost: 100,
        acquisitionDate: '2025-01-01',
      });
      expect(newCo!.taxLots![0].quantity * newCo!.taxLots![0].unitCost!).toBe(9000);

      // Cash in lieu: 100 shares * $10 = $1000
      expect(updatedPortfolio.cash).toBe(2000); // 1000 + 1000
      expect(log).toContain('Applied merger of AAPL into NEW_CO (150 shares, $1000 cash in lieu)');
    });
  });

  describe('Batch applyCorporateActions', () => {
    it('applies multiple actions filtered by evaluation date', () => {
      const actions: CorporateAction[] = [
        { type: 'SPLIT', instrumentId: 'AAPL', ratio: 2, exDate: '2026-08-15' },
        { type: 'DIVIDEND', instrumentId: 'MSFT', amountPerShare: 2, exDate: '2026-08-15' },
        { type: 'SPLIT', instrumentId: 'MSFT', ratio: 3, exDate: '2026-08-20' }, // Future action
      ];

      const result = applyCorporateActions(initialPortfolio, actions, '2026-08-15');

      expect(result.appliedActions.length).toBe(2);
      expect(result.cashAdjustment).toBe(100); // 50 shs * $2
      expect(result.portfolioState.holdings.find(h => h.instrumentId === 'AAPL')?.quantity).toBe(200);
      expect(result.portfolioState.holdings.find(h => h.instrumentId === 'MSFT')?.quantity).toBe(50); // Unchanged because 2026-08-20 action was ignored
    });
  });

  describe('SQLite State Manager Integration', () => {
    it('persists adjusted holdings and tax lots atomically into SQLite database', () => {
      initDb(':memory:');
      const stateManager = new SqliteStateManager();

      stateManager.registerPortfolio('acc-corp-1', {
        portfolioState: initialPortfolio,
        priceSnapshot: { prices: { AAPL: 150, MSFT: 300 } },
        targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 0.5 }, { instrumentId: 'MSFT', weight: 0.5 }] },
        policy: { absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
        archetype: 'StaticWeights',
      });

      // Apply 2:1 split via StateManager
      const splitAction: CorporateAction = {
        type: 'SPLIT',
        instrumentId: 'AAPL',
        exDate: '2026-08-15',
        ratio: 2,
      };

      const { affectedAccounts, logs } = stateManager.applyCorporateAction(splitAction);
      expect(affectedAccounts).toEqual(['acc-corp-1']);
      expect(logs.length).toBe(1);

      // Reload state from database
      const loadedState = stateManager.getAccountState('acc-corp-1');
      const loadedAapl = loadedState.portfolioState.holdings.find(h => h.instrumentId === 'AAPL');
      expect(loadedAapl?.quantity).toBe(200);
      expect(loadedAapl?.taxLots?.length).toBe(2);
      expect(loadedAapl?.taxLots?.[0].quantity).toBe(120);
      expect(loadedAapl?.taxLots?.[0].unitCost).toBe(75);
    });
  });
});
