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
      };
    }

    // Trigger on threshold breaches or tax loss harvesting opportunities
    const baseResult = this.thresholdStrategy.evaluateTrigger(state, drift, policy);
    
    if (baseResult.isTriggered) {
      return {
        ...baseResult,
        strategyType: 'tax_aware_us',
      };
    }
    
    return baseResult;
  }
}
