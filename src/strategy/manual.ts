import {
  DriftMeasurement,
  PortfolioState,
  RebalancingPolicy,
  StrategyInterface,
  TriggerResult,
} from '../models/domain';

export class ManualRebalanceStrategy implements StrategyInterface {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  evaluateTrigger(
    _state: PortfolioState,
    _drift: DriftMeasurement[],
    _policy: RebalancingPolicy,
  ): TriggerResult {
    return {
      isTriggered: true,
      reason: 'Manual rebalance requested.',
      strategyType: 'manual',
    };
  }
}
