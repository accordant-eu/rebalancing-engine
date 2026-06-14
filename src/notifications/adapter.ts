export type NotificationLevel = 'info' | 'warning' | 'error';

export interface NotificationAdapter {
  notify(level: NotificationLevel, message: string, context?: Record<string, unknown>): Promise<void>;
}

export class StdoutNotificationAdapter implements NotificationAdapter {
  public async notify(level: NotificationLevel, message: string, context?: Record<string, unknown>): Promise<void> {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;

    if (level === 'error') {
      console.error(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
  }
}
