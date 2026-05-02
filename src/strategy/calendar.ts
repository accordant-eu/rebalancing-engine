import {
  DriftMeasurement,
  PortfolioState,
  RebalancingPolicy,
  StrategyInterface,
  TriggerResult,
} from '../models/domain';

export class CalendarRebalanceStrategy implements StrategyInterface {
  evaluateTrigger(
    state: PortfolioState,
    drift: DriftMeasurement[],
    policy: RebalancingPolicy,
  ): TriggerResult {
    void state;
    void drift;

    if (policy.calendar === undefined) {
      throw new Error('Calendar strategy requires calendar policy configuration');
    }

    const evaluationTime = parseIsoDate(policy.calendar.evaluationDate, 'evaluationDate');
    const nextRebalanceTime = parseIsoDate(policy.calendar.nextRebalanceDate, 'nextRebalanceDate');
    const isDue = evaluationTime >= nextRebalanceTime;

    return {
      isTriggered: isDue,
      reason: isDue ? `Calendar rebalance due on ${policy.calendar.nextRebalanceDate}.` : null,
      strategyType: 'calendar',
      metadata: {
        evaluationDate: policy.calendar.evaluationDate,
        nextRebalanceDate: policy.calendar.nextRebalanceDate,
        frequency: policy.calendar.frequency ?? 'explicit',
      },
    };
  }
}

function parseIsoDate(value: string, fieldName: string): number {
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    throw new Error(`Invalid calendar ${fieldName}: ${value}`);
  }
  return time;
}
