import * as fs from 'fs';
import * as path from 'path';
import { calculateValuation, calculateCurrentWeights } from '../src/core/valuation';
import { PortfolioState, PriceSnapshot } from '../src/models/domain';

const scenariosPath = path.join(__dirname, 'fixtures', 'scenarios.json');
const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));

describe('Valuation and Weight Calculation', () => {
  it('calculates valuation and weights correctly for on-target scenario', () => {
    const scenario = scenariosData.scenarios.find((s: any) => s.id === 'on_target');
    expect(scenario).toBeDefined();

    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;

    const valuation = calculateValuation(state, prices);
    expect(valuation.totalHoldingsValue).toBe(30000); // 100 * 150 + 100 * 150
    expect(valuation.cash).toBe(0);
    expect(valuation.totalPortfolioValue).toBe(30000);

    const weights = calculateCurrentWeights(valuation);
    expect(weights.length).toBe(2);
    expect(weights.find((w) => w.instrumentId === 'US0378331005:XNAS:USD')?.weight).toBe(0.5);
    expect(weights.find((w) => w.instrumentId === 'US5949181045:XNAS:USD')?.weight).toBe(0.5);
  });

  it('calculates valuation and weights correctly for positive cash scenario', () => {
    const scenario = scenariosData.scenarios.find((s: any) => s.id === 'positive_cash');
    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;

    const valuation = calculateValuation(state, prices);
    expect(valuation.totalHoldingsValue).toBe(10000); // 50 * 100 + 50 * 100
    expect(valuation.cash).toBe(5000);
    expect(valuation.totalPortfolioValue).toBe(15000);

    const weights = calculateCurrentWeights(valuation);
    // Weights are calculated relative to total portfolio value (15000)
    // 'US0378331005:XNAS:USD': 5000 / 15000 = 0.3333...
    const aaplWeight = weights.find((w) => w.instrumentId === 'US0378331005:XNAS:USD')?.weight;
    expect(aaplWeight).toBeCloseTo(0.3333, 4);
  });

  it('throws an error when a price is missing', () => {
    const scenario = scenariosData.scenarios.find((s: any) => s.id === 'missing_price');
    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;

    expect(() => calculateValuation(state, prices)).toThrow('Missing price for instrument: US5949181045:XNAS:USD');
  });

  it('handles empty portfolio gracefully', () => {
    const emptyState: PortfolioState = {
      accountId: 'empty-1',
      cash: 0,
      holdings: [],
    };
    const prices: PriceSnapshot = { prices: {} };

    const valuation = calculateValuation(emptyState, prices);
    expect(valuation.totalPortfolioValue).toBe(0);

    const weights = calculateCurrentWeights(valuation);
    expect(weights.length).toBe(0);
  });

  it('handles zero portfolio value when calculating weights', () => {
    const zeroState: PortfolioState = {
      accountId: 'zero-1',
      cash: 0,
      holdings: [{ instrumentId: 'US0378331005:XNAS:USD', quantity: 0 }],
    };
    const prices: PriceSnapshot = { prices: { 'US0378331005:XNAS:USD': 150 } };

    const valuation = calculateValuation(zeroState, prices);
    expect(valuation.totalPortfolioValue).toBe(0);

    const weights = calculateCurrentWeights(valuation);
    expect(weights[0].weight).toBe(0);
  });

  it('applies settled cash flows before valuation and excludes pending flows', () => {
    const state: PortfolioState = {
      accountId: 'cash-flow-valuation-1',
      cash: 100,
      holdings: [{ instrumentId: 'US0378331005:XNAS:USD', quantity: 10 }],
      cashFlows: [
        {
          cashFlowId: 'deposit-1',
          direction: 'DEPOSIT',
          status: 'SETTLED',
          amount: 500,
        },
        {
          cashFlowId: 'withdrawal-1',
          direction: 'WITHDRAWAL',
          status: 'SETTLED',
          amount: 200,
        },
        {
          cashFlowId: 'pending-deposit-1',
          direction: 'DEPOSIT',
          status: 'PENDING',
          amount: 1000,
        },
      ],
    };
    const prices: PriceSnapshot = { prices: { 'US0378331005:XNAS:USD': 100 } };

    const valuation = calculateValuation(state, prices);

    expect(valuation.cash).toBe(400);
    expect(valuation.totalHoldingsValue).toBe(1000);
    expect(valuation.totalPortfolioValue).toBe(1400);
    expect(valuation.cashFlowSummary).toEqual({
      startingCash: 100,
      settledDeposits: 500,
      settledWithdrawals: 200,
      pendingDeposits: 1000,
      pendingWithdrawals: 0,
      netSettledCashFlow: 300,
      netPendingCashFlow: 1000,
      availableCash: 400,
      settledCashFlowCount: 2,
      pendingCashFlowCount: 1,
      hasPendingCashFlows: true,
      hasSettledWithdrawalDeficit: false,
    });
  });

  it('allows settled withdrawals to create an explicit cash deficit', () => {
    const state: PortfolioState = {
      accountId: 'cash-flow-valuation-2',
      cash: 100,
      holdings: [{ instrumentId: 'US0378331005:XNAS:USD', quantity: 10 }],
      cashFlows: [
        {
          cashFlowId: 'withdrawal-1',
          direction: 'WITHDRAWAL',
          status: 'SETTLED',
          amount: 300,
        },
      ],
    };
    const prices: PriceSnapshot = { prices: { 'US0378331005:XNAS:USD': 100 } };

    const valuation = calculateValuation(state, prices);

    expect(valuation.cash).toBe(-200);
    expect(valuation.totalPortfolioValue).toBe(800);
    expect(valuation.cashFlowSummary?.hasSettledWithdrawalDeficit).toBe(true);
  });

  it('rejects invalid cash-flow amounts', () => {
    const state: PortfolioState = {
      accountId: 'cash-flow-invalid-1',
      cash: 0,
      holdings: [],
      cashFlows: [
        {
          cashFlowId: 'invalid-amount',
          direction: 'DEPOSIT',
          status: 'SETTLED',
          amount: 0,
        },
      ],
    };

    expect(() => calculateValuation(state, { prices: {} })).toThrow(
      'Cash flow amount must be positive: invalid-amount',
    );
  });

  it('rejects cash flows that exceed total portfolio value', () => {
    const state: PortfolioState = {
      accountId: 'cash-flow-invalid-2',
      cash: 0,
      holdings: [{ instrumentId: 'US0378331005:XNAS:USD', quantity: 1 }],
      cashFlows: [
        {
          cashFlowId: 'too-large-withdrawal',
          direction: 'WITHDRAWAL',
          status: 'SETTLED',
          amount: 200,
        },
      ],
    };

    expect(() => calculateValuation(state, { prices: { 'US0378331005:XNAS:USD': 100 } })).toThrow(
      'Cash flows exceed total portfolio value',
    );
  });

  it('accepts holdings with tax lots that aggregate to holding quantity', () => {
    const state: PortfolioState = {
      accountId: 'tax-lot-valid-1',
      cash: 0,
      holdings: [
        {
          instrumentId: 'US0378331005:XNAS:USD',
          quantity: 10,
          taxLots: [
            { lotId: 'lot-1', quantity: 4, acquisitionDate: '2024-01-01', unitCost: 90 },
            { lotId: 'lot-2', quantity: 6, acquisitionDate: '2025-01-01', unitCost: 110 },
          ],
        },
      ],
    };

    const valuation = calculateValuation(state, { prices: { 'US0378331005:XNAS:USD': 100 } });

    expect(valuation.totalHoldingsValue).toBe(1000);
  });

  it('rejects tax lots that do not aggregate to holding quantity', () => {
    const state: PortfolioState = {
      accountId: 'tax-lot-invalid-1',
      cash: 0,
      holdings: [
        {
          instrumentId: 'US0378331005:XNAS:USD',
          quantity: 10,
          taxLots: [
            { lotId: 'lot-1', quantity: 4 },
            { lotId: 'lot-2', quantity: 5 },
          ],
        },
      ],
    };

    expect(() => calculateValuation(state, { prices: { 'US0378331005:XNAS:USD': 100 } })).toThrow(
      'Tax lot quantities do not sum to holding quantity for instrument: US0378331005:XNAS:USD',
    );
  });
});
