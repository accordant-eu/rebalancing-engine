import { BrokerAdapter } from './adapter';
import { AlpacaBrokerAdapter } from './alpaca-broker';
import { IbkrBrokerAdapter } from './ibkr-broker';

export class BrokerAdapterFactory {
  public static getAdapter(brokerType: string = 'ALPACA'): BrokerAdapter {
    const normalized = (brokerType || 'MOCK').toUpperCase();
    if (normalized === 'IBKR') {
      return new IbkrBrokerAdapter();
    }

    return new AlpacaBrokerAdapter();
  }
}
