import request from 'supertest';
import { setupExpressApp } from '../src/api/server';
import { SqliteStateManager } from '../src/orchestrator/sqlite-state';
import { initDb, getDb } from '../src/db/sqlite';
import express from 'express';

describe('API Endpoints (Týr Integration)', () => {
  let app: express.Express;
  let stateManager: SqliteStateManager;

  beforeAll(() => {
    initDb(':memory:');
    stateManager = new SqliteStateManager();
    app = setupExpressApp(stateManager);
  });

  beforeEach(() => {
    const db = getDb();
    db.exec(`
      DELETE FROM TaxLots;
      DELETE FROM Holdings;
      DELETE FROM Portfolios;
      DELETE FROM Models;
      DELETE FROM Tenants;
      DELETE FROM EvaluationQueue;
    `);

    // Setup basic mock data
    stateManager.createTenant('tenant-1', 'Test Tenant');
    stateManager.createUser({ userId: 'user-1', tenantId: 'tenant-1', email: 'test@example.com', password: 'password', role: 'Admin' });
    
    stateManager.createModel({
      modelId: 'model-1',
      tenantId: 'tenant-1',
      name: 'Test Model',
      archetype: 'StaticWeights',
      evaluationFrequency: 'realtime',
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      constraints: []
    });

    stateManager.registerPortfolio('acc-1', {
      portfolioState: {
        accountId: 'acc-1',
        tenantId: 'tenant-1',
        modelId: 'model-1',
        cash: 1000,
        holdings: [{ instrumentId: 'AAPL', quantity: 10 }]
      },
      priceSnapshot: { prices: { AAPL: 150 } },
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 }
    });

    stateManager.updateGlobalPrices({ AAPL: 150 });
  });

  it('serves OpenAPI specification', async () => {
    const res = await request(app).get('/api/docs/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.1.0');
    expect(res.body.paths).toHaveProperty('/api/portfolios');
  });

  it('authenticates and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.tenantId).toBe('tenant-1');
  });

  it('rejects access without a token', async () => {
    const res = await request(app).get('/api/portfolios');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  describe('Authenticated endpoints', () => {
    let token: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' });
      token = res.body.token;
    });

    it('GET /api/portfolios returns drift summary', async () => {
      const res = await request(app)
        .get('/api/portfolios')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].accountId).toBe('acc-1');
      expect(res.body[0].driftStatus).toBeDefined();
    });

    it('GET /api/portfolios/:id returns detail', async () => {
      const res = await request(app)
        .get('/api/portfolios/acc-1')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.accountId).toBe('acc-1');
      expect(res.body.holdings).toBeDefined();
      expect(res.body.circuitBreakerStatus).toBeDefined();
    });

    it('GET /api/portfolios/:id/drift returns drift metrics', async () => {
      const res = await request(app)
        .get('/api/portfolios/acc-1/drift')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.accountId).toBe('acc-1');
      expect(res.body.driftByInstrument).toBeDefined();
      expect(res.body.rebalanceDue).toBeDefined();
    });

    it('GET /api/prices returns global prices', async () => {
      const res = await request(app)
        .get('/api/prices')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.prices.AAPL).toBe(150);
    });

    it('GET /api/logs handles empty or missing log file safely', async () => {
      const res = await request(app)
        .get('/api/logs?limit=5')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.total).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
