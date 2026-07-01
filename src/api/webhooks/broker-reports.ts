import { Router } from 'express';
import { LiveStateManager } from '../../orchestrator/state';
import { logger } from '../../utils/logger';

export function setupBrokerWebhooks(stateManager: LiveStateManager): Router {
  const router = Router();

  router.post('/alpaca', (req, res) => {
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
