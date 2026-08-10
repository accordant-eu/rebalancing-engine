import { TradeOptimizerInterface, TradeOptimizerContext } from '../../core/trade-optimizer';
import { generateTradeProposal } from '../../core/trades';
import { TradeProposal } from '../../models/domain';

export class TaxAwareUsTradeGenerator implements TradeOptimizerInterface {
  readonly id = 'tax_aware_us';
  readonly name = 'US Tax-Aware Trade Optimizer (Oracle Contract)';
  readonly description = 'Delegates trade generation to an external US tax-aware optimization engine for tax-loss harvesting and wash sale prevention.';

  generateProposal(context: TradeOptimizerContext): TradeProposal {
    const { portfolioState } = context;

    if (portfolioState.taxJurisdiction && portfolioState.taxJurisdiction.toUpperCase() !== 'US') {
      throw new Error(
        `TAX_AWARE_US optimizer is restricted to US tax jurisdictions. Current portfolio jurisdiction: ${portfolioState.taxJurisdiction}`
      );
    }

    // Tranche 1 Stub Implementation:
    // Generate standard rule-based proposal and enrich metadata with tax-aware contract status
    const proposal = generateTradeProposal(
      context.valuation,
      context.targetAllocation,
      context.priceSnapshot,
      context.policy,
      context.cashFlowScheduleSummary,
      context.frictionModel,
      undefined,
      context.executionOverlays
    );

    return {
      ...proposal,
      warnings: [
        ...(proposal.warnings || []),
        {
          code: 'TAX_AWARE_US_STUB',
          message: 'TAX_AWARE_US contract active: Trades evaluated via US Tax-Aware Optimizer interface stub.',
        },
      ],
    };
  }
}
