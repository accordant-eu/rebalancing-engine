import { PortfolioState, TradeProposal } from '../models/domain';

export interface BrokerAdapter {
  /**
   * Fetches the current live portfolio state including settled cash and holdings for a sub-account.
   */
  getPortfolioState(brokerAccountId: string): Promise<PortfolioState>;

  /**
   * Fetches current market prices for the given symbols.
   */
  getPrices(symbols: string[]): Promise<Record<string, number>>;

  /**
   * Submits trade proposals to the broker for execution on behalf of a sub-account.
   */
  submitTrades(brokerAccountId: string, proposal: TradeProposal): Promise<void>;

  /**
   * Checks if there are any pending/open orders at the broker for a sub-account.
   */
  hasOpenOrders(brokerAccountId: string): Promise<boolean>;
}
