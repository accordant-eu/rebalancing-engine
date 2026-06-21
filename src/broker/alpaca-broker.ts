import { PortfolioState, TradeProposal, ExecutionContext } from '../models/domain';
import { BrokerAdapter } from './adapter';

import { globalMetrics } from '../services/metrics';

export class AlpacaBrokerAdapter implements BrokerAdapter {
  
  private async fetchApi(endpoint: string, context: ExecutionContext, options: RequestInit = {}): Promise<any> {
    const baseUrl = context.brokerConfig.brokerBaseUrl || 'https://broker-api.sandbox.alpaca.markets/v1';
    const url = `${baseUrl}${endpoint}`;
    
    // Alpaca Broker API uses Basic Auth with keyId and secretKey
    const authHeader = 'Basic ' + Buffer.from(`${context.brokerConfig.brokerApiKey}:${context.brokerConfig.brokerApiSecret}`).toString('base64');
    
    const headers = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      ...options.headers,
    };

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
      throw new Error(`Alpaca Broker API Error: ${response.status} ${response.statusText} - ${errText}`);
    }
    
    return response.json();
  }

  public async getPortfolioState(context: ExecutionContext, brokerAccountId: string): Promise<PortfolioState> {
    const account = await this.fetchApi(`/trading/accounts/${brokerAccountId}/account`, context);
    const positions = await this.fetchApi(`/trading/accounts/${brokerAccountId}/positions`, context);

    return {
      accountId: brokerAccountId,
      cash: parseFloat(account.cash),
      holdings: positions.map((p: any) => ({
        instrumentId: context.translateBrokerSymbolToInstrumentId ? context.translateBrokerSymbolToInstrumentId(p.symbol, 'Alpaca') : p.symbol,
        quantity: parseFloat(p.qty),
      })),
    };
  }

  public async getPrices(context: ExecutionContext, symbols: string[]): Promise<Record<string, number>> {
    if (symbols.length === 0) {
      return {};
    }

    // Translate our internal instrumentIds to broker symbols
    const translatedSymbols = symbols.map(sym => context.translateBrokerSymbol ? context.translateBrokerSymbol(sym, 'Alpaca') : sym);

    const dataUrl = 'https://data.alpaca.markets/v2/stocks/snapshots?symbols=' + translatedSymbols.join(',');
    
    // Strict tenant isolation: do not fallback to process.env.
    const dataKey = context.brokerConfig.brokerApiKey;
    const dataSecret = context.brokerConfig.brokerApiSecret;

    const response = await fetch(dataUrl, {
      headers: {
        'APCA-API-KEY-ID': dataKey,
        'APCA-API-SECRET-KEY': dataSecret,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Alpaca Data API Error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const prices: Record<string, number> = {};

    for (let i = 0; i < symbols.length; i++) {
      const originalSymbol = symbols[i];
      const translatedSymbol = translatedSymbols[i];
      const snapshot = data[translatedSymbol];
      if (snapshot) {
        if (snapshot.latestTrade && snapshot.latestTrade.p) {
          prices[originalSymbol] = snapshot.latestTrade.p;
        } else if (snapshot.dailyBar && snapshot.dailyBar.c) {
          prices[originalSymbol] = snapshot.dailyBar.c;
        }
      }
    }

    return prices;
  }

  public async submitTrades(context: ExecutionContext, brokerAccountId: string, proposal: TradeProposal): Promise<void> {
    for (const trade of proposal.trades) {
      if (trade.quantity <= 0) continue;

      const brokerSymbol = context.translateBrokerSymbol ? context.translateBrokerSymbol(trade.instrumentId, 'Alpaca') : trade.instrumentId;

      await this.fetchApi(`/trading/accounts/${brokerAccountId}/orders`, context, {
        method: 'POST',
        body: JSON.stringify({
          symbol: brokerSymbol,
          qty: trade.quantity.toString(),
          side: trade.direction.toLowerCase() as 'buy' | 'sell',
          type: 'market',
          time_in_force: 'day',
        })
      });
    }
  }

  public async hasOpenOrders(context: ExecutionContext, brokerAccountId: string): Promise<boolean> {
    const orders = await this.fetchApi(`/trading/accounts/${brokerAccountId}/orders?status=open`, context);
    return orders.length > 0;
  }
}
