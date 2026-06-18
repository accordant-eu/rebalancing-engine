import { PortfolioState, TradeProposal, ExecutionContext } from '../models/domain';
import { BrokerAdapter } from './adapter';

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

    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
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
        instrumentId: p.symbol,
        quantity: parseFloat(p.qty),
      })),
    };
  }

  public async getPrices(context: ExecutionContext, symbols: string[]): Promise<Record<string, number>> {
    if (symbols.length === 0) {
      return {};
    }

    const dataUrl = 'https://data.alpaca.markets/v2/stocks/snapshots?symbols=' + symbols.join(',');
    
    // For Market Data, we can either use global keys or tenant keys.
    // Assuming tenant keys have data access or we fallback to global for MVP to not break.
    const dataKey = process.env.APCA_API_KEY_ID || context.brokerConfig.brokerApiKey;
    const dataSecret = process.env.APCA_API_SECRET_KEY || context.brokerConfig.brokerApiSecret;

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

    for (const [symbol, snapshot] of Object.entries(data as Record<string, any>)) {
      if (snapshot.latestTrade && snapshot.latestTrade.p) {
        prices[symbol] = snapshot.latestTrade.p;
      } else if (snapshot.dailyBar && snapshot.dailyBar.c) {
        prices[symbol] = snapshot.dailyBar.c;
      }
    }

    return prices;
  }

  public async submitTrades(context: ExecutionContext, brokerAccountId: string, proposal: TradeProposal): Promise<void> {
    for (const trade of proposal.trades) {
      if (trade.quantity <= 0) continue;

      const orderSide = trade.direction.toLowerCase() as 'buy' | 'sell';

      await this.fetchApi(`/trading/accounts/${brokerAccountId}/orders`, context, {
        method: 'POST',
        body: JSON.stringify({
          symbol: trade.instrumentId,
          qty: trade.quantity.toString(),
          side: orderSide,
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
