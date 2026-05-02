import {
  DriftMeasurement,
  PortfolioState,
  RebalancingPolicy,
  StrategyInterface,
  TriggerResult,
} from '../models/domain';
import { formatFixed } from '../core/numeric';

export class ThresholdStrategy implements StrategyInterface {
  evaluateTrigger(
    _state: PortfolioState, // Threshold strategy doesn't strictly need state if drift is already calculated, but it's part of the interface
    drift: DriftMeasurement[],
    policy: RebalancingPolicy,
  ): TriggerResult {
    const breaches = drift.filter((d) => d.isOutOfBand);

    if (breaches.length === 0) {
      return {
        isTriggered: false,
        reason: null,
        strategyType: 'threshold',
      };
    }

    const breachDescriptions = breaches.map((b) => {
      const relativeDescription =
        policy.relativeDriftTolerance !== undefined && b.targetWeight > 0
          ? `, rel drift: ${formatFixed(b.relativeDrift * 100, 2)}%`
          : '';
      return `${b.instrumentId} (abs drift: ${formatFixed(b.absoluteDrift * 100, 2)}%${relativeDescription})`;
    });
    const relativeToleranceDescription =
      policy.relativeDriftTolerance === undefined
        ? ''
        : ` Relative tolerance: ${formatFixed(policy.relativeDriftTolerance * 100, 2)}%.`;

    return {
      isTriggered: true,
      reason: `Breached tolerance bands for: ${breachDescriptions.join(', ')}. Policy absolute tolerance: ${formatFixed(policy.absoluteDriftTolerance * 100, 2)}%.${relativeToleranceDescription}`,
      strategyType: 'threshold',
      metadata: {
        breachCount: breaches.length,
      },
    };
  }
}
