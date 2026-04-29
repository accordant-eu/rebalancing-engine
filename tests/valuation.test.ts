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
    expect(weights.find((w) => w.instrumentId === 'AAPL')?.weight).toBe(0.5);
    expect(weights.find((w) => w.instrumentId === 'MSFT')?.weight).toBe(0.5);
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
    // AAPL: 5000 / 15000 = 0.3333...
    const aaplWeight = weights.find((w) => w.instrumentId === 'AAPL')?.weight;
    expect(aaplWeight).toBeCloseTo(0.3333, 4);
  });

  it('throws an error when a price is missing', () => {
    const scenario = scenariosData.scenarios.find((s: any) => s.id === 'missing_price');
    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;

    expect(() => calculateValuation(state, prices)).toThrow('Missing price for instrument: MSFT');
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
      holdings: [{ instrumentId: 'AAPL', quantity: 0 }],
    };
    const prices: PriceSnapshot = { prices: { AAPL: 150 } };

    const valuation = calculateValuation(zeroState, prices);
    expect(valuation.totalPortfolioValue).toBe(0);

    const weights = calculateCurrentWeights(valuation);
    expect(weights[0].weight).toBe(0);
  });
});
