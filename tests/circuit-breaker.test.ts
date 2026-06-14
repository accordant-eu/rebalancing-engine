import { TradeProposal } from '../src/models/domain';
import { CircuitBreaker } from '../src/orchestrator/circuit-breaker';
import { Executor } from '../src/orchestrator/executor';

class MockExecutor implements Executor {
  public execute(): void {}
}

describe('CircuitBreaker', () => {
  let mockExecutor: MockExecutor;
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    mockExecutor = new MockExecutor();
    jest.spyOn(mockExecutor, 'execute');

    circuitBreaker = new CircuitBreaker(mockExecutor, {
      maxTradesPerSession: 2,
      maxGrossNotionalPerTrade: 10000,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createProposal = (value: number): TradeProposal => ({
    trades: [
      {
        instrumentId: 'AAPL',
        direction: 'BUY',
        quantity: 1,
        estimatedPrice: value,
        estimatedValue: value,
      },
    ],
    estimatedPostTradeCash: 0,
    warnings: [],
    executionTargetMode: 'full_reset',
  });

  it('allows valid trades and increments count', () => {
    circuitBreaker.execute(createProposal(5000), 'event-1');
    expect(mockExecutor.execute).toHaveBeenCalledTimes(1);
    expect(circuitBreaker.getExecutedCount()).toBe(1);
  });

  it('blocks trades exceeding gross notional limit', () => {
    expect(() => circuitBreaker.execute(createProposal(15000), 'event-1')).toThrow(/Gross notional value/);
    expect(mockExecutor.execute).not.toHaveBeenCalled();
    expect(circuitBreaker.getExecutedCount()).toBe(0);
  });

  it('blocks trades exceeding session count limit', () => {
    circuitBreaker.execute(createProposal(1000), 'event-1');
    circuitBreaker.execute(createProposal(1000), 'event-2');

    expect(circuitBreaker.getExecutedCount()).toBe(2);
    expect(mockExecutor.execute).toHaveBeenCalledTimes(2);

    expect(() => circuitBreaker.execute(createProposal(1000), 'event-3')).toThrow(/Max trades per session/);
    expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
    expect(circuitBreaker.getExecutedCount()).toBe(2);
  });

  it('ignores empty proposals without incrementing', () => {
    circuitBreaker.execute(
      { trades: [], estimatedPostTradeCash: 0, warnings: [], executionTargetMode: 'full_reset' },
      'event-1',
    );
    expect(mockExecutor.execute).not.toHaveBeenCalled();
    expect(circuitBreaker.getExecutedCount()).toBe(0);
  });
});
