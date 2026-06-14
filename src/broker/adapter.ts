import { PortfolioState, TradeProposal } from '../models/domain';

export interface BrokerAdapter {
  /**
   * Fetches the current live portfolio state including settled cash and holdings.
   */
  getPortfolioState(): Promise<PortfolioState>;

  /**
   * Fetches current market prices for the given symbols.
   */
  getPrices(symbols: string[]): Promise<Record<string, number>>;

  /**
   * Submits trade proposals to the broker for execution.
   */
  submitTrades(proposal: TradeProposal): Promise<void>;

  /**
   * Checks if there are any pending/open orders at the broker.
   */
  hasOpenOrders(): Promise<boolean>;
}
