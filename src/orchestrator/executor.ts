import { BrokerAdapter } from '../broker/adapter';
import { TradeProposal } from '../models/domain';

export interface Executor {
  execute(proposal: TradeProposal, eventId: string): void;
}

export class DryRunExecutor implements Executor {
  public execute(proposal: TradeProposal, eventId: string): void {
    if (proposal.trades.length === 0) {
      return;
    }

    const output = {
      timestamp: new Date().toISOString(),
      eventId,
      type: 'DRY_RUN_EXECUTION',
      proposal,
    };

    // Output to stdout to allow interactive use and pipelining
    process.stdout.write(JSON.stringify(output) + '\n');
  }
}

export class BrokerExecutor implements Executor {
  constructor(private adapter: BrokerAdapter) {}

  public execute(proposal: TradeProposal, eventId: string): void {
    if (proposal.trades.length === 0) {
      return;
    }

    console.error(`[BrokerExecutor] Submitting ${proposal.trades.length} trades to broker for event: ${eventId}`);
    
    // The orchestration loop is synchronous, so we fire-and-forget the async submission
    // with a strict catch handler for logging fatal errors.
    this.adapter.submitTrades(proposal).catch((err) => {
      console.error(`[BrokerExecutor] CRITICAL ERROR SUBMITTING TRADES:`, err);
    });
  }
}
