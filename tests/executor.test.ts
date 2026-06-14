import { BrokerExecutor } from '../src/orchestrator/executor';
import { BrokerAdapter } from '../src/broker/adapter';
import { TradeProposal, PortfolioState } from '../src/models/domain';

class MockAdapter implements BrokerAdapter {
  getPortfolioState(): Promise<PortfolioState> {
    throw new Error('Method not implemented.');
  }
  getPrices(): Promise<Record<string, number>> {
    throw new Error('Method not implemented.');
  }
  submitTrades(): Promise<void> {
    return Promise.resolve();
  }
  hasOpenOrders(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

describe('BrokerExecutor', () => {
  let mockAdapter: MockAdapter;
  let executor: BrokerExecutor;
  let submitSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockAdapter = new MockAdapter();
    executor = new BrokerExecutor(mockAdapter);
    submitSpy = jest.spyOn(mockAdapter, 'submitTrades');
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
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

  it('does nothing if proposal has no trades', () => {
    executor.execute(emptyProposal, 'event-1');
    expect(submitSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('submits trades and logs info to console', () => {
    executor.execute(validProposal, 'event-2');
    expect(submitSpy).toHaveBeenCalledWith(validProposal);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Submitting 1 trades to broker for event: event-2'));
  });

  it('catches and logs errors asynchronously during submission', async () => {
    const error = new Error('Broker disconnected');
    submitSpy.mockRejectedValueOnce(error);

    executor.execute(validProposal, 'event-3');
    
    // Allow the promise chain to settle
    await new Promise(process.nextTick);

    expect(consoleErrorSpy).toHaveBeenCalledWith('[BrokerExecutor] CRITICAL ERROR SUBMITTING TRADES:', error);
  });
});
