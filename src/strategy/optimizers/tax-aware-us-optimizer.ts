import { TradeOptimizerInterface, TradeOptimizerContext } from '../../core/trade-optimizer';
import { OracleTaxOptimizerAdapter, OracleAdapterConfig } from '../../core/oracle-adapter';
import { TradeProposal } from '../../models/domain';

export class TaxAwareUsTradeGenerator implements TradeOptimizerInterface {
  readonly id = 'tax_aware_us';
  readonly name = 'US Tax-Aware Trade Optimizer (Oracle Contract)';
  readonly description = 'Delegates trade generation to an external US tax-aware optimization engine for tax-loss harvesting and wash sale prevention.';

  private adapter: OracleTaxOptimizerAdapter;

  constructor(config?: OracleAdapterConfig) {
    this.adapter = new OracleTaxOptimizerAdapter(config);
  }

  public async generateProposal(context: TradeOptimizerContext): Promise<TradeProposal> {
    const { portfolioState } = context;

    if (portfolioState.taxJurisdiction && portfolioState.taxJurisdiction.toUpperCase() !== 'US') {
      throw new Error(
        `TAX_AWARE_US optimizer is restricted to US tax jurisdictions. Current portfolio jurisdiction: ${portfolioState.taxJurisdiction}`
      );
    }

    return this.adapter.generateProposal(context);
  }
}
