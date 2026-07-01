import { BrokerExecutor } from '../src/orchestrator/executor';
import { BrokerAdapter } from '../src/broker/adapter';
import { TradeProposal, PortfolioState, ExecutionContext } from '../src/models/domain';
import { logger } from '../src/utils/logger';

class MockAdapter implements BrokerAdapter {
  submitted: boolean = false;
  getPortfolioState(context: ExecutionContext, brokerAccountId: string): Promise<PortfolioState> {
    throw new Error('Method not implemented.');
  }
  getPrices(context: ExecutionContext): Promise<Record<string, number>> {
    throw new Error('Method not implemented.');
  }
  submitTrades(context: ExecutionContext, brokerAccountId: string, proposal: TradeProposal): Promise<any[]> {
    this.submitted = true;
    return Promise.resolve([]);
  }
  hasOpenOrders(context: ExecutionContext, brokerAccountId: string): Promise<boolean> {
    return Promise.resolve(false);
  }
}

const dummyContext: ExecutionContext = { tenantId: 'tenant-1', brokerConfig: { brokerType: 'MOCK', brokerApiKey: '', brokerApiSecret: '' } };

describe('BrokerExecutor', () => {
  let mockAdapter: MockAdapter;
  let executor: BrokerExecutor;
  let submitSpy: jest.SpyInstance;
  let loggerInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    mockAdapter = new MockAdapter();
    executor = new BrokerExecutor(mockAdapter);
    submitSpy = jest.spyOn(mockAdapter, 'submitTrades');
    loggerInfoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const emptyProposal: TradeProposal = {
    trades: [],
    estimatedPostTradeCash: 0,
    warnings: [],
    executionTargetMode: 'full_reset',
  };

  const validProposal: TradeProposal = {
    trades: [{ instrumentId: 'US0378331005:XNAS:USD', direction: 'BUY', quantity: 1, estimatedPrice: 100, estimatedValue: 100 }],
    estimatedPostTradeCash: 0,
    warnings: [],
    executionTargetMode: 'full_reset',
  };

  it('does nothing if proposal has no trades', async () => {
    await executor.execute(dummyContext, 'account-1', emptyProposal, 'event-1');
    expect(submitSpy).not.toHaveBeenCalled();
    expect(loggerInfoSpy).not.toHaveBeenCalled();
  });

  it('submits trades and logs info to console', async () => {
    await executor.execute(dummyContext, 'account-1', validProposal, 'event-2');
    expect(submitSpy).toHaveBeenCalledWith(dummyContext, 'account-1', validProposal);
    expect(loggerInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[BrokerExecutor] Submitting 1 trades to broker for account account-1 on event: event-2')
    );
  });

  it('propagates errors from the adapter', async () => {
    submitSpy.mockRejectedValueOnce(new Error('Broker disconnected'));
    await expect(executor.execute(dummyContext, 'account-1', validProposal, 'event-3')).rejects.toThrow('Broker disconnected');
  });
});
