import { advanceDateByFrequency, MandateSchedulerService } from '../src/orchestrator/scheduler';
import { MultiPortfolioStateManager } from '../src/orchestrator/state';
import { RebalancingPolicy, TargetAllocation } from '../src/models/domain';
import { systemEventBus } from '../src/events/bus';

describe('MandateSchedulerService & Calendar Math (ADR-0064)', () => {
  describe('advanceDateByFrequency', () => {
    it('advances monthly by 1 calendar month in UTC', () => {
      expect(advanceDateByFrequency('2026-08-01', 'monthly')).toBe('2026-09-01');
      expect(advanceDateByFrequency('2026-08-15', 'monthly')).toBe('2026-09-15');
    });

    it('advances quarterly by 3 calendar months', () => {
      expect(advanceDateByFrequency('2026-08-15', 'quarterly')).toBe('2026-11-15');
    });

    it('advances annually by 1 calendar year', () => {
      expect(advanceDateByFrequency('2026-08-15', 'annually')).toBe('2027-08-15');
    });

    it('clamps month-end dates to the last valid day of shorter months', () => {
      // Jan 31 -> Feb 28 in non-leap year 2026
      expect(advanceDateByFrequency('2026-01-31', 'monthly')).toBe('2026-02-28');
      // Jan 31 -> Feb 29 in leap year 2024
      expect(advanceDateByFrequency('2024-01-31', 'monthly')).toBe('2024-02-29');
      // March 31 -> April 30
      expect(advanceDateByFrequency('2026-03-31', 'monthly')).toBe('2026-04-30');
    });

    it('handles year roll-over properly', () => {
      expect(advanceDateByFrequency('2026-11-15', 'quarterly')).toBe('2027-02-15');
      expect(advanceDateByFrequency('2026-12-01', 'monthly')).toBe('2027-01-01');
    });

    it('throws on invalid ISO date format', () => {
      expect(() => advanceDateByFrequency('invalid-date', 'monthly')).toThrow();
    });
  });

  describe('MandateSchedulerService Scanning and Enqueueing', () => {
    let stateManager: MultiPortfolioStateManager;
    let scheduler: MandateSchedulerService;

    const defaultTarget: TargetAllocation = {
      targets: [{ instrumentId: 'AAPL', weight: 1.0 }],
    };

    beforeEach(() => {
      stateManager = new MultiPortfolioStateManager();
      scheduler = new MandateSchedulerService(stateManager, { autoAdvanceDates: true });
    });

    afterEach(() => {
      scheduler.stop();
      jest.clearAllMocks();
    });

    it('enqueues due calendar portfolios and auto-advances nextRebalanceDate', () => {
      // Account 1: Calendar monthly, due on 2026-08-01
      const policy1: RebalancingPolicy = {
        strategyType: 'calendar',
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 10,
        calendar: {
          evaluationDate: '2026-07-01',
          nextRebalanceDate: '2026-08-01',
          frequency: 'monthly',
        },
      };

      // Account 2: Calendar monthly, future date (2026-08-15) -> not due
      const policy2: RebalancingPolicy = {
        strategyType: 'calendar',
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 10,
        calendar: {
          evaluationDate: '2026-07-15',
          nextRebalanceDate: '2026-08-15',
          frequency: 'monthly',
        },
      };

      // Account 3: Threshold strategy -> not calendar
      const policy3: RebalancingPolicy = {
        strategyType: 'threshold',
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 10,
      };

      stateManager.registerPortfolio('acc-due', {
        portfolioState: { accountId: 'acc-due', cash: 1000, holdings: [] },
        priceSnapshot: { prices: { AAPL: 100 } },
        targetAllocation: defaultTarget,
        policy: policy1,
        archetype: 'tax_deferred',
      });

      stateManager.registerPortfolio('acc-not-due', {
        portfolioState: { accountId: 'acc-not-due', cash: 1000, holdings: [] },
        priceSnapshot: { prices: { AAPL: 100 } },
        targetAllocation: defaultTarget,
        policy: policy2,
        archetype: 'tax_deferred',
      });

      stateManager.registerPortfolio('acc-threshold', {
        portfolioState: { accountId: 'acc-threshold', cash: 1000, holdings: [] },
        priceSnapshot: { prices: { AAPL: 100 } },
        targetAllocation: defaultTarget,
        policy: policy3,
        archetype: 'tax_deferred',
      });

      const eventSpy = jest.fn();
      systemEventBus.on('system_event', eventSpy);

      const result = scheduler.scanAndEnqueue('2026-08-01');

      expect(result.scanned).toBe(3);
      expect(result.enqueued).toBe(1);
      expect(result.accountIds).toEqual(['acc-due']);

      // Check that acc-due was queued
      const dequeued = stateManager.dequeuePortfolios(10);
      expect(dequeued).toContain('acc-due');
      expect(dequeued).not.toContain('acc-not-due');
      expect(dequeued).not.toContain('acc-threshold');

      // Check that nextRebalanceDate was auto-advanced from 2026-08-01 to 2026-09-01
      const updatedState = stateManager.getAccountState('acc-due');
      expect(updatedState.policy.calendar?.nextRebalanceDate).toBe('2026-09-01');
      expect(updatedState.policy.calendar?.evaluationDate).toBe('2026-08-01');

      // Check that event was emitted
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MANDATE_SCHEDULE_EVALUATED',
          data: expect.objectContaining({
            enqueued: 1,
            accountIds: ['acc-due'],
          }),
        })
      );
    });

    it('does not advance dates when frequency is explicit', () => {
      const policyExplicit: RebalancingPolicy = {
        strategyType: 'calendar',
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 10,
        calendar: {
          evaluationDate: '2026-08-01',
          nextRebalanceDate: '2026-08-01',
          frequency: 'explicit',
        },
      };

      stateManager.registerPortfolio('acc-explicit', {
        portfolioState: { accountId: 'acc-explicit', cash: 1000, holdings: [] },
        priceSnapshot: { prices: {} },
        targetAllocation: defaultTarget,
        policy: policyExplicit,
        archetype: 'tax_deferred',
      });

      const result = scheduler.scanAndEnqueue('2026-08-01');
      expect(result.enqueued).toBe(1);

      const updatedState = stateManager.getAccountState('acc-explicit');
      expect(updatedState.policy.calendar?.nextRebalanceDate).toBe('2026-08-01'); // Unchanged
    });

    it('starts and stops cron schedule cleanly', () => {
      expect(() => scheduler.start('0 9 * * 1-5')).not.toThrow();
      expect(() => scheduler.stop()).not.toThrow();
    });
  });
});
