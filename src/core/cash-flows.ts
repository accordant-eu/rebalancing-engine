import {
  CashFlow,
  CashFlowDirection,
  CashFlowRecurrenceFrequency,
  CashFlowSchedule,
  PortfolioState,
} from '../models/domain';
import { toDecimal } from './numeric';

const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_GENERATED_OCCURRENCES_PER_SCHEDULE = 1200;

export type CashFlowScheduleEventStatus = 'APPLIED' | 'FUTURE' | 'ALREADY_REPRESENTED';

export interface CashFlowScheduleEvent {
  cashFlowId: string;
  cashFlowScheduleId: string;
  direction: CashFlowDirection;
  amount: number;
  effectiveDate: string;
  status: CashFlowScheduleEventStatus;
  recurrenceOrdinal?: number;
  description?: string;
}

export interface CashFlowScheduleSummary {
  evaluationDate: string;
  sourceScheduleCount: number;
  appliedEventCount: number;
  futureEventCount: number;
  alreadyRepresentedEventCount: number;
  appliedDeposits: number;
  appliedWithdrawals: number;
  futureDeposits: number;
  futureWithdrawals: number;
  netAppliedCashFlow: number;
  netFutureCashFlow: number;
  appliedEvents: CashFlowScheduleEvent[];
  futureEvents: CashFlowScheduleEvent[];
  alreadyRepresentedEvents: CashFlowScheduleEvent[];
}

export interface CashFlowScheduleExpansion {
  portfolioState: PortfolioState;
  summary?: CashFlowScheduleSummary;
}

export function applyCashFlowSchedules(
  state: PortfolioState,
  evaluationDate: string | undefined,
): CashFlowScheduleExpansion {
  if (state.cashFlowSchedules === undefined || state.cashFlowSchedules.length === 0) {
    return {
      portfolioState: {
        ...state,
        holdings: [...state.holdings],
        cashFlows: state.cashFlows === undefined ? undefined : [...state.cashFlows],
      },
    };
  }

  if (evaluationDate === undefined) {
    throw new Error('evaluationDate is required when cashFlowSchedules are supplied');
  }
  validateIsoDateOnly(evaluationDate, 'evaluationDate');

  const existingCashFlowIds = new Set((state.cashFlows ?? []).map((cashFlow) => cashFlow.cashFlowId));
  const schedules = validateCashFlowSchedules(state.cashFlowSchedules);
  const appliedEvents: CashFlowScheduleEvent[] = [];
  const futureEvents: CashFlowScheduleEvent[] = [];
  const alreadyRepresentedEvents: CashFlowScheduleEvent[] = [];
  const generatedAppliedCashFlows: CashFlow[] = [];

  for (const schedule of schedules) {
    for (const event of expandCashFlowSchedule(schedule, evaluationDate)) {
      if (event.effectiveDate > evaluationDate) {
        futureEvents.push({ ...event, status: 'FUTURE' });
        continue;
      }

      if (existingCashFlowIds.has(event.cashFlowId)) {
        alreadyRepresentedEvents.push({ ...event, status: 'ALREADY_REPRESENTED' });
        continue;
      }

      existingCashFlowIds.add(event.cashFlowId);
      appliedEvents.push({ ...event, status: 'APPLIED' });
      generatedAppliedCashFlows.push({
        cashFlowId: event.cashFlowId,
        direction: event.direction,
        status: 'PENDING',
        amount: event.amount,
        effectiveDate: event.effectiveDate,
        description: event.description,
        source: 'SCHEDULE',
        sourceScheduleId: event.cashFlowScheduleId,
      });
    }
  }

  const summary = buildCashFlowScheduleSummary(
    evaluationDate,
    schedules.length,
    appliedEvents,
    futureEvents,
    alreadyRepresentedEvents,
  );

  return {
    portfolioState: {
      ...state,
      holdings: [...state.holdings],
      cashFlows:
        state.cashFlows === undefined
          ? generatedAppliedCashFlows
          : [...state.cashFlows, ...generatedAppliedCashFlows],
    },
    summary,
  };
}

export function validateCashFlowSchedules(schedules: CashFlowSchedule[]): CashFlowSchedule[] {
  const seenScheduleIds = new Set<string>();

  return schedules.map((schedule) => {
    if (
      typeof schedule.cashFlowScheduleId !== 'string' ||
      schedule.cashFlowScheduleId.trim() === ''
    ) {
      throw new Error('Cash flow schedule ID is required');
    }
    if (seenScheduleIds.has(schedule.cashFlowScheduleId)) {
      throw new Error(`Duplicate cash flow schedule ID: ${schedule.cashFlowScheduleId}`);
    }
    seenScheduleIds.add(schedule.cashFlowScheduleId);
    validateCashFlowDirection(schedule.direction);
    if (typeof schedule.amount !== 'number' || schedule.amount <= 0) {
      throw new Error(
        `Cash flow schedule amount must be positive: ${schedule.cashFlowScheduleId}`,
      );
    }
    if (typeof schedule.effectiveDate !== 'string') {
      throw new Error(
        `Cash flow schedule effectiveDate is required: ${schedule.cashFlowScheduleId}`,
      );
    }
    validateIsoDateOnly(schedule.effectiveDate, `cashFlowSchedule ${schedule.cashFlowScheduleId}`);

    if (schedule.recurrence !== undefined) {
      validateRecurrence(schedule);
    }

    return schedule;
  });
}

export function validateIsoDateOnly(value: string, label: string): void {
  if (!ISO_DATE_ONLY_PATTERN.test(value)) {
    throw new Error(`${label} must be an ISO date-only string in YYYY-MM-DD format`);
  }

  const { year, month, day } = parseDateOnly(value);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`${label} must be a valid ISO date-only string`);
  }
}

function validateRecurrence(schedule: CashFlowSchedule): void {
  const recurrence = schedule.recurrence;
  if (recurrence === undefined) {
    return;
  }

  if (typeof recurrence.frequency !== 'string' || !isRecurrenceFrequency(recurrence.frequency)) {
    throw new Error(
      `Unsupported cash flow recurrence frequency for ${schedule.cashFlowScheduleId}: ${recurrence.frequency}`,
    );
  }
  if (recurrence.endDate !== undefined) {
    if (typeof recurrence.endDate !== 'string') {
      throw new Error(`Cash flow schedule endDate must be an ISO date string: ${schedule.cashFlowScheduleId}`);
    }
    validateIsoDateOnly(recurrence.endDate, `cashFlowSchedule ${schedule.cashFlowScheduleId} endDate`);
    if (recurrence.endDate < schedule.effectiveDate) {
      throw new Error(
        `Cash flow schedule endDate cannot be before effectiveDate: ${schedule.cashFlowScheduleId}`,
      );
    }
  }
  if (recurrence.occurrenceCount !== undefined) {
    if (!Number.isInteger(recurrence.occurrenceCount) || recurrence.occurrenceCount <= 0) {
      throw new Error(
        `Cash flow schedule occurrenceCount must be a positive integer: ${schedule.cashFlowScheduleId}`,
      );
    }
  }
}

function expandCashFlowSchedule(
  schedule: CashFlowSchedule,
  evaluationDate: string,
): CashFlowScheduleEvent[] {
  if (schedule.recurrence === undefined) {
    return [buildScheduleEvent(schedule, schedule.effectiveDate)];
  }

  const recurrence = schedule.recurrence;
  const step = getRecurrenceStep(recurrence.frequency);
  const endDate = recurrence.endDate ?? evaluationDate;
  const occurrenceLimit =
    recurrence.occurrenceCount ?? MAX_GENERATED_OCCURRENCES_PER_SCHEDULE;
  const events: CashFlowScheduleEvent[] = [];

  for (let ordinal = 1; ordinal <= occurrenceLimit; ordinal += 1) {
    const effectiveDate =
      step.unit === 'DAYS'
        ? addDays(schedule.effectiveDate, (ordinal - 1) * step.value)
        : addMonths(schedule.effectiveDate, (ordinal - 1) * step.value);
    if (effectiveDate > endDate) {
      break;
    }

    events.push(buildScheduleEvent(schedule, effectiveDate, ordinal));

    if (ordinal === MAX_GENERATED_OCCURRENCES_PER_SCHEDULE) {
      throw new Error(
        `Cash flow schedule generated too many occurrences: ${schedule.cashFlowScheduleId}`,
      );
    }
  }

  return events;
}

function buildScheduleEvent(
  schedule: CashFlowSchedule,
  effectiveDate: string,
  recurrenceOrdinal?: number,
): CashFlowScheduleEvent {
  return {
    cashFlowId: `schedule:${schedule.cashFlowScheduleId}:${effectiveDate}`,
    cashFlowScheduleId: schedule.cashFlowScheduleId,
    direction: schedule.direction,
    amount: schedule.amount,
    effectiveDate,
    status: 'FUTURE',
    recurrenceOrdinal,
    description: schedule.description,
  };
}

function buildCashFlowScheduleSummary(
  evaluationDate: string,
  sourceScheduleCount: number,
  appliedEvents: CashFlowScheduleEvent[],
  futureEvents: CashFlowScheduleEvent[],
  alreadyRepresentedEvents: CashFlowScheduleEvent[],
): CashFlowScheduleSummary {
  const appliedDeposits = sumEvents(appliedEvents, 'DEPOSIT');
  const appliedWithdrawals = sumEvents(appliedEvents, 'WITHDRAWAL');
  const futureDeposits = sumEvents(futureEvents, 'DEPOSIT');
  const futureWithdrawals = sumEvents(futureEvents, 'WITHDRAWAL');

  return {
    evaluationDate,
    sourceScheduleCount,
    appliedEventCount: appliedEvents.length,
    futureEventCount: futureEvents.length,
    alreadyRepresentedEventCount: alreadyRepresentedEvents.length,
    appliedDeposits,
    appliedWithdrawals,
    futureDeposits,
    futureWithdrawals,
    netAppliedCashFlow: toDecimal(appliedDeposits).minus(appliedWithdrawals).toNumber(),
    netFutureCashFlow: toDecimal(futureDeposits).minus(futureWithdrawals).toNumber(),
    appliedEvents: sortEvents(appliedEvents),
    futureEvents: sortEvents(futureEvents),
    alreadyRepresentedEvents: sortEvents(alreadyRepresentedEvents),
  };
}

function sumEvents(events: CashFlowScheduleEvent[], direction: CashFlowDirection): number {
  return events
    .filter((event) => event.direction === direction)
    .reduce((total, event) => total.plus(event.amount), toDecimal(0))
    .toNumber();
}

function sortEvents(events: CashFlowScheduleEvent[]): CashFlowScheduleEvent[] {
  return [...events].sort(
    (left, right) =>
      left.effectiveDate.localeCompare(right.effectiveDate) ||
      left.cashFlowScheduleId.localeCompare(right.cashFlowScheduleId) ||
      left.cashFlowId.localeCompare(right.cashFlowId),
  );
}

function getRecurrenceStep(
  frequency: CashFlowRecurrenceFrequency,
): { unit: 'DAYS' | 'MONTHS'; value: number } {
  switch (frequency) {
    case 'WEEKLY':
      return { unit: 'DAYS', value: 7 };
    case 'MONTHLY':
      return { unit: 'MONTHS', value: 1 };
    case 'QUARTERLY':
      return { unit: 'MONTHS', value: 3 };
    case 'ANNUAL':
      return { unit: 'MONTHS', value: 12 };
  }
}

function addMonths(dateOnly: string, monthDelta: number): string {
  const { year, month, day } = parseDateOnly(dateOnly);
  const zeroBasedMonth = month - 1 + monthDelta;
  const targetYear = year + Math.floor(zeroBasedMonth / 12);
  const targetMonthIndex = ((zeroBasedMonth % 12) + 12) % 12;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonthIndex + 1));
  return formatDateOnly(targetYear, targetMonthIndex + 1, targetDay);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addDays(dateOnly: string, dayDelta: number): string {
  if (dayDelta === 0) return dateOnly;
  const { year, month, day } = parseDateOnly(dateOnly);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + dayDelta);
  return formatDateOnly(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function parseDateOnly(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function formatDateOnly(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function validateCashFlowDirection(direction: string): void {
  if (direction !== 'DEPOSIT' && direction !== 'WITHDRAWAL') {
    throw new Error(`Unsupported cash flow direction: ${direction}`);
  }
}

function isRecurrenceFrequency(value: string): value is CashFlowRecurrenceFrequency {
  return value === 'WEEKLY' || value === 'MONTHLY' || value === 'QUARTERLY' || value === 'ANNUAL';
}
