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

  describe('getPortfolioState', () => {
    it('injects execution context credentials into getPortfolioState and uses translateBrokerSymbolToInstrumentId when present', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cash: '1000.50' }),
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { symbol: 'AAPL', qty: '10' },
        ],
      });

      const ctx = {
        ...dummyContext,
        translateBrokerSymbolToInstrumentId: (sym: string) => ({ 'AAPL': 'US0378331005:XNAS:USD' }[sym] ?? sym),
      };

      const state = await adapter.getPortfolioState(ctx, 'acc-123');

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
      // Verify translation happened
      expect(state.holdings[0]).toEqual({ instrumentId: 'US0378331005:XNAS:USD', quantity: 10 });
    });
  });

  describe('submitTrades', () => {
    it('uses translateBrokerSymbol when present in context', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'order-123' }),
      });

      const ctx = {
        ...dummyContext,
        translateBrokerSymbol: (id: string) => ({ 'US0378331005:XNAS:USD': 'AAPL' }[id] ?? id),
      };

      const proposal: TradeProposal = {
        trades: [
          { instrumentId: 'US0378331005:XNAS:USD', direction: 'BUY', quantity: 5, estimatedPrice: 150, estimatedValue: 750 },
        ],
        estimatedPostTradeCash: 250,
        warnings: [],
        executionTargetMode: 'full_reset',
      };

      await adapter.submitTrades(ctx, 'acc-123', proposal);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe('https://broker-api.sandbox.alpaca.markets/v1/trading/accounts/acc-123/orders');
      expect(fetchMock.mock.calls[0][1].method).toBe('POST');
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(expectedAuthHeader);
      
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      // The payload to Alpaca should have the translated symbol AAPL, not the composite key
      expect(body.symbol).toBe('AAPL');
      expect(body.side).toBe('buy');
      expect(body.qty).toBe('5');
      expect(body.type).toBe('market');
      expect(body.time_in_force).toBe('day');
    });
  });

  describe('getPrices', () => {
    it('returns empty object when symbols list is empty', async () => {
      const prices = await adapter.getPrices(dummyContext, []);
      expect(prices).toEqual({});
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('fetches prices with correct translation and fallbacks', async () => {
      const mockData = {
        'AAPL': {
          latestTrade: { p: 150.5 },
          dailyBar: { c: 149.0 }
        },
        'TSLA': {
          // No latestTrade, should fallback to dailyBar
          dailyBar: { c: 200.0 }
        }
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const ctx = {
        ...dummyContext,
        translateBrokerSymbol: (id: string) => ({
          'US0378331005:XNAS:USD': 'AAPL',
          'US88160R1014:XNAS:USD': 'TSLA',
        }[id] ?? id),
      };

      const prices = await adapter.getPrices(ctx, ['US0378331005:XNAS:USD', 'US88160R1014:XNAS:USD']);
      
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe('https://data.alpaca.markets/v2/stocks/snapshots?symbols=AAPL,TSLA');
      
      expect(prices).toEqual({
        'US0378331005:XNAS:USD': 150.5,
        'US88160R1014:XNAS:USD': 200.0,
      });
    });

    it('throws error on rate limit or api error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded',
      });

      await expect(adapter.getPrices(dummyContext, ['AAPL'])).rejects.toThrow('Alpaca Data API Error: 429 Rate limit exceeded');
    });
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
