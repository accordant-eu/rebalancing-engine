import { NotificationAdapter, NotificationLevel } from './adapter';
import { logger } from '../utils/logger';

export class SlackNotifier implements NotificationAdapter {
  constructor(private webhookUrl: string) {}

  public async notify(level: NotificationLevel, message: string, context?: Record<string, unknown>): Promise<void> {
    try {
      let color = '#36a64f'; // green for info
      if (level === 'warning') color = '#ffcc00'; // yellow
      if (level === 'error') color = '#ff0000'; // red

      let text = `*${level.toUpperCase()}*: ${message}`;
      if (context) {
        text += `\n\`\`\`${JSON.stringify(context, null, 2)}\`\`\``;
      }

      const payload = {
        attachments: [
          {
            color,
            text,
          }
        ]
      };

      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        logger.error(`[SlackNotifier] Failed to send message. Status: ${res.status}, Error: ${errorText}`);
      }
    } catch (e) {
      logger.error(`[SlackNotifier] Exception while sending message: ${e}`);
    }
  }
}
