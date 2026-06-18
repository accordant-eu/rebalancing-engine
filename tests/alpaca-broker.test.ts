import { AlpacaBrokerAdapter } from '../src/broker/alpaca-broker';
import { ExecutionContext, TradeProposal } from '../src/models/domain';

describe('AlpacaBrokerAdapter', () => {
  let adapter: AlpacaBrokerAdapter;
  let fetchMock: jest.Mock;

  const dummyContext: ExecutionContext = {
    tenantId: 'tenant-1',
    brokerConfig: {
      brokerType: 'ALPACA',
      brokerApiKey: 'test-key',
      brokerApiSecret: 'test-secret',
      brokerBaseUrl: 'https://broker-api.sandbox.alpaca.markets/v1',
    },
  };

  const expectedAuthHeader = 'Basic ' + Buffer.from('test-key:test-secret').toString('base64');

  beforeEach(() => {
    adapter = new AlpacaBrokerAdapter();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('injects execution context credentials into getPortfolioState', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cash: '1000.50' }),
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { symbol: 'US0378331005:XNAS:USD', qty: '10' },
      ],
    });

    const state = await adapter.getPortfolioState(dummyContext, 'acc-123');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    
    // Check account request
    expect(fetchMock.mock.calls[0][0]).toBe('https://broker-api.sandbox.alpaca.markets/v1/trading/accounts/acc-123/account');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(expectedAuthHeader);

    // Check positions request
    expect(fetchMock.mock.calls[1][0]).toBe('https://broker-api.sandbox.alpaca.markets/v1/trading/accounts/acc-123/positions');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(expectedAuthHeader);

    expect(state.accountId).toBe('acc-123');
    expect(state.cash).toBe(1000.5);
    expect(state.holdings).toHaveLength(1);
    expect(state.holdings[0]).toEqual({ instrumentId: 'US0378331005:XNAS:USD', quantity: 10 });
  });

  it('injects execution context credentials into submitTrades', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'order-123' }),
    });

    const proposal: TradeProposal = {
      trades: [
        { instrumentId: 'US0378331005:XNAS:USD', direction: 'BUY', quantity: 5, estimatedPrice: 150, estimatedValue: 750 },
      ],
      estimatedPostTradeCash: 250,
      warnings: [],
      executionTargetMode: 'full_reset',
    };

    await adapter.submitTrades(dummyContext, 'acc-123', proposal);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://broker-api.sandbox.alpaca.markets/v1/trading/accounts/acc-123/orders');
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(expectedAuthHeader);
    
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.symbol).toBe('US0378331005:XNAS:USD');
    expect(body.side).toBe('buy');
    expect(body.qty).toBe('5');
    expect(body.type).toBe('market');
    expect(body.time_in_force).toBe('day');
  });

  it('handles API errors correctly', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => 'Invalid credentials',
    });

    await expect(adapter.getPortfolioState(dummyContext, 'acc-123')).rejects.toThrow('Alpaca Broker API Error: 403 Forbidden - Invalid credentials');
  });
});
