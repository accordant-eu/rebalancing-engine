export interface CalendarAdapter {
  isOpen(timestampMs: number): boolean;
}

export class USMarketCalendar implements CalendarAdapter {
  public isOpen(timestampMs: number): boolean {
    const date = new Date(timestampMs);

    // Format the date precisely in America/New_York time
    // We request hour12: false to get 0-23 hours.
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    // Parts will contain { type: 'weekday', value: 'Mon' }, { type: 'hour', value: '09' }, { type: 'minute', value: '30' } etc.
    const parts = formatter.formatToParts(date);
    
    let weekday = '';
    let hour = 0;
    let minute = 0;

    for (const part of parts) {
      if (part.type === 'weekday') weekday = part.value;
      if (part.type === 'hour') hour = parseInt(part.value, 10);
      if (part.type === 'minute') minute = parseInt(part.value, 10);
    }

    // 1. Check if it's the weekend
    if (weekday === 'Sat' || weekday === 'Sun') {
      return false;
    }

    // 2. Check market hours: 09:30 to 16:00
    // If hour < 9, closed
    if (hour < 9) return false;
    
    // If hour is 9, minute must be >= 30
    if (hour === 9 && minute < 30) return false;
    
    // If hour >= 16 (4:00 PM), closed
    // Note: Technically the market closes exactly at 16:00, so we can allow up to 15:59.
    // However, if the orchestrator ticks exactly at 16:00, we'll consider it closed.
    if (hour >= 16) return false;

    // Optional: holiday check would go here. For MVP, we skip holidays.
    return true;
  }
}

export class MockCalendar implements CalendarAdapter {
  constructor(private alwaysOpen: boolean = true) {}

  public isOpen(_timestampMs: number): boolean {
    return this.alwaysOpen;
  }
}
