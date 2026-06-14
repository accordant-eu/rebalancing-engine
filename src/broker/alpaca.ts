import Alpaca from '@alpacahq/alpaca-trade-api';
import { PortfolioState, TradeProposal } from '../models/domain';
import { BrokerAdapter } from './adapter';

export class AlpacaAdapter implements BrokerAdapter {
  private alpaca: any;

  constructor() {
    this.alpaca = new Alpaca({
      keyId: process.env.APCA_API_KEY_ID,
      secretKey: process.env.APCA_API_SECRET_KEY,
      paper: true,
    });
  }

  public async getPortfolioState(): Promise<PortfolioState> {
    const account = await this.alpaca.getAccount();
    const positions = await this.alpaca.getPositions();

    return {
      accountId: account.id || 'alpaca-account',
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

    const snapshots = await this.alpaca.getSnapshots(symbols);
    const prices: Record<string, number> = {};

    for (const snapshot of snapshots) {
      if (snapshot.LatestTrade && snapshot.LatestTrade.Price) {
        prices[snapshot.symbol] = snapshot.LatestTrade.Price;
      } else if (snapshot.DailyBar && snapshot.DailyBar.ClosePrice) {
        prices[snapshot.symbol] = snapshot.DailyBar.ClosePrice;
      }
    }

    return prices;
  }

  public async submitTrades(proposal: TradeProposal): Promise<void> {
    for (const trade of proposal.trades) {
      if (trade.quantity <= 0) continue;

      const orderSide = trade.direction.toLowerCase() as 'buy' | 'sell';

      await this.alpaca.createOrder({
        symbol: trade.instrumentId,
        qty: trade.quantity,
        side: orderSide,
        type: 'market',
        time_in_force: 'day',
      });
    }
  }
}
