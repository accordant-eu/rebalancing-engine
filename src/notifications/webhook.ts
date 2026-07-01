import { NotificationAdapter, NotificationLevel } from './adapter';
import { logger } from '../utils/logger';

export class WebhookNotifier implements NotificationAdapter {
  constructor(private webhookUrl: string) {}

  public async notify(level: NotificationLevel, message: string, context?: Record<string, unknown>): Promise<void> {
    try {
      let color = '#36a64f'; // info (green)
      if (level === 'warning') color = '#ffcc00'; // yellow
      if (level === 'error') color = '#ff0000'; // red

      const payload = {
        text: `[${level.toUpperCase()}] ${message}`,
        attachments: context ? [{ color, text: JSON.stringify(context, null, 2) }] : []
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        logger.error(`WebhookNotifier failed with status: ${response.status}`);
      }
    } catch (e) {
      logger.error({ err: e }, 'WebhookNotifier failed to send notification');
    }
  }
}
