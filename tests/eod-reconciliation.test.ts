import { EodReconciliationJob } from '../src/services/eod-reconciliation';
import { SqliteStateManager } from '../src/orchestrator/sqlite-state';
import { AlpacaBrokerAdapter } from '../src/broker/alpaca-broker';
import { initDb } from '../src/db/sqlite';
import * as cron from 'node-cron';

jest.mock('../src/broker/alpaca-broker');
jest.mock('node-cron');

describe('EodReconciliationJob', () => {
  let stateManager: SqliteStateManager;
  let eodJob: EodReconciliationJob;
  let mockGetPortfolioState: jest.Mock;

  beforeEach(() => {
    initDb(':memory:');
    stateManager = new SqliteStateManager();
    eodJob = new EodReconciliationJob(stateManager);

    // Setup Mock Broker
    mockGetPortfolioState = jest.fn();
    (AlpacaBrokerAdapter as jest.Mock).mockImplementation(() => ({
      getPortfolioState: mockGetPortfolioState
    }));
    
    // Inject mock adapter
    (eodJob as any).brokerAdapter = new AlpacaBrokerAdapter();

    // Create a tenant with Alpaca broker
    stateManager.createTenant('tenant-1', 'Test Tenant', {
      brokerType: 'ALPACA',
      brokerApiKey: 'test-key',
      brokerApiSecret: 'test-secret'
    });

    // Register a portfolio
    stateManager.registerPortfolio('acc-1', {
      portfolioState: {
        accountId: 'acc-1',
        cash: 1000,
        holdings: [
          { instrumentId: 'AAPL', quantity: 10 }
        ]
      },
      priceSnapshot: { prices: {} },
      targetAllocation: { targets: [], cashBuffer: 0 },
      policy: { absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      archetype: 'StaticWeights',
      constraints: []
    });
    
    // Assign portfolio to tenant
    stateManager.assignPortfolioToTenant('acc-1', 'tenant-1');
  });

  afterEach(() => {
    eodJob.stop();
    jest.clearAllMocks();
  });

  it('schedules a cron job', () => {
    const mockSchedule = jest.fn();
    (cron.schedule as jest.Mock).mockImplementation(mockSchedule);

    eodJob.start('0 0 * * *');
    expect(mockSchedule).toHaveBeenCalledWith('0 0 * * *', expect.any(Function));
  });

  it('skips reconciliation if broker state matches local state exactly', async () => {
    mockGetPortfolioState.mockResolvedValue({
      accountId: 'acc-1',
      cash: 1000,
      holdings: [{ instrumentId: 'AAPL', quantity: 10 }]
    });

    await eodJob.runReconciliation();

    const finalState = stateManager.getAccountState('acc-1');
    expect(finalState.portfolioState.cash).toBe(1000);
    expect(finalState.portfolioState.holdings[0].quantity).toBe(10);
  });

  it('updates local state if broker cash differs (e.g. dividend received)', async () => {
    mockGetPortfolioState.mockResolvedValue({
      accountId: 'acc-1',
      cash: 1050, // 50 in missing cash
      holdings: [{ instrumentId: 'AAPL', quantity: 10 }]
    });

    await eodJob.runReconciliation();

    const finalState = stateManager.getAccountState('acc-1');
    expect(finalState.portfolioState.cash).toBe(1050);
  });

  it('updates local state if broker holdings differ (e.g. missed partial fill)', async () => {
    mockGetPortfolioState.mockResolvedValue({
      accountId: 'acc-1',
      cash: 1000,
      holdings: [{ instrumentId: 'AAPL', quantity: 15 }] // Broker has 5 more shares
    });

    await eodJob.runReconciliation();

    const finalState = stateManager.getAccountState('acc-1');
    expect(finalState.portfolioState.holdings[0].quantity).toBe(15);
  });

  it('skips tenants without an ALPACA broker config', async () => {
    // Create a mock broker tenant
    stateManager.createTenant('tenant-2', 'Mock Tenant', {
      brokerType: 'MOCK',
      brokerApiKey: '',
      brokerApiSecret: ''
    });
    stateManager.registerPortfolio('acc-2', {
      portfolioState: {
        accountId: 'acc-2',
        cash: 100,
        holdings: []
      },
      priceSnapshot: { prices: {} },
      targetAllocation: { targets: [], cashBuffer: 0 },
      policy: { absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      archetype: 'StaticWeights',
      constraints: []
    });
    stateManager.assignPortfolioToTenant('acc-2', 'tenant-2');

    mockGetPortfolioState.mockResolvedValue({
      accountId: 'acc-1',
      cash: 1000,
      holdings: [{ instrumentId: 'AAPL', quantity: 10 }]
    });

    await eodJob.runReconciliation();

    // The Alpaca adapter should only be called once for tenant-1's acc-1, not acc-2.
    expect(mockGetPortfolioState).toHaveBeenCalledTimes(1);
    expect(mockGetPortfolioState).toHaveBeenCalledWith(expect.anything(), 'acc-1');
  });

  it('handles broker network/API errors gracefully without crashing or corrupting local state', async () => {
    // acc-1 fails due to network timeout
    mockGetPortfolioState.mockRejectedValue(new Error('Broker connection timeout (ETIMEDOUT)'));

    await expect(eodJob.runReconciliation()).resolves.not.toThrow();

    // Local state should remain uncorrupted
    const finalState = stateManager.getAccountState('acc-1');
    expect(finalState.portfolioState.cash).toBe(1000);
    expect(finalState.portfolioState.holdings[0].quantity).toBe(10);
  });

  it('continues reconciling subsequent accounts when an individual portfolio fails', async () => {
    // Register second portfolio for tenant-1
    stateManager.registerPortfolio('acc-1b', {
      portfolioState: {
        accountId: 'acc-1b',
        cash: 2000,
        holdings: [{ instrumentId: 'MSFT', quantity: 20 }],
      },
      priceSnapshot: { prices: {} },
      targetAllocation: { targets: [], cashBuffer: 0 },
      policy: { absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      archetype: 'StaticWeights',
      constraints: [],
    });
    stateManager.assignPortfolioToTenant('acc-1b', 'tenant-1');

    // acc-1 fails, acc-1b succeeds with a discrepancy
    mockGetPortfolioState
      .mockRejectedValueOnce(new Error('Rate Limit 429'))
      .mockResolvedValueOnce({
        accountId: 'acc-1b',
        cash: 2500,
        holdings: [{ instrumentId: 'MSFT', quantity: 20 }],
      });

    await eodJob.runReconciliation();

    // acc-1 remains unchanged
    expect(stateManager.getAccountState('acc-1').portfolioState.cash).toBe(1000);
    // acc-1b is reconciled successfully to 2500
    expect(stateManager.getAccountState('acc-1b').portfolioState.cash).toBe(2500);
  });
});

