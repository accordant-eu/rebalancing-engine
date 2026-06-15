import { PortfolioState, TradeProposal } from '../models/domain';
import { BrokerAdapter } from './adapter';

export class AlpacaBrokerAdapter implements BrokerAdapter {
  private baseUrl: string;
  private keyId: string;
  private secretKey: string;

  constructor() {
    this.keyId = process.env.ALPACA_BROKER_API_KEY || '';
    this.secretKey = process.env.ALPACA_BROKER_API_SECRET || '';
    // Broker API sandbox URL by default
    this.baseUrl = process.env.APCA_BROKER_URL || 'https://broker-api.sandbox.alpaca.markets/v1';
  }

  private async fetchApi(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Alpaca Broker API uses Basic Auth with keyId and secretKey
    const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:${this.secretKey}`).toString('base64');
    
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

  public async getPortfolioState(brokerAccountId: string): Promise<PortfolioState> {
    const account = await this.fetchApi(`/trading/accounts/${brokerAccountId}/account`);
    const positions = await this.fetchApi(`/trading/accounts/${brokerAccountId}/positions`);

    return {
      accountId: brokerAccountId,
      cash: parseFloat(account.cash),
      holdings: positions.map((p: any) => ({
        instrumentId: p.symbol,
        quantity: parseFloat(p.qty),
      })),
    };
  }

  public async getPrices(symbols: string[]): Promise<Record<string, number>> {
    if (symbols.length === 0) {
      return {};
    }

    const dataUrl = 'https://data.alpaca.markets/v2/stocks/snapshots?symbols=' + symbols.join(',');
    
    // For Market Data, use the standard paper keys to avoid the complex OAuth flow required for Broker keys
    const dataKey = process.env.APCA_API_KEY_ID || '';
    const dataSecret = process.env.APCA_API_SECRET_KEY || '';

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

  public async submitTrades(brokerAccountId: string, proposal: TradeProposal): Promise<void> {
    for (const trade of proposal.trades) {
      if (trade.quantity <= 0) continue;

      const orderSide = trade.direction.toLowerCase() as 'buy' | 'sell';

      await this.fetchApi(`/trading/accounts/${brokerAccountId}/orders`, {
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

  public async hasOpenOrders(brokerAccountId: string): Promise<boolean> {
    const orders = await this.fetchApi(`/trading/accounts/${brokerAccountId}/orders?status=open`);
    return orders.length > 0;
  }
}
