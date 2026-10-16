import { Router, Request, Response } from 'express';
import { SqliteStateManager } from '../../orchestrator/sqlite-state';
import { BatchEvaluationWorker } from '../../orchestrator/batch-evaluator';

export function createQueueRouter(
  stateManager: SqliteStateManager,
  batchWorker?: BatchEvaluationWorker,
  middlewares?: {
    forbidViewer?: any;
    requireAdmin?: any;
    requireSuperadmin?: any;
    sendError?: any;
  }
) {
  const router = Router();
  const sendError = middlewares?.sendError || ((res: Response, status: number, code: string, message: string) => {
    res.status(status).json({ code, message });
  });
  const forbidViewer = middlewares?.forbidViewer || ((_req: Request, _res: Response, next: any) => next());

  /**
   * GET /api/queue/status
   * Returns current queue depth and batch worker status.
   */
  router.get('/status', (req: Request, res: Response) => {
    const queueDepth = stateManager.getQueueDepth();
    const workerStatus = batchWorker ? batchWorker.getStatus() : {
      status: 'IDLE',
      totalProcessed: 0,
      successCount: 0,
      failureCount: 0,
      tradesGeneratedCount: 0,
      lastBatchSize: 0,
      currentQueueDepth: queueDepth,
    };

    res.json({
      queueDepth,
      worker: workerStatus,
    });
  });

  /**
   * POST /api/queue/process-batch
   * Manually triggers immediate processing of the next batch from the evaluation queue.
   */
  router.post('/process-batch', forbidViewer, async (req: Request, res: Response) => {
    if (!batchWorker) {
      return sendError(res, 503, 'SERVICE_UNAVAILABLE', 'BatchEvaluationWorker is not initialized on this instance');
    }

    const limit = req.body?.limit ? parseInt(req.body.limit, 10) : undefined;
    try {
      const result = await batchWorker.processNextBatch(limit);
      res.json({
        message: 'Batch processing completed',
        result,
      });
    } catch (err: any) {
      sendError(res, 500, 'BATCH_PROCESSING_FAILED', err?.message || 'Batch evaluation failed');
    }
  });

  /**
   * POST /api/models/:id/fan-out
   * Triggers an asynchronous fan-out re-evaluation for all portfolios subscribed to a model.
   */
  router.post('/models/:id/fan-out', forbidViewer, async (req: Request, res: Response) => {
    const modelId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const tenantId = (req as any).tenantId;
    const isSuperadmin = (req as any).isSuperadmin;
    const subscriptionType = (req.body?.subscriptionType as string) || 'discretionary';
    const executeImmediately = req.body?.executeImmediately === true;

    try {
      const models = isSuperadmin ? stateManager.getAllModels() : stateManager.getModels(tenantId);
      const model = models.find((m: any) => m.modelId === modelId);
      if (!model || (!isSuperadmin && model.tenantId !== tenantId)) {
        return sendError(res, 404, 'MODEL_NOT_FOUND', `Model '${modelId}' not found`);
      }

      const queuedAccounts = stateManager.enqueueModelSubscribers(modelId, subscriptionType);

      let immediateResult = undefined;
      if (executeImmediately && batchWorker) {
        immediateResult = await batchWorker.processNextBatch();
      }

      res.json({
        modelId,
        subscriptionType,
        enqueuedCount: queuedAccounts.length,
        accountIds: queuedAccounts,
        immediateResult,
        message: `Successfully enqueued ${queuedAccounts.length} accounts for model ${modelId}`,
      });
    } catch (err: any) {
      sendError(res, 500, 'FAN_OUT_FAILED', err?.message || 'Model fan-out failed');
    }
  });

  return router;
}
