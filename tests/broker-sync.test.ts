import { BrokerSyncService } from '../src/broker/sync';
import { AlpacaBrokerAdapter } from '../src/broker/alpaca-broker';
import { LiveStateManager } from '../src/orchestrator/state';
import { Orchestrator } from '../src/orchestrator/loop';

jest.mock('../src/broker/alpaca-broker');

describe('BrokerSyncService', () => {
  let stateManager: jest.Mocked<LiveStateManager>;
  let orchestrator: jest.Mocked<Orchestrator>;
  let syncService: BrokerSyncService;
  let mockGetPrices: jest.Mock;
  let mockGetOrderStatus: jest.Mock;
  let mockGetPortfolioState: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetPrices = jest.fn();
    mockGetOrderStatus = jest.fn();
    mockGetPortfolioState = jest.fn();

    (AlpacaBrokerAdapter as jest.Mock).mockImplementation(() => ({
      getPrices: mockGetPrices,
      getOrderStatus: mockGetOrderStatus,
      getPortfolioState: mockGetPortfolioState,
    }));

    stateManager = {
      getAllAccountIds: jest.fn(),
      getAccountState: jest.fn(),
      getTenantBrokerConfig: jest.fn(),
      updateGlobalPrices: jest.fn(),
      updatePortfolio: jest.fn(),
      getPendingOrders: jest.fn(),
      processExecutionReport: jest.fn(),
      getBrokerSymbol: jest.fn(),
      getInstrumentId: jest.fn(),
    } as any;

    orchestrator = {
      onTick: jest.fn(),
    } as any;

    syncService = new BrokerSyncService(stateManager, orchestrator);
  });

  afterEach(() => {
    syncService.stop();
  });

  it('starts and stops background polling interval cleanly', async () => {
    jest.useFakeTimers();
    const syncSpy = jest.spyOn(syncService, 'sync').mockImplementation(async () => {});

    syncService.start(1000);
    expect(syncSpy).toHaveBeenCalledTimes(1); // initial sync
    await Promise.resolve(); // flush initial runSync microtask

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(syncSpy).toHaveBeenCalledTimes(2);

    syncService.stop();
    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    expect(syncSpy).toHaveBeenCalledTimes(2); // no more calls

    jest.useRealTimers();
  });

  it('syncs prices, pending orders, and portfolio state across tenants with Alpaca config', async () => {
    stateManager.getAllAccountIds.mockReturnValue(['acc-1', 'acc-2']);
    
    // Account 1 on tenant-1 (Alpaca)
    stateManager.getAccountState.mockImplementation((id: string) => {
      if (id === 'acc-1') {
        return {
          portfolioState: { accountId: 'acc-1', tenantId: 'tenant-1', cash: 1000, holdings: [{ instrumentId: 'AAPL', quantity: 10 }] },
          targetAllocation: { targets: [{ instrumentId: 'MSFT', weight: 0.5 }] },
          priceSnapshot: { prices: {} },
        } as any;
      }
      // Account 2 on tenant-2 (MOCK / skipped)
      return {
        portfolioState: { accountId: 'acc-2', tenantId: 'tenant-2', cash: 500, holdings: [] },
        targetAllocation: { targets: [] },
        priceSnapshot: { prices: {} },
      } as any;
    });

    stateManager.getTenantBrokerConfig.mockImplementation((tenantId: string) => {
      if (tenantId === 'tenant-1') {
        return { brokerType: 'ALPACA', brokerApiKey: 'key-1', brokerApiSecret: 'sec-1' } as any;
      }
      return { brokerType: 'MOCK', brokerApiKey: '' } as any;
    });

    mockGetPrices.mockResolvedValue({ AAPL: 150, MSFT: 300 });
    stateManager.getPendingOrders.mockReturnValue([
      { orderId: 'ord-1', accountId: 'acc-1', status: 'NEW', filledQuantity: 0 } as any,
    ]);
    mockGetOrderStatus.mockResolvedValue({
      status: 'FILLED',
      filledQuantity: 10,
      fillPrice: 150,
    });
    mockGetPortfolioState.mockResolvedValue({
      accountId: 'acc-1',
      cash: 1000,
      holdings: [{ instrumentId: 'AAPL', quantity: 10 }],
    });

    await syncService.sync();

    // 1. Price sync
    expect(mockGetPrices).toHaveBeenCalledTimes(1);
    expect(mockGetPrices).toHaveBeenCalledWith(expect.anything(), expect.arrayContaining(['AAPL', 'MSFT']));
    expect(stateManager.updateGlobalPrices).toHaveBeenCalledWith({ AAPL: 150, MSFT: 300 }, expect.any(String));

    // 2. Order sync
    expect(mockGetOrderStatus).toHaveBeenCalledWith(expect.anything(), 'acc-1', 'ord-1');
    expect(stateManager.processExecutionReport).toHaveBeenCalledWith('ord-1', 'acc-1', 'FILLED', 10, 150);

    // 3. Portfolio state sync
    expect(mockGetPortfolioState).toHaveBeenCalledWith(expect.anything(), 'acc-1');
    expect(stateManager.updatePortfolio).toHaveBeenCalledWith('acc-1', expect.objectContaining({ accountId: 'acc-1' }));

    // 4. Orchestrator notified
    expect(orchestrator.onTick).toHaveBeenCalled();
  });

  it('isolates errors so a failing tenant does not crash the loop or block subsequent tenants', async () => {
    stateManager.getAllAccountIds.mockReturnValue(['acc-1', 'acc-2']);

    stateManager.getAccountState.mockImplementation((id: string) => {
      if (id === 'acc-1') {
        return {
          portfolioState: { accountId: 'acc-1', tenantId: 'tenant-error', cash: 1000, holdings: [{ instrumentId: 'AAPL', quantity: 10 }] },
          targetAllocation: { targets: [] },
          priceSnapshot: { prices: {} },
        } as any;
      }
      return {
        portfolioState: { accountId: 'acc-2', tenantId: 'tenant-success', cash: 2000, holdings: [{ instrumentId: 'MSFT', quantity: 5 }] },
        targetAllocation: { targets: [] },
        priceSnapshot: { prices: {} },
      } as any;
    });

    stateManager.getTenantBrokerConfig.mockImplementation((tenantId: string) => {
      return { brokerType: 'ALPACA', brokerApiKey: `key-${tenantId}`, brokerApiSecret: 'sec' } as any;
    });

    // Tenant 1 price fetch fails, Tenant 2 price fetch succeeds
    mockGetPrices
      .mockRejectedValueOnce(new Error('Alpaca 429 Rate Limit Exceeded'))
      .mockResolvedValueOnce({ MSFT: 300 });

    mockGetPortfolioState.mockResolvedValue({
      accountId: 'acc-2',
      cash: 2000,
      holdings: [{ instrumentId: 'MSFT', quantity: 5 }],
    });

    await expect(syncService.sync()).resolves.not.toThrow();

    // Tenant 2 should still be updated successfully
    expect(stateManager.updateGlobalPrices).toHaveBeenCalledWith({ MSFT: 300 }, expect.any(String));
    expect(orchestrator.onTick).toHaveBeenCalled();
  });
});
