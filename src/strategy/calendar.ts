import { validateIsoDateOnly } from '../core/cash-flows';
import {
  DriftMeasurement,
  PortfolioState,
  RebalancingPolicy,
  StrategyInterface,
  TriggerResult,
} from '../models/domain';

export class CalendarRebalanceStrategy implements StrategyInterface {
  evaluateTrigger(
    _state: PortfolioState,
    _drift: DriftMeasurement[],
    policy: RebalancingPolicy,
  ): TriggerResult {
    if (policy.calendar === undefined) {
      throw new Error('Calendar strategy requires calendar policy configuration');
    }

    const evaluationTime = parseIsoDateOnly(policy.calendar.evaluationDate, 'evaluationDate');
    const nextRebalanceTime = parseIsoDateOnly(policy.calendar.nextRebalanceDate, 'nextRebalanceDate');
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

// Validates YYYY-MM-DD format before parsing to prevent timezone-local ambiguity
// from datetime strings without a Z suffix.
function parseIsoDateOnly(value: string, fieldName: string): number {
  validateIsoDateOnly(value, `calendar ${fieldName}`);
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    throw new Error(`Invalid calendar ${fieldName}: ${value}`);
  }
  return time;
}
