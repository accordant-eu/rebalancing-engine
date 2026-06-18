import { TradeProposal, ExecutionContext } from '../src/models/domain';
import { CircuitBreaker } from '../src/orchestrator/circuit-breaker';
import { Executor } from '../src/orchestrator/executor';

class MockExecutor implements Executor {
  public async execute(context: ExecutionContext, brokerAccountId: string, proposal: TradeProposal, eventId: string): Promise<void> {}
}

describe('CircuitBreaker', () => {
  let mockExecutor: MockExecutor;
  let circuitBreaker: CircuitBreaker;

  const dummyContext: ExecutionContext = { tenantId: 'tenant-1', brokerConfig: { brokerType: 'MOCK', brokerApiKey: '', brokerApiSecret: '' } };

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

  it('forwards valid proposals to target executor', async () => {
    await circuitBreaker.execute(dummyContext, 'account-1', createProposal(5000), 'event-1');
    expect(mockExecutor.execute).toHaveBeenCalledTimes(1);
    expect(circuitBreaker.getExecutedCount()).toBe(1);
  });

  it('enforces gross notional limit', async () => {
    await expect(circuitBreaker.execute(dummyContext, 'account-1', createProposal(15000), 'event-1')).rejects.toThrow(/Gross notional value/);
    expect(mockExecutor.execute).not.toHaveBeenCalled();
    expect(circuitBreaker.getExecutedCount()).toBe(0);
  });

  it('enforces max trades per session limit', async () => {
    await circuitBreaker.execute(dummyContext, 'account-1', createProposal(1000), 'event-1');
    await circuitBreaker.execute(dummyContext, 'account-1', createProposal(1000), 'event-2');
    
    expect(circuitBreaker.getExecutedCount()).toBe(2);
    expect(mockExecutor.execute).toHaveBeenCalledTimes(2);

    await expect(circuitBreaker.execute(dummyContext, 'account-1', createProposal(1000), 'event-3')).rejects.toThrow(/Max trades per session/);
    expect(mockExecutor.execute).toHaveBeenCalledTimes(2); // Still 2
    expect(circuitBreaker.getExecutedCount()).toBe(2);
  });

  it('does not increment count for empty proposals', async () => {
    await circuitBreaker.execute(
      dummyContext,
      'account-1',
      {
        trades: [],
        estimatedPostTradeCash: 0,
        warnings: [],
        executionTargetMode: 'full_reset',
      },
      'event-1',
    );
    expect(mockExecutor.execute).not.toHaveBeenCalled();
    expect(circuitBreaker.getExecutedCount()).toBe(0);
  });
});
