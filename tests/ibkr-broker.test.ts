import { IbkrBrokerAdapter } from '../src/broker/ibkr-broker';
import { BrokerAdapterFactory } from '../src/broker/factory';
import { AlpacaBrokerAdapter } from '../src/broker/alpaca-broker';
import { ExecutionContext, TradeProposal } from '../src/models/domain';
import { globalMetrics } from '../src/services/metrics';

describe('IbkrBrokerAdapter', () => {
  let adapter: IbkrBrokerAdapter;
  let mockFetch: jest.Mock;
  const originalFetch = global.fetch;

  const mockContext: ExecutionContext = {
    tenantId: 'tenant-ibkr-1',
    brokerConfig: {
      brokerType: 'IBKR',
      brokerApiKey: 'test-gateway-token',
      brokerApiSecret: 'test-gateway-secret',
      brokerBaseUrl: 'https://ibkr-gw.local:5000/v1/api'
    },
    translateBrokerSymbol: (instrumentId: string, brokerType: string) => {
      if (brokerType.toUpperCase() === 'IBKR') {
        if (instrumentId === 'US0378331005:XNAS:USD') return '265598';
        if (instrumentId === 'US5949181045:XNAS:USD') return '272093';
      }
      return instrumentId;
    },
    translateBrokerSymbolToInstrumentId: (brokerSymbol: string, brokerType: string) => {
      if (brokerType.toUpperCase() === 'IBKR') {
        if (brokerSymbol === '265598') return 'US0378331005:XNAS:USD';
        if (brokerSymbol === '272093') return 'US5949181045:XNAS:USD';
      }
      return brokerSymbol;
    }
  };

  beforeEach(() => {
    adapter = new IbkrBrokerAdapter();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    jest.spyOn(globalMetrics, 'recordApiCall').mockImplementation(() => {});
    jest.spyOn(globalMetrics, 'recordRateLimitError').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('getPortfolioState', () => {
    it('fetches cash from object summary and maps positions via conid', async () => {
      // 1. Mock summary call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          settledcash: { amount: 15420.50 }
        })
      });

      // 2. Mock positions call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          { conid: 265598, position: 25, mktPrice: 175.50 },
          { conid: 272093, position: 50, mktPrice: 320.10 }
        ]
      });

      const state = await adapter.getPortfolioState(mockContext, 'U1234567');

      expect(state.accountId).toBe('U1234567');
      expect(state.cash).toBe(15420.50);
      expect(state.holdings).toHaveLength(2);
      expect(state.holdings[0]).toEqual({
        instrumentId: 'US0378331005:XNAS:USD',
        quantity: 25
      });
      expect(state.holdings[1]).toEqual({
        instrumentId: 'US5949181045:XNAS:USD',
        quantity: 50
      });
      expect(globalMetrics.recordApiCall).toHaveBeenCalledTimes(2);
    });

    it('handles array summary and ticker fallback when translation is absent', async () => {
      const minimalContext: ExecutionContext = {
        tenantId: 'tenant-ibkr-2',
        brokerConfig: {
          brokerType: 'IBKR',
          brokerApiKey: 'token-only',
          brokerApiSecret: ''
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          { key: 'settledcash', value: '8500.00' }
        ]
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          { ticker: 'SPY', position: 10 }
        ]
      });

      const state = await adapter.getPortfolioState(minimalContext, 'U7654321');
      expect(state.cash).toBe(8500.00);
      expect(state.holdings).toEqual([{ instrumentId: 'SPY', quantity: 10 }]);
    });
  });

  describe('getPrices', () => {
    it('returns empty object if symbols list is empty', async () => {
      const prices = await adapter.getPrices(mockContext, []);
      expect(prices).toEqual({});
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('translates symbols, queries snapshot, and extracts last price or bid/ask midpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          { conid: 265598, '31': '180.25' },
          { conid: 272093, '84': '310.00', '86': '311.00' } // Midpoint 310.50
        ]
      });

      const prices = await adapter.getPrices(mockContext, ['US0378331005:XNAS:USD', 'US5949181045:XNAS:USD']);

      expect(prices['US0378331005:XNAS:USD']).toBe(180.25);
      expect(prices['US5949181045:XNAS:USD']).toBe(310.50);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://ibkr-gw.local:5000/v1/api/iserver/marketdata/snapshot?conids=265598%2C272093&fields=31,84,86',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Basic /)
          })
        })
      );
    });
  });

  describe('submitTrades', () => {
    it('submits market order with translated conid and handles confirmation reply', async () => {
      const proposal: TradeProposal = {
        trades: [
          {
            instrumentId: 'US0378331005:XNAS:USD',
            direction: 'BUY',
            quantity: 10,
            estimatedPrice: 180,
            estimatedValue: 1800
          },
          {
            instrumentId: 'US5949181045:XNAS:USD',
            direction: 'SELL',
            quantity: 0, // Should be skipped
            estimatedPrice: 310,
            estimatedValue: 0
          }
        ],
        estimatedPostTradeCash: 5000,
        warnings: []
      };

      // 1. Initial order submission returns warning prompt reply ID
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ id: 'reply_notice_42', message: ['Order size warning'] }]
      });

      // 2. Reply confirmation call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ order_id: 'ibkr_ord_9988' }]
      });

      const orders = await adapter.submitTrades(mockContext, 'U1234567', proposal);

      expect(orders).toHaveLength(1);
      expect(orders[0]).toEqual({
        orderId: 'ibkr_ord_9988',
        instrumentId: 'US0378331005:XNAS:USD',
        direction: 'BUY',
        quantity: 10
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://ibkr-gw.local:5000/v1/api/iserver/account/U1234567/orders',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            orders: [{
              side: 'BUY',
              orderType: 'MKT',
              quantity: 10,
              tif: 'DAY',
              conid: 265598
            }]
          })
        })
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://ibkr-gw.local:5000/v1/api/iserver/reply/reply_notice_42',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ confirmed: true })
        })
      );
    });

    it('submits order with ticker when brokerSymbol is non-numeric', async () => {
      const customContext: ExecutionContext = {
        tenantId: 'tenant-ibkr-custom',
        brokerConfig: {
          brokerType: 'IBKR',
          brokerApiKey: 'token'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ order_id: 'ibkr_ord_1001' }]
      });

      const orders = await adapter.submitTrades(customContext, 'U1234567', {
        trades: [{
          instrumentId: 'NVDA',
          direction: 'BUY',
          quantity: 5,
          estimatedPrice: 120,
          estimatedValue: 600
        }],
        estimatedPostTradeCash: 1000,
        warnings: []
      });

      expect(orders[0]).toEqual({
        orderId: 'ibkr_ord_1001',
        instrumentId: 'NVDA',
        direction: 'BUY',
        quantity: 5
      });
    });
  });

  describe('hasOpenOrders', () => {
    it('returns true if pending orders exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          orders: [
            { order_id: 'ord_1', status: 'PreSubmitted' }
          ]
        })
      });

      const hasOpen = await adapter.hasOpenOrders(mockContext, 'U1234567');
      expect(hasOpen).toBe(true);
    });

    it('returns false if all orders are inactive or filled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          orders: [
            { order_id: 'ord_2', status: 'Filled' },
            { order_id: 'ord_3', status: 'Cancelled' }
          ]
        })
      });

      const hasOpen = await adapter.hasOpenOrders(mockContext, 'U1234567');
      expect(hasOpen).toBe(false);
    });
  });

  describe('getOrderStatus', () => {
    it('maps filled status and cumulative quantity correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'Filled',
          cum_qty: '25.0',
          avg_price: '180.50'
        })
      });

      const status = await adapter.getOrderStatus(mockContext, 'U1234567', 'ord_123');
      expect(status).toEqual({
        status: 'FILLED',
        filledQuantity: 25.0,
        fillPrice: 180.50
      });
    });

    it('maps cancelled status correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'Cancelled',
          cum_qty: '0',
          avg_price: '0'
        })
      });

      const status = await adapter.getOrderStatus(mockContext, 'U1234567', 'ord_456');
      expect(status.status).toBe('CANCELED');
    });
  });

  describe('Error handling', () => {
    it('records rate limit metrics and throws on 429 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded'
      });

      await expect(adapter.getPortfolioState(mockContext, 'U1234567')).rejects.toThrow(
        'IBKR Broker API Error: 429 Too Many Requests - Rate limit exceeded'
      );
      expect(globalMetrics.recordRateLimitError).toHaveBeenCalledWith('tenant-ibkr-1');
    });
  });

  describe('BrokerAdapterFactory', () => {
    it('returns IbkrBrokerAdapter for IBKR and AlpacaBrokerAdapter for ALPACA', () => {
      const ibkr = BrokerAdapterFactory.getAdapter('IBKR');
      expect(ibkr).toBeInstanceOf(IbkrBrokerAdapter);

      const alpaca = BrokerAdapterFactory.getAdapter('ALPACA');
      expect(alpaca).toBeInstanceOf(AlpacaBrokerAdapter);

      const defaultAdapter = BrokerAdapterFactory.getAdapter('MOCK');
      expect(defaultAdapter).toBeInstanceOf(AlpacaBrokerAdapter);
    });
  });
});
