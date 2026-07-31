import { CorporateActionService, CorporateActionCircuitBreaker } from '../src/services/corporate-actions';
import { LiveState } from '../src/orchestrator/state';

describe('CorporateActionCircuitBreaker', () => {
  let service: CorporateActionService;
  let circuitBreaker: CorporateActionCircuitBreaker;

  beforeEach(() => {
    service = new CorporateActionService();
    circuitBreaker = new CorporateActionCircuitBreaker(service);
  });

  const baseState: LiveState = {
    portfolioState: {
      accountId: 'acc-1',
      cash: 1000,
      holdings: [
        { instrumentId: 'AAPL', quantity: 10 },
        { instrumentId: 'MSFT', quantity: 5 }
      ]
    },
    targetAllocation: {
      targets: [
        { instrumentId: 'AAPL', weight: 0.5 },
        { instrumentId: 'TSLA', weight: 0.5 }
      ],
      cashBuffer: 0
    },
    priceSnapshot: { prices: {} },
    policy: {
      absoluteDriftTolerance: 0.05,
      minimumTradeSize: 10,
      evaluationDate: '2026-08-01'
    },
    archetype: 'StaticWeights',
    constraints: []
  };

  it('allows execution when there are no corporate actions', () => {
    const result = circuitBreaker.evaluate(baseState);
    expect(result.isValid).toBe(true);
  });

  it('blocks execution when a holding has a corporate action on the evaluation date', () => {
    service.seedMockActions([
      { instrumentId: 'AAPL', exDate: '2026-08-01', type: 'SPLIT' }
    ]);

    const result = circuitBreaker.evaluate(baseState);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Pending Corporate Action (SPLIT) for AAPL on ex-date 2026-08-01');
  });

  it('blocks execution when a target has a corporate action on the evaluation date', () => {
    service.seedMockActions([
      { instrumentId: 'TSLA', exDate: '2026-08-01', type: 'DIVIDEND' }
    ]);

    const result = circuitBreaker.evaluate(baseState);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Pending Corporate Action (DIVIDEND) for target TSLA on ex-date 2026-08-01');
  });

  it('allows execution if the corporate action is for a different date', () => {
    service.seedMockActions([
      { instrumentId: 'AAPL', exDate: '2026-08-02', type: 'SPLIT' }
    ]);

    const result = circuitBreaker.evaluate(baseState);
    expect(result.isValid).toBe(true);
  });
});
