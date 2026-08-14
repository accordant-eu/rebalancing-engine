import { BatchEvaluationWorker } from '../../src/orchestrator/batch-evaluator';
import { SqliteStateManager } from '../../src/orchestrator/sqlite-state';
import { initDb } from '../../src/db/sqlite';
import { systemEventBus } from '../../src/events/bus';
import { setupExpressApp } from '../../src/api/server';
import request from 'supertest';
import { ModelMandate } from '../../src/models/domain';
import jwt from 'jsonwebtoken';

describe('Model Fan-Out Queue Worker & Throttled Batch Evaluator', () => {
  let stateManager: SqliteStateManager;
  let worker: BatchEvaluationWorker;

  beforeEach(() => {
    initDb(':memory:');
    stateManager = new SqliteStateManager();
    stateManager.createTenant('tenant-1', 'Tenant 1');
    stateManager.updateGlobalPrices({ AAPL: 150, MSFT: 300 });
    worker = new BatchEvaluationWorker(stateManager, undefined, {
      batchSize: 2,
      throttleIntervalMs: 10,
      pollIntervalMs: 50,
    });
  });

  afterEach(() => {
    worker.stop();
  });

  function seedAccount(accountId: string, modelId?: string) {
    stateManager.registerPortfolio(accountId, {
      portfolioState: {
        accountId,
        tenantId: 'tenant-1',
        modelId,
        cash: 1000,
        holdings: [{ instrumentId: 'AAPL', quantity: 10 }],
      },
      priceSnapshot: { prices: { AAPL: 150, MSFT: 300 } },
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 0.5 }, { instrumentId: 'MSFT', weight: 0.5 }] },
      policy: { absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      archetype: 'StaticWeights',
    });
  }

  describe('Batch Evaluation & Queue Consumption', () => {
    it('dequeues and processes portfolios up to the batchSize limit', async () => {
      seedAccount('acc-1');
      seedAccount('acc-2');
      seedAccount('acc-3');

      // Enqueue 3 accounts
      stateManager.enqueuePortfolio('acc-1', 1000);
      stateManager.enqueuePortfolio('acc-2', 2000);
      stateManager.enqueuePortfolio('acc-3', 3000);

      expect(stateManager.getQueueDepth()).toBe(3);

      // Process batch 1 (batchSize = 2)
      const result1 = await worker.processNextBatch(2);
      expect(result1.processed).toBe(2);
      expect(result1.successes).toBe(2);
      expect(result1.failures).toBe(0);
      expect(result1.accountIds).toEqual(['acc-1', 'acc-2']);
      expect(stateManager.getQueueDepth()).toBe(1);

      // Process batch 2 (remaining 1)
      const result2 = await worker.processNextBatch(2);
      expect(result2.processed).toBe(1);
      expect(result2.successes).toBe(1);
      expect(result2.accountIds).toEqual(['acc-3']);
      expect(stateManager.getQueueDepth()).toBe(0);
    });

    it('publishes BATCH_EVALUATION_PROGRESS event on systemEventBus', async () => {
      seedAccount('acc-1');
      stateManager.enqueuePortfolio('acc-1', 1000);

      const events: any[] = [];
      const listener = (evt: any) => {
        if (evt.type === 'BATCH_EVALUATION_PROGRESS') {
          events.push(evt);
        }
      };

      systemEventBus.on('system_event', listener);

      await worker.processNextBatch();

      systemEventBus.off('system_event', listener);

      expect(events.length).toBe(1);
      expect(events[0].data.batchSize).toBe(1);
      expect(events[0].data.successes).toBe(1);
      expect(events[0].data.remainingQueueDepth).toBe(0);
    });

    it('tracks worker status metrics accurately', async () => {
      seedAccount('acc-1');
      stateManager.enqueuePortfolio('acc-1', 1000);

      expect(worker.getStatus().totalProcessed).toBe(0);
      expect(worker.getStatus().status).toBe('IDLE');

      await worker.processNextBatch();

      const status = worker.getStatus();
      expect(status.totalProcessed).toBe(1);
      expect(status.successCount).toBe(1);
      expect(status.failureCount).toBe(0);
      expect(status.lastBatchSize).toBe(1);
      expect(status.lastProcessedAt).toBeDefined();
    });

    it('handles worker pause and resume lifecycle', () => {
      expect(worker.getIsPaused()).toBe(false);
      worker.pause();
      expect(worker.getIsPaused()).toBe(true);
      expect(worker.getStatus().status).toBe('PAUSED');
      worker.resume();
      expect(worker.getIsPaused()).toBe(false);
      expect(worker.getStatus().status).toBe('IDLE');
    });
  });

  describe('Model Fan-Out Queueing', () => {
    it('enqueues all discretionary accounts subscribed to a model mandate', () => {
      const model: ModelMandate = {
        modelId: 'growth-model',
        tenantId: 'tenant-1',
        name: 'Growth Model',
        archetype: 'StaticWeights',
        targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 0.5 }, { instrumentId: 'MSFT', weight: 0.5 }] },
        policy: { absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      };

      stateManager.createModel(model);
      seedAccount('acc-sub-1', 'growth-model');
      seedAccount('acc-sub-2', 'growth-model');
      seedAccount('acc-other');

      stateManager.assignPortfolioToModel('acc-sub-1', 'growth-model', 'discretionary');
      stateManager.assignPortfolioToModel('acc-sub-2', 'growth-model', 'discretionary');

      const enqueued = stateManager.enqueueModelSubscribers('growth-model');
      expect(enqueued.length).toBe(2);
      expect(enqueued.sort()).toEqual(['acc-sub-1', 'acc-sub-2']);
      expect(stateManager.getQueueDepth()).toBe(2);
    });
  });

  describe('REST API Endpoints', () => {
    const token = jwt.sign(
      { role: 'Superadmin', isSuperadmin: true, tenantId: 'tenant-1', userId: 'user-1' },
      process.env.JWT_SECRET || 'dev_secret_key_change_in_prod'
    );

    it('returns queue depth and worker status via GET /api/queue/status', async () => {
      seedAccount('acc-1');
      stateManager.enqueuePortfolio('acc-1', 1000);

      const app = setupExpressApp(stateManager, undefined, worker);
      const res = await request(app)
        .get('/api/queue/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.queueDepth).toBe(1);
      expect(res.body.worker.status).toBe('IDLE');
    });

    it('processes batch via POST /api/queue/process-batch', async () => {
      seedAccount('acc-1');
      stateManager.enqueuePortfolio('acc-1', 1000);

      const app = setupExpressApp(stateManager, undefined, worker);
      const res = await request(app)
        .post('/api/queue/process-batch')
        .set('Authorization', `Bearer ${token}`)
        .send({ limit: 5 });

      expect(res.status).toBe(200);
      expect(res.body.result.processed).toBe(1);
      expect(res.body.result.successes).toBe(1);
      expect(stateManager.getQueueDepth()).toBe(0);
    });

    it('triggers fan-out via POST /api/models/:id/fan-out', async () => {
      const model: ModelMandate = {
        modelId: 'tech-model',
        tenantId: 'tenant-1',
        name: 'Tech Model',
        archetype: 'StaticWeights',
        targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] },
        policy: { absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      };

      stateManager.createModel(model);
      seedAccount('acc-tech-1', 'tech-model');
      stateManager.assignPortfolioToModel('acc-tech-1', 'tech-model', 'discretionary');

      const app = setupExpressApp(stateManager, undefined, worker);
      const res = await request(app)
        .post('/api/models/tech-model/fan-out')
        .set('Authorization', `Bearer ${token}`)
        .send({ executeImmediately: true });

      expect(res.status).toBe(200);
      expect(res.body.enqueuedCount).toBe(1);
      expect(res.body.accountIds).toEqual(['acc-tech-1']);
      expect(res.body.immediateResult.processed).toBe(1);
    });
  });
});
