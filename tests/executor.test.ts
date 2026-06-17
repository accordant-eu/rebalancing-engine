import { BrokerExecutor } from '../src/orchestrator/executor';
import { BrokerAdapter } from '../src/broker/adapter';
import { TradeProposal, PortfolioState } from '../src/models/domain';
import { logger } from '../src/utils/logger';

class MockAdapter implements BrokerAdapter {
  getPortfolioState(brokerAccountId: string): Promise<PortfolioState> {
    throw new Error('Method not implemented.');
  }
  getPrices(): Promise<Record<string, number>> {
    throw new Error('Method not implemented.');
  }
  submitTrades(brokerAccountId: string): Promise<void> {
    return Promise.resolve();
  }
  hasOpenOrders(brokerAccountId: string): Promise<boolean> {
    return Promise.resolve(false);
  }
}

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
    trades: [{ instrumentId: 'AAPL', direction: 'BUY', quantity: 1, estimatedPrice: 100, estimatedValue: 100 }],
    estimatedPostTradeCash: 0,
    warnings: [],
    executionTargetMode: 'full_reset',
  };

  it('does nothing if proposal has no trades', async () => {
    await executor.execute('account-1',emptyProposal, 'event-1');
    expect(submitSpy).not.toHaveBeenCalled();
    expect(loggerInfoSpy).not.toHaveBeenCalled();
  });

  it('submits trades and logs info to console', async () => {
    await executor.execute('account-1',validProposal, 'event-2');
    expect(submitSpy).toHaveBeenCalledWith('account-1', validProposal);
    expect(loggerInfoSpy).toHaveBeenCalledWith(expect.stringContaining('Submitting 1 trades to broker for account account-1 on event: event-2'));
  });

  it('propagates errors if submission fails', async () => {
    const error = new Error('Broker disconnected');
    submitSpy.mockRejectedValueOnce(error);

    await expect(executor.execute('account-1',validProposal, 'event-3')).rejects.toThrow('Broker disconnected');
  });
});
