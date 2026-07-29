import { USMarketCalendar, MockCalendar } from '../src/services/market-calendar';

describe('USMarketCalendar', () => {
  const calendar = new USMarketCalendar();

  it('identifies weekends as closed', () => {
    // 2026-07-25 is a Saturday, 12:00 PM EDT
    const saturday = new Date('2026-07-25T12:00:00-04:00').getTime();
    expect(calendar.isOpen(saturday)).toBe(false);

    // 2026-07-26 is a Sunday, 12:00 PM EDT
    const sunday = new Date('2026-07-26T12:00:00-04:00').getTime();
    expect(calendar.isOpen(sunday)).toBe(false);
  });

  it('identifies weekdays during market hours as open', () => {
    // 2026-07-27 is a Monday. 
    
    // 09:29 AM EDT (Closed)
    const beforeOpen = new Date('2026-07-27T09:29:59-04:00').getTime();
    expect(calendar.isOpen(beforeOpen)).toBe(false);

    // 09:30 AM EDT (Open)
    const atOpen = new Date('2026-07-27T09:30:00-04:00').getTime();
    expect(calendar.isOpen(atOpen)).toBe(true);

    // 12:00 PM EDT (Open)
    const midday = new Date('2026-07-27T12:00:00-04:00').getTime();
    expect(calendar.isOpen(midday)).toBe(true);

    // 15:59 PM EDT (Open)
    const justBeforeClose = new Date('2026-07-27T15:59:59-04:00').getTime();
    expect(calendar.isOpen(justBeforeClose)).toBe(true);
    
    // 16:00 PM EDT (Closed)
    const atClose = new Date('2026-07-27T16:00:00-04:00').getTime();
    expect(calendar.isOpen(atClose)).toBe(false);

    // 17:00 PM EDT (Closed)
    const afterClose = new Date('2026-07-27T17:00:00-04:00').getTime();
    expect(calendar.isOpen(afterClose)).toBe(false);
  });

  it('works correctly across time zone conversions', () => {
    // If the server provides a UTC timestamp for exactly market open:
    // 09:30 EDT = 13:30 UTC
    const utcOpen = new Date('2026-07-27T13:30:00Z').getTime();
    expect(calendar.isOpen(utcOpen)).toBe(true);

    // 16:00 EDT = 20:00 UTC (Closed)
    const utcClose = new Date('2026-07-27T20:00:00Z').getTime();
    expect(calendar.isOpen(utcClose)).toBe(false);
  });
});

describe('MockCalendar', () => {
  it('respects alwaysOpen flag', () => {
    const closedMock = new MockCalendar(false);
    expect(closedMock.isOpen(Date.now())).toBe(false);

    const openMock = new MockCalendar(true);
    expect(openMock.isOpen(Date.now())).toBe(true);
  });
});
