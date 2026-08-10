import {
  DriftMeasurement,
  PortfolioState,
  RebalancingPolicy,
  StrategyInterface,
  TriggerResult,
} from '../models/domain';
import { ThresholdStrategy } from './threshold';

export class TaxAwareUsStrategy implements StrategyInterface {
  private thresholdStrategy = new ThresholdStrategy();

  evaluateTrigger(
    state: PortfolioState,
    drift: DriftMeasurement[],
    policy: RebalancingPolicy
  ): TriggerResult {
    if (state.taxJurisdiction && state.taxJurisdiction.toUpperCase() !== 'US') {
      return {
        isTriggered: false,
        reason: `TAX_AWARE_US strategy is restricted to US tax jurisdictions (portfolio jurisdiction: ${state.taxJurisdiction}).`,
        strategyType: 'tax_aware_us',
      };
    }

    // Trigger on threshold breaches or tax loss harvesting opportunities
    const baseResult = this.thresholdStrategy.evaluateTrigger(state, drift, policy);
    return {
      ...baseResult,
      strategyType: 'tax_aware_us',
    };
  }
}
