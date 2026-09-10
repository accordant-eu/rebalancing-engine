import * as cron from 'node-cron';
import { LiveStateManager } from './state';
import { logger } from '../utils/logger';
import { systemEventBus } from '../events/bus';
import { validateIsoDateOnly } from '../core/cash-flows';
import { RebalancingPolicy } from '../models/domain';

/**
 * Deterministically advances an ISO YYYY-MM-DD date string by frequency in pure UTC.
 * Clamps to valid end-of-month days (e.g. 2026-01-31 + monthly -> 2026-02-28).
 */
export function advanceDateByFrequency(
  dateStr: string,
  frequency: 'monthly' | 'quarterly' | 'annually'
): string {
  validateIsoDateOnly(dateStr, 'calendar date');
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12
  const day = parseInt(dayStr, 10); // 1-31

  let monthsToAdd = 1;
  if (frequency === 'quarterly') monthsToAdd = 3;
  if (frequency === 'annually') monthsToAdd = 12;

  const targetMonthIndex = (month - 1) + monthsToAdd; // 0-based
  const newYear = year + Math.floor(targetMonthIndex / 12);
  const newMonth = (targetMonthIndex % 12) + 1; // 1-12

  // Determine maximum days in the target month (UTC Date month is 1-indexed for day 0)
  const daysInNewMonth = new Date(Date.UTC(newYear, newMonth, 0)).getUTCDate();
  const newDay = Math.min(day, daysInNewMonth);

  const yStr = String(newYear);
  const mStr = String(newMonth).padStart(2, '0');
  const dStr = String(newDay).padStart(2, '0');

  return `${yStr}-${mStr}-${dStr}`;
}

export interface MandateSchedulerConfig {
  cronSchedule?: string; // Default: '0 9 * * 1-5' (market open weekdays)
  autoAdvanceDates?: boolean; // Default: true
}

export interface MandateScanResult {
  evaluationDate: string;
  scanned: number;
  enqueued: number;
  accountIds: string[];
}

export interface UpcomingMandateAccount {
  accountId: string;
  tenantId?: string;
  frequency: 'monthly' | 'quarterly' | 'annually' | 'explicit';
  nextRebalanceDate: string;
  evaluationDate?: string;
}

export interface MandateSchedulerStatus {
  isRunning: boolean;
  cronSchedule: string;
  autoAdvanceDates: boolean;
  calendarAccountsCount: number;
  frequencyBreakdown: {
    monthly: number;
    quarterly: number;
    annually: number;
    explicit: number;
  };
  upcomingAccounts: UpcomingMandateAccount[];
}

export class MandateSchedulerService {
  private scheduledTask: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;
  private cronSchedule: string;
  private autoAdvanceDates: boolean;

  constructor(
    private stateManager: LiveStateManager,
    config: MandateSchedulerConfig = {}
  ) {
    this.cronSchedule = config.cronSchedule ?? '0 9 * * 1-5';
    this.autoAdvanceDates = config.autoAdvanceDates ?? true;
  }

  public start(customCron?: string): void {
    if (this.isRunning) return;
    const expr = customCron || this.cronSchedule;
    this.scheduledTask = cron.schedule(expr, () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        this.scanAndEnqueue(today);
      } catch (err: any) {
        logger.error({ err: err.message }, 'MandateSchedulerService cron execution failed');
      }
    });
    this.isRunning = true;
    logger.info({ cron: expr }, 'MandateSchedulerService started');
  }

  public stop(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
    }
    this.isRunning = false;
    logger.info('MandateSchedulerService stopped');
  }

  public scanAndEnqueue(evaluationDate?: string): MandateScanResult {
    const evalDate = evaluationDate || new Date().toISOString().slice(0, 10);
    validateIsoDateOnly(evalDate, 'evaluationDate');

    const accountIds = this.stateManager.getAllAccountIds();
    const enqueuedAccounts: string[] = [];
    const now = Date.now();

    for (const accountId of accountIds) {
      const state = this.stateManager.getAccountState(accountId);
      if (!state || !state.policy) continue;

      const policy = state.policy;
      if (policy.strategyType !== 'calendar' || !policy.calendar) continue;

      const nextRebalanceDate = policy.calendar.nextRebalanceDate;
      if (!nextRebalanceDate) continue;

      // Check if due: evalDate >= nextRebalanceDate
      if (evalDate >= nextRebalanceDate) {
        this.stateManager.enqueuePortfolio(accountId, now);
        enqueuedAccounts.push(accountId);

        // Optionally advance nextRebalanceDate
        if (this.autoAdvanceDates && policy.calendar.frequency && policy.calendar.frequency !== 'explicit') {
          const updatedNextDate = advanceDateByFrequency(nextRebalanceDate, policy.calendar.frequency);
          const updatedPolicy: RebalancingPolicy = {
            ...policy,
            calendar: {
              ...policy.calendar,
              evaluationDate: evalDate,
              nextRebalanceDate: updatedNextDate,
            },
          };
          this.stateManager.updatePolicy(accountId, updatedPolicy);
        }
      }
    }

    const result: MandateScanResult = {
      evaluationDate: evalDate,
      scanned: accountIds.length,
      enqueued: enqueuedAccounts.length,
      accountIds: enqueuedAccounts,
    };

    systemEventBus.emitEvent({
      type: 'MANDATE_SCHEDULE_EVALUATED',
      data: result,
      timestamp: new Date().toISOString(),
    });

    logger.info(result, 'MandateSchedulerService scan completed');
    return result;
  }

  public getStatus(): MandateSchedulerStatus {
    const accountIds = this.stateManager.getAllAccountIds();
    let calendarAccountsCount = 0;
    const frequencyBreakdown = {
      monthly: 0,
      quarterly: 0,
      annually: 0,
      explicit: 0,
    };
    const upcomingAccounts: UpcomingMandateAccount[] = [];

    for (const accountId of accountIds) {
      const state = this.stateManager.getAccountState(accountId);
      if (!state || !state.policy) continue;

      const policy = state.policy;
      if (policy.strategyType !== 'calendar' || !policy.calendar) continue;

      calendarAccountsCount++;
      const freq = (policy.calendar.frequency || 'explicit') as keyof typeof frequencyBreakdown;
      if (frequencyBreakdown[freq] !== undefined) {
        frequencyBreakdown[freq]++;
      } else {
        frequencyBreakdown.explicit++;
      }

      if (policy.calendar.nextRebalanceDate) {
        upcomingAccounts.push({
          accountId,
          tenantId: state.portfolioState.tenantId,
          frequency: (policy.calendar.frequency || 'explicit') as any,
          nextRebalanceDate: policy.calendar.nextRebalanceDate,
          evaluationDate: policy.calendar.evaluationDate,
        });
      }
    }

    upcomingAccounts.sort((a, b) => a.nextRebalanceDate.localeCompare(b.nextRebalanceDate));

    return {
      isRunning: this.isRunning,
      cronSchedule: this.cronSchedule,
      autoAdvanceDates: this.autoAdvanceDates,
      calendarAccountsCount,
      frequencyBreakdown,
      upcomingAccounts,
    };
  }
}
