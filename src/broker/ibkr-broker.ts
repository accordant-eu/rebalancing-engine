import { PortfolioState, TradeProposal, ExecutionContext } from '../models/domain';
import { BrokerAdapter } from './adapter';
import { globalMetrics } from '../services/metrics';

export class IbkrBrokerAdapter implements BrokerAdapter {
  private async fetchApi(endpoint: string, context: ExecutionContext, options: RequestInit = {}): Promise<any> {
    const baseUrl = (context.brokerConfig.brokerBaseUrl || 'https://localhost:5000/v1/api').replace(/\/+$/, '');
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (context.brokerConfig.brokerApiKey) {
      if (context.brokerConfig.brokerApiSecret) {
        headers['Authorization'] = 'Basic ' + Buffer.from(`${context.brokerConfig.brokerApiKey}:${context.brokerConfig.brokerApiSecret}`).toString('base64');
      } else {
        headers['Authorization'] = `Bearer ${context.brokerConfig.brokerApiKey}`;
      }
    }

    const startTime = Date.now();
    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (e) {
      globalMetrics.recordRateLimitError(context.tenantId);
      throw e;
    }

    const latency = Date.now() - startTime;
    globalMetrics.recordApiCall(context.tenantId, latency);

    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) {
        globalMetrics.recordRateLimitError(context.tenantId);
      }
      const errText = await response.text();
      throw new Error(`IBKR Broker API Error: ${response.status} ${response.statusText} - ${errText}`);
    }

    return response.json();
  }

  public async getPortfolioState(context: ExecutionContext, brokerAccountId: string): Promise<PortfolioState> {
    const summary = await this.fetchApi(`/portfolio/${brokerAccountId}/summary`, context);
    let cash = 0;
    if (summary) {
      if (typeof summary === 'object' && !Array.isArray(summary)) {
        cash = parseFloat(
          summary.settledcash?.amount ??
          summary.totalcashvalue?.amount ??
          summary.cash ??
          '0'
        );
      } else if (Array.isArray(summary)) {
        const settled = summary.find((item: any) => item.key === 'settledcash' || item.key === 'totalcashvalue' || item.key === 'cash');
        if (settled) {
          cash = parseFloat(settled.amount ?? settled.value ?? '0');
        }
      }
    }

    const positions = await this.fetchApi(`/portfolio/${brokerAccountId}/positions/0`, context);
    const holdings = Array.isArray(positions)
      ? positions.map((p: any) => {
          const rawSymbol = String(p.conid || p.ticker || p.contractDesc || '');
          const instrumentId = context.translateBrokerSymbolToInstrumentId
            ? context.translateBrokerSymbolToInstrumentId(rawSymbol, 'IBKR')
            : (p.ticker || rawSymbol);
          const quantity = parseFloat(p.position ?? p.qty ?? '0');
          return { instrumentId, quantity };
        })
      : [];

    return {
      accountId: brokerAccountId,
      cash,
      holdings,
    };
  }

  public async getPrices(context: ExecutionContext, symbols: string[]): Promise<Record<string, number>> {
    if (symbols.length === 0) return {};

    const translatedSymbols = symbols.map(sym => 
      context.translateBrokerSymbol ? context.translateBrokerSymbol(sym, 'IBKR') : sym
    );

    const queryParam = translatedSymbols.join(',');
    const snapshots = await this.fetchApi(`/iserver/marketdata/snapshot?conids=${encodeURIComponent(queryParam)}&fields=31,84,86`, context);

    const prices: Record<string, number> = {};

    if (Array.isArray(snapshots)) {
      for (let i = 0; i < symbols.length; i++) {
        const originalSymbol = symbols[i];
        const translated = translatedSymbols[i];

        const match = snapshots.find((s: any) => 
          String(s.conid) === String(translated) || 
          String(s.symbol || s.ticker || '').toUpperCase() === String(translated).toUpperCase()
        );

        if (match) {
          const last = parseFloat(match['31'] || match.last || '0');
          const bid = parseFloat(match['84'] || match.bid || '0');
          const ask = parseFloat(match['86'] || match.ask || '0');

          if (last > 0) {
            prices[originalSymbol] = last;
          } else if (bid > 0 && ask > 0) {
            prices[originalSymbol] = (bid + ask) / 2;
          } else if (bid > 0) {
            prices[originalSymbol] = bid;
          } else if (ask > 0) {
            prices[originalSymbol] = ask;
          }
        }
      }
    }

    return prices;
  }

  public async submitTrades(
    context: ExecutionContext,
    brokerAccountId: string,
    proposal: TradeProposal
  ): Promise<{ orderId: string; instrumentId: string; direction: 'BUY' | 'SELL'; quantity: number }[]> {
    const orders: { orderId: string; instrumentId: string; direction: 'BUY' | 'SELL'; quantity: number }[] = [];

    for (const trade of proposal.trades) {
      if (trade.quantity <= 0) continue;

      const brokerSymbol = context.translateBrokerSymbol
        ? context.translateBrokerSymbol(trade.instrumentId, 'IBKR')
        : trade.instrumentId;

      const isNumericConid = /^\d+$/.test(brokerSymbol);

      const orderPayload: any = {
        side: trade.direction,
        orderType: 'MKT',
        quantity: trade.quantity,
        tif: 'DAY',
      };

      if (isNumericConid) {
        orderPayload.conid = parseInt(brokerSymbol, 10);
      } else {
        orderPayload.ticker = brokerSymbol;
        orderPayload.secType = 'STK';
      }

      const response = await this.fetchApi(`/iserver/account/${brokerAccountId}/orders`, context, {
        method: 'POST',
        body: JSON.stringify({ orders: [orderPayload] }),
      });

      let orderId: string | undefined;

      if (Array.isArray(response) && response.length > 0) {
        const first = response[0];
        // Handle pre-order confirmation prompt if returned
        if (first.id && !first.order_id) {
          const replyRes = await this.fetchApi(`/iserver/reply/${first.id}`, context, {
            method: 'POST',
            body: JSON.stringify({ confirmed: true }),
          });
          if (Array.isArray(replyRes) && replyRes.length > 0 && (replyRes[0].order_id || replyRes[0].orderId)) {
            orderId = String(replyRes[0].order_id || replyRes[0].orderId);
          } else if (replyRes && (replyRes.order_id || replyRes.orderId)) {
            orderId = String(replyRes.order_id || replyRes.orderId);
          }
        } else if (first.order_id || first.orderId || first.id) {
          orderId = String(first.order_id || first.orderId || first.id);
        }
      } else if (response && (response.order_id || response.orderId || response.id)) {
        orderId = String(response.order_id || response.orderId || response.id);
      }

      if (orderId) {
        orders.push({
          orderId,
          instrumentId: trade.instrumentId,
          direction: trade.direction,
          quantity: trade.quantity,
        });
      }
    }

    return orders;
  }

  public async hasOpenOrders(context: ExecutionContext, _brokerAccountId: string): Promise<boolean> {
    const res = await this.fetchApi(`/iserver/account/orders`, context);
    if (!res) return false;
    const orderList: any[] = Array.isArray(res) ? res : (res.orders || []);
    
    const activeStatuses = ['submitted', 'presubmitted', 'pendingsubmit', 'pendingcancel', 'warnstate'];
    return orderList.some(order => {
      const status = String(order.status || order.order_status || '').toLowerCase();
      return activeStatuses.includes(status);
    });
  }

  public async getOrderStatus(
    context: ExecutionContext,
    _brokerAccountId: string,
    orderId: string
  ): Promise<{ status: string; filledQuantity: number; fillPrice: number }> {
    const res = await this.fetchApi(`/iserver/account/order/status/${orderId}`, context);

    let status = 'PENDING';
    const rawStatus = String(res.status || res.order_status || '').toLowerCase();

    if (rawStatus === 'filled') {
      status = 'FILLED';
    } else if (rawStatus === 'partiallyfilled' || rawStatus === 'partial') {
      status = 'PARTIAL_FILL';
    } else if (rawStatus === 'cancelled' || rawStatus === 'canceled' || rawStatus === 'inactive') {
      status = 'CANCELED';
    } else if (rawStatus === 'rejected') {
      status = 'REJECTED';
    }

    const filledQuantity = parseFloat(res.cum_qty || res.cumQty || res.filled_qty || res.filledQuantity || '0');
    const fillPrice = parseFloat(res.avg_price || res.avgPrice || res.price || '0');

    return {
      status,
      filledQuantity,
      fillPrice,
    };
  }
}
