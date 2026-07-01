import { BrokerAdapter } from '../broker/adapter';
import { TradeProposal, ExecutionContext } from '../models/domain';
import { logger } from '../utils/logger';
import { LiveStateManager } from './state';

export interface Executor {
  execute(context: ExecutionContext, brokerAccountId: string, proposal: TradeProposal, eventId: string): Promise<void>;
}

export class DryRunExecutor implements Executor {
  public async execute(context: ExecutionContext, brokerAccountId: string, proposal: TradeProposal, eventId: string): Promise<void> {
    if (proposal.trades.length === 0) {
      return;
    }

    const output = {
      timestamp: new Date().toISOString(),
      eventId,
      brokerAccountId,
      tenantId: context.tenantId,
      type: 'DRY_RUN_EXECUTION',
      proposal,
    };

    // Output to stdout to allow interactive use and pipelining
    process.stdout.write(JSON.stringify(output) + '\n');
  }
}

export class BrokerExecutor implements Executor {
  constructor(private adapter: BrokerAdapter, private stateManager?: LiveStateManager) {}

  public async execute(context: ExecutionContext, brokerAccountId: string, proposal: TradeProposal, eventId: string): Promise<void> {
    if (proposal.trades.length === 0) {
      return;
    }

    logger.info(`[BrokerExecutor] Submitting ${proposal.trades.length} trades to broker for account ${brokerAccountId} on event: ${eventId}`);
    
    const submittedOrders = await this.adapter.submitTrades(context, brokerAccountId, proposal);

    if (this.stateManager && this.stateManager.registerOrder) {
      for (const order of submittedOrders) {
        this.stateManager.registerOrder(order.orderId, brokerAccountId, order.instrumentId, order.direction, order.quantity);
      }
    }
  }
}
