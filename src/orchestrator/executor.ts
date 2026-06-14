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
