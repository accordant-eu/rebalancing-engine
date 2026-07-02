import { Router } from 'express';
import { LiveStateManager } from '../../orchestrator/state';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

export function setupBrokerWebhooks(stateManager: LiveStateManager): Router {
  const router = Router();

  router.post('/alpaca', (req, res) => {
    const signature = req.headers['alpaca-signature'] || req.headers['x-alpaca-signature'];
    const secret = process.env.ALPACA_WEBHOOK_SECRET || 'local-dummy-secret';

    if (!signature) {
      res.status(401).json({ error: 'Missing signature' });
      return;
    }

    // Ensure we have rawBody (express.json must be configured to populate req.rawBody or we stringify req.body for fallback)
    // Note: Alpaca calculates HMAC over the raw string body. Assuming `req.body` is available via express.json middleware.
    // If rawBody is not mounted globally, we fallback to stringifying the body but it may fail if spacing differs.
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    if (signature !== expectedSignature) {
      logger.warn('[Webhook] Invalid Alpaca signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const event = req.body;
    logger.info({ event: event.event, orderId: event.order?.id }, '[Webhook] Received Alpaca execution report');

    if (event.event === 'fill' || event.event === 'partial_fill') {
      const order = event.order;
      if (order && stateManager.processExecutionReport) {
        const orderId = order.id;
        // In some webhook payloads, account_id is at the root, or within the order object
        const accountId = event.account_id || order.account_id;
        const filledQuantity = parseFloat(order.filled_qty);
        const fillPrice = parseFloat(order.filled_avg_price || event.price || "0");
        const status = event.event === 'fill' ? 'FILLED' : 'PARTIAL_FILL';

        stateManager.processExecutionReport(orderId, accountId, status, filledQuantity, fillPrice);
      }
    } else if (event.event === 'canceled' || event.event === 'rejected') {
      const order = event.order;
      if (order && stateManager.processExecutionReport) {
        const orderId = order.id;
        const accountId = event.account_id || order.account_id;
        const filledQuantity = parseFloat(order.filled_qty || "0");
        const status = event.event === 'canceled' ? 'CANCELED' : 'REJECTED';
        stateManager.processExecutionReport(orderId, accountId, status, filledQuantity, 0);
      }
    }

    res.json({ success: true });
  });

  return router;
}
