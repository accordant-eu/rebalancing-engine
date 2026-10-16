import { Router } from 'express';
import { LiveStateManager } from '../../orchestrator/state';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

export function setupBrokerWebhooks(stateManager: LiveStateManager): Router {
  const router = Router();

  router.post('/alpaca', (req, res) => {
    const signatureHeader = req.headers['alpaca-signature'] || req.headers['x-alpaca-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const secret = process.env.ALPACA_WEBHOOK_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-dummy-secret');

    if (!secret) {
      logger.error('[Webhook] ALPACA_WEBHOOK_SECRET is missing in production');
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }

    if (!signature) {
      res.status(401).json({ error: 'Missing signature' });
      return;
    }

    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
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
