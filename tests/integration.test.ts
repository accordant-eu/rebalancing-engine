import request from 'supertest';
import { setupExpressApp } from '../src/api/server';
import { SqliteStateManager } from '../src/orchestrator/sqlite-state';
import { Orchestrator } from '../src/orchestrator/loop';
import { initDb, getDb } from '../src/db/sqlite';
import express from 'express';
import bcrypt from 'bcrypt';
import { BrokerAdapter } from '../src/broker';
import { TradeProposal, ExecutionContext, PortfolioState } from '../src/models/domain';

class DummyBrokerAdapter implements BrokerAdapter {
  async getPortfolioState(context: ExecutionContext, brokerAccountId: string): Promise<PortfolioState> {
    return { accountId: brokerAccountId, cash: 1000, holdings: [] };
  }
  async getPrices(context: ExecutionContext, symbols: string[]): Promise<Record<string, number>> {
    return { 'AAPL': 150, 'MSFT': 250 };
  }
  async submitTrades(context: ExecutionContext, brokerAccountId: string, proposal: TradeProposal): Promise<void> {}
  async hasOpenOrders(context: ExecutionContext, brokerAccountId: string): Promise<boolean> { return false; }
}

describe('Integration Tests (End-to-End)', () => {
  let app: express.Express;
  let stateManager: SqliteStateManager;
  let orchestrator: Orchestrator;
  let adminToken: string;

  beforeEach(async () => {
    initDb(':memory:');
    const db = getDb();
    db.exec(`
      DELETE FROM TaxLots;
      DELETE FROM Holdings;
      DELETE FROM Portfolios;
      DELETE FROM Models;
      DELETE FROM Tenants;
      DELETE FROM EvaluationQueue;
      DELETE FROM Users;
      DELETE FROM TenantApiKeys;
    `);

    stateManager = new SqliteStateManager();
    app = setupExpressApp(stateManager);

    const executor = { execute: async () => {} };
    orchestrator = new Orchestrator(stateManager, executor as any, {
      cooldownMs: 60000,
    });

    stateManager.createTenant('tenant-1', 'Integration Tenant');
    stateManager.createUser({ userId: 'admin-1', tenantId: 'tenant-1', email: 'admin@tenant.com', password: bcrypt.hashSync('password', 10), role: 'Admin' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@tenant.com', password: 'password' });
    
    adminToken = res.body.token;
  });

  afterEach(() => {
    orchestrator.stop();
  });

  it('Model update fan-out E2E: updates model, cascades to portfolio, enqueues and evaluates', async () => {
    // 1. Create a model
    stateManager.createModel({
      modelId: 'model-1',
      tenantId: 'tenant-1',
      name: 'Dynamic Model',
      archetype: 'EfficientFrontier',
      evaluationFrequency: 'realtime',
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
    });

    // 2. Register a portfolio
    stateManager.registerPortfolio('acc-1', {
      portfolioState: { accountId: 'acc-1', tenantId: 'tenant-1', modelId: 'model-1', subscriptionType: 'discretionary', cash: 1000, holdings: [] },
      priceSnapshot: { prices: { 'AAPL': 150, 'MSFT': 250 } },
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      archetype: 'EfficientFrontier',
    });

    // Ensure queue is empty (registerPortfolio adds it to queue with 0 timestamp sometimes, let's clear it)
    stateManager.dequeuePortfolios(100);

    // Update global prices so evaluation loop has them
    stateManager.updateGlobalPrices({ 'AAPL': 150, 'MSFT': 250 });

    // 3. Perform a Model Update via API
    const updateRes = await request(app)
      .put('/api/models/model-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Dynamic Model Updated',
        targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 0.5 }, { instrumentId: 'MSFT', weight: 0.5 }] },
        policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      });

    expect(updateRes.status).toBe(200);

    // 4. Verify cascade happened
    const pState = stateManager.getAccountState('acc-1');
    expect(pState.targetAllocation.targets).toHaveLength(2);

    // 5. Verify it was enqueued
    expect(stateManager.getQueueDepth()).toBe(1);

    // 6. Run orchestrator tick
    orchestrator.start();
    await orchestrator.onTick(Date.now());

    // 7. Verify queue is drained and lastTradeTimes updated
    expect(stateManager.getQueueDepth()).toBe(0);
    expect(stateManager.getLastTradeTimeMs('acc-1')).toBeGreaterThan(0);
  });

  it('B2B key lifecycle E2E: create, use for auth, and revoke', async () => {
    // We need to set SUPERADMIN_TENANT_ID so we can create a tenant or create keys?
    // Wait, the API endpoint is POST /api/admin/tenants/:id/keys which requires superadmin.
    process.env.SUPERADMIN_TENANT_ID = 'tenant-1';
    
    // 1. Issue a B2B Key via Admin API
    const keyRes = await request(app)
      .post('/api/admin/tenants/tenant-1/keys')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(keyRes.status).toBe(200);
    expect(keyRes.body.secret).toMatch(/^sk_live_/);
    const secretKey = keyRes.body.secret;

    // 2. Use the B2B Key to access portfolio endpoint
    const accessRes = await request(app)
      .get('/api/portfolios')
      .set('Authorization', `Bearer ${secretKey}`);
    
    expect(accessRes.status).toBe(200);

    // 3. Revoke the key
    const keyListRes = await request(app)
      .get('/api/admin/tenants/tenant-1/keys')
      .set('Authorization', `Bearer ${adminToken}`);
    
    const keyId = keyListRes.body[0].keyId;

    const revokeRes = await request(app)
      .delete(`/api/admin/tenants/tenant-1/keys/${keyId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(revokeRes.status).toBe(200);

    // 4. Verify revoked key no longer works
    const deniedRes = await request(app)
      .get('/api/portfolios')
      .set('Authorization', `Bearer ${secretKey}`);
    
    expect(deniedRes.status).toBe(401);
  });
});
