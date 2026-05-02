import { applyCashFlowSchedules } from '../src/core/cash-flows';
import { PortfolioState } from '../src/models/domain';

function baseState(cashFlowSchedules: PortfolioState['cashFlowSchedules']): PortfolioState {
  return {
    accountId: 'cash-flow-schedule-test',
    cash: 0,
    holdings: [],
    cashFlowSchedules,
  };
}

describe('Scheduled cash-flow expansion', () => {
  it('applies one-off schedules before and on the evaluation date', () => {
    const result = applyCashFlowSchedules(
      baseState([
        {
          cashFlowScheduleId: 'before',
          direction: 'DEPOSIT',
          amount: 100,
          effectiveDate: '2026-04-30',
        },
        {
          cashFlowScheduleId: 'on-date',
          direction: 'WITHDRAWAL',
          amount: 25,
          effectiveDate: '2026-05-02',
        },
      ]),
      '2026-05-02',
    );

    expect(result.summary?.appliedEventCount).toBe(2);
    expect(result.summary?.futureEventCount).toBe(0);
    expect(result.summary?.netAppliedCashFlow).toBe(75);
    expect(result.portfolioState.cashFlows?.map((flow) => flow.cashFlowId)).toEqual([
      'schedule:before:2026-04-30',
      'schedule:on-date:2026-05-02',
    ]);
  });

  it('excludes one-off schedules after the evaluation date', () => {
    const result = applyCashFlowSchedules(
      baseState([
        {
          cashFlowScheduleId: 'future',
          direction: 'DEPOSIT',
          amount: 100,
          effectiveDate: '2026-05-03',
        },
      ]),
      '2026-05-02',
    );

    expect(result.summary?.appliedEventCount).toBe(0);
    expect(result.summary?.futureEventCount).toBe(1);
    expect(result.summary?.netFutureCashFlow).toBe(100);
    expect(result.portfolioState.cashFlows).toEqual([]);
  });

  it('expands monthly recurring schedules deterministically through the evaluation date', () => {
    const result = applyCashFlowSchedules(
      baseState([
        {
          cashFlowScheduleId: 'monthly',
          direction: 'DEPOSIT',
          amount: 50,
          effectiveDate: '2026-01-31',
          recurrence: { frequency: 'MONTHLY' },
        },
      ]),
      '2026-04-30',
    );

    expect(result.summary?.appliedEvents.map((event) => event.effectiveDate)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
    expect(result.summary?.netAppliedCashFlow).toBe(200);
  });

  it('expands quarterly and annual schedules with end-date bounds', () => {
    const quarterly = applyCashFlowSchedules(
      baseState([
        {
          cashFlowScheduleId: 'quarterly',
          direction: 'WITHDRAWAL',
          amount: 100,
          effectiveDate: '2026-01-15',
          recurrence: { frequency: 'QUARTERLY', endDate: '2026-07-15' },
        },
      ]),
      '2026-12-31',
    );
    const annual = applyCashFlowSchedules(
      baseState([
        {
          cashFlowScheduleId: 'annual',
          direction: 'DEPOSIT',
          amount: 1000,
          effectiveDate: '2024-02-29',
          recurrence: { frequency: 'ANNUAL', occurrenceCount: 3 },
        },
      ]),
      '2026-12-31',
    );

    expect(quarterly.summary?.appliedEvents.map((event) => event.effectiveDate)).toEqual([
      '2026-01-15',
      '2026-04-15',
      '2026-07-15',
    ]);
    expect(annual.summary?.appliedEvents.map((event) => event.effectiveDate)).toEqual([
      '2024-02-29',
      '2025-02-28',
      '2026-02-28',
    ]);
  });

  it('skips generated events already represented by explicit cash flows', () => {
    const result = applyCashFlowSchedules(
      {
        ...baseState([
          {
            cashFlowScheduleId: 'deposit',
            direction: 'DEPOSIT',
            amount: 100,
            effectiveDate: '2026-05-02',
          },
        ]),
        cashFlows: [
          {
            cashFlowId: 'schedule:deposit:2026-05-02',
            direction: 'DEPOSIT',
            status: 'SETTLED',
            amount: 100,
          },
        ],
      },
      '2026-05-02',
    );

    expect(result.summary?.appliedEventCount).toBe(0);
    expect(result.summary?.alreadyRepresentedEventCount).toBe(1);
    expect(result.portfolioState.cashFlows).toHaveLength(1);
  });

  it('rejects invalid schedule structures explicitly', () => {
    expect(() =>
      applyCashFlowSchedules(
        baseState([
          {
            cashFlowScheduleId: 'bad-date',
            direction: 'DEPOSIT',
            amount: 100,
            effectiveDate: '2026-05-02T00:00:00Z',
          },
        ]),
        '2026-05-02',
      ),
    ).toThrow('YYYY-MM-DD');

    expect(() =>
      applyCashFlowSchedules(
        baseState([
          {
            cashFlowScheduleId: 'bad-amount',
            direction: 'DEPOSIT',
            amount: 0,
            effectiveDate: '2026-05-02',
          },
        ]),
        '2026-05-02',
      ),
    ).toThrow('amount must be positive');

    expect(() =>
      applyCashFlowSchedules(
        baseState([
          {
            cashFlowScheduleId: 'bad-end',
            direction: 'DEPOSIT',
            amount: 100,
            effectiveDate: '2026-05-02',
            recurrence: { frequency: 'MONTHLY', endDate: '2026-05-01' },
          },
        ]),
        '2026-05-02',
      ),
    ).toThrow('endDate cannot be before effectiveDate');
  });

  it('rejects missing required fields and duplicate schedule IDs explicitly', () => {
    expect(() =>
      applyCashFlowSchedules(
        baseState([
          {
            cashFlowScheduleId: '',
            direction: 'DEPOSIT',
            amount: 100,
            effectiveDate: '2026-05-02',
          },
        ]),
        '2026-05-02',
      ),
    ).toThrow('Cash flow schedule ID is required');

    expect(() =>
      applyCashFlowSchedules(
        baseState([
          {
            cashFlowScheduleId: 'duplicate',
            direction: 'DEPOSIT',
            amount: 100,
            effectiveDate: '2026-05-02',
          },
          {
            cashFlowScheduleId: 'duplicate',
            direction: 'WITHDRAWAL',
            amount: 50,
            effectiveDate: '2026-05-02',
          },
        ]),
        '2026-05-02',
      ),
    ).toThrow('Duplicate cash flow schedule ID: duplicate');

    expect(() =>
      applyCashFlowSchedules(
        baseState([
          {
            cashFlowScheduleId: 'missing-date',
            direction: 'DEPOSIT',
            amount: 100,
          } as any,
        ]),
        '2026-05-02',
      ),
    ).toThrow('effectiveDate is required');
  });

  it('requires an evaluation date when schedules are supplied', () => {
    expect(() =>
      applyCashFlowSchedules(
        baseState([
          {
            cashFlowScheduleId: 'deposit',
            direction: 'DEPOSIT',
            amount: 100,
            effectiveDate: '2026-05-02',
          },
        ]),
        undefined,
      ),
    ).toThrow('evaluationDate is required');
  });
});
