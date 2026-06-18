import { BrokerAdapter } from '../broker/adapter';
import { TradeProposal, ExecutionContext } from '../models/domain';
import { logger } from '../utils/logger';

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
  constructor(private adapter: BrokerAdapter) {}

  public async execute(context: ExecutionContext, brokerAccountId: string, proposal: TradeProposal, eventId: string): Promise<void> {
    if (proposal.trades.length === 0) {
      return;
    }

    logger.info(`[BrokerExecutor] Submitting ${proposal.trades.length} trades to broker for account ${brokerAccountId} on event: ${eventId}`);
    
    await this.adapter.submitTrades(context, brokerAccountId, proposal);
  }
}
