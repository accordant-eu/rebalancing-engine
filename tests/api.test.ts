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
    stateManager.createTenant('tenant-2', 'Tenant Two');
    stateManager.createUser({ userId: 'user-2', tenantId: 'tenant-2', email: 'test2@example.com', password: require('bcrypt').hashSync('password', 10), role: 'Admin' });
    stateManager.createModel({
      modelId: 'tenant-2-model',
      tenantId: 'tenant-2',
      name: 'Model 2',
      archetype: 'StaticWeights',
      evaluationFrequency: 'realtime',
      targetAllocation: { targets: [{ instrumentId: 'US0378331005:XNAS:USD', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
    });
    stateManager.registerPortfolio('acc-other', {
      portfolioState: { accountId: 'acc-other', tenantId: 'tenant-2', cash: 1000, holdings: [] },
      priceSnapshot: { prices: {} },
      targetAllocation: { targets: [] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      archetype: 'StaticWeights',
    });
    stateManager.createUser({ userId: 'user-1', tenantId: 'tenant-1', email: 'test@example.com', password: require('bcrypt').hashSync('password', 10), role: 'Admin' });
    
    stateManager.createModel({
      modelId: 'model-1',
      tenantId: 'tenant-1',
      name: 'Test Model',
      archetype: 'StaticWeights',
      evaluationFrequency: 'realtime',
      targetAllocation: { targets: [{ instrumentId: 'US0378331005:XNAS:USD', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      constraints: []
    });

    stateManager.registerPortfolio('acc-1', {
      portfolioState: {
        accountId: 'acc-1',
        tenantId: 'tenant-1',
        modelId: 'model-1',
        cash: 1000,
        holdings: [ { instrumentId: 'US0378331005:XNAS:USD', quantity: 10 } ]
      },
      priceSnapshot: { prices: { 'US0378331005:XNAS:USD': 150 } },
      targetAllocation: { targets: [{ instrumentId: 'US0378331005:XNAS:USD', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      archetype: 'StaticWeights',
      constraints: []
    });

    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': 150 });
    stateManager.getTenantBrokerConfig = jest.fn().mockReturnValue({ brokerType: 'MOCK', brokerApiKey: 'mock', brokerApiSecret: 'mock' });
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
      expect(res.body.prices['US0378331005:XNAS:USD']).toBe(150);
    });

    it('GET /api/logs handles empty or missing log file safely', async () => {
      const res = await request(app)
        .get('/api/logs?limit=5')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.total).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('cannot read another tenant portfolio with own token', async () => {
      const res = await request(app)
        .get('/api/portfolios/acc-other')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('cannot list models from another tenant', async () => {
      const res = await request(app)
        .get('/api/models')
        .set('Authorization', `Bearer ${token}`);
      const ids = res.body.map((m: any) => m.modelId);
      expect(ids).not.toContain('tenant-2-model');
    });

    it('rejects regular tenant admin from admin endpoints', async () => {
      const res = await request(app)
        .get('/api/admin/tenants')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('B2B API Key Authentication', () => {
    it('authenticates with sk_live_ key', async () => {
      const keyResult = stateManager.createTenantApiKey('tenant-1');
      
      const res = await request(app)
        .get('/api/portfolios')
        .set('Authorization', `Bearer ${keyResult.secret}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });
  });
});
