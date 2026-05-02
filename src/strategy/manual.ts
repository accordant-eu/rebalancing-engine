import {
  DriftMeasurement,
  PortfolioState,
  RebalancingPolicy,
  StrategyInterface,
  TriggerResult,
} from '../models/domain';

export class ManualRebalanceStrategy implements StrategyInterface {
  evaluateTrigger(
    state: PortfolioState,
    drift: DriftMeasurement[],
    policy: RebalancingPolicy,
  ): TriggerResult {
    void state;
    void drift;
    void policy;

    return {
      isTriggered: true,
      reason: 'Manual rebalance requested.',
    };
  }
}
