import { TradeOptimizerInterface, TradeOptimizerContext } from '../../core/trade-optimizer';
import { generateTradeProposal } from '../../core/trades';
import { TradeProposal } from '../../models/domain';

export class StandardRuleBasedTradeGenerator implements TradeOptimizerInterface {
  readonly id = 'standard_rule_based';
  readonly name = 'Standard Rule-Based Trade Generator';
  readonly description = 'Deterministic heuristic engine implementing full-reset and boundary-targeting rebalance algorithms.';

  generateProposal(context: TradeOptimizerContext): TradeProposal {
    return generateTradeProposal(
      context.valuation,
      context.targetAllocation,
      context.priceSnapshot,
      context.policy,
      context.cashFlowScheduleSummary,
      context.frictionModel,
      undefined,
      context.executionOverlays
    );
  }
}
