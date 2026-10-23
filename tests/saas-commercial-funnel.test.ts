import request from 'supertest';
import { setupExpressApp } from '../src/api/server';
import { SqliteStateManager } from '../src/orchestrator/sqlite-state';
import { initDb, closeDb } from '../src/db/sqlite';
describe('SaaS Commercial Funnel & White-Label Theming (Slice 6 / ADR-0073)', () => {
  let app: any;
  let stateManager: SqliteStateManager;

  beforeEach(() => {
    initDb(':memory:');
    stateManager = new SqliteStateManager();
    app = setupExpressApp(stateManager);
  });

  afterEach(() => {
    closeDb();
  });

  describe('Public Marketing Sandbox (/api/public/sandbox/simulate)', () => {
    it('simulates a portfolio rebalance headlessly without authentication', async () => {
      const payload = {
        cash: 10000,
        holdings: [
          { instrumentId: 'US0378331005:XNAS:USD', quantity: 100 }, // AAPL @ ~300 = $30,000
          { instrumentId: 'US5949181045:XNAS:USD', quantity: 20 },  // MSFT @ ~150 = $3,000
        ],
        targets: [
          { instrumentId: 'US0378331005:XNAS:USD', weight: 0.5 },
          { instrumentId: 'US5949181045:XNAS:USD', weight: 0.5 },
        ],
        prices: {
          'US0378331005:XNAS:USD': 300,
          'US5949181045:XNAS:USD': 150,
        },
        policy: {
          absoluteDriftTolerance: 0.05,
          minimumTradeSize: 50,
          assumedSlippageBps: 8,
        },
      };

      const res = await request(app)
        .post('/api/public/sandbox/simulate')
        .send(payload)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.initialValuation.totalEquity).toBe(43000); // 10k + 30k + 3k
      expect(res.body.proposal.trades.length).toBeGreaterThan(0);
      expect(res.body.summary.turnoverRate).toBeGreaterThan(0);
      expect(res.body.summary.estimatedFrictionBps).toBe(8);
      expect(res.body.summary.maxDriftBefore).toBeGreaterThan(res.body.summary.maxDriftAfter);
      expect(res.body.explanation).toBeDefined();
    });

    it('rejects invalid targets when weights do not sum to 100% on unleveraged policy', async () => {
      const payload = {
        cash: 1000,
        targets: [
          { instrumentId: 'US0378331005:XNAS:USD', weight: 0.7 },
          { instrumentId: 'US5949181045:XNAS:USD', weight: 0.5 }, // sum = 1.2
        ],
      };

      const res = await request(app)
        .post('/api/public/sandbox/simulate')
        .send(payload)
        .expect(400);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toContain('Target allocation');
    });

    it('supports leveraged mandates in sandbox when allowLeverage is enabled', async () => {
      const payload = {
        cash: 10000,
        holdings: [],
        targets: [
          { instrumentId: 'US0378331005:XNAS:USD', weight: 0.9 },
          { instrumentId: 'US5949181045:XNAS:USD', weight: 0.6 }, // 1.5x leverage
        ],
        prices: {
          'US0378331005:XNAS:USD': 300,
          'US5949181045:XNAS:USD': 150,
        },
        policy: {
          allowLeverage: true,
          maxLeverageRatio: 2.0,
        },
      };

      const res = await request(app)
        .post('/api/public/sandbox/simulate')
        .send(payload)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.proposal.trades.length).toBe(2);
      expect(res.body.proposal.estimatedPostTradeCash).toBeLessThan(0); // Borrowed margin
    });
  });

  describe('Zero-Touch Partner Onboarding (/api/public/onboarding)', () => {
    it('provisions a new tenant with initial admin user, M2M API key, sample model, and sample portfolio', async () => {
      const signupPayload = {
        tenantId: 'horizon-capital',
        firmName: 'Horizon Capital Management',
        adminEmail: 'johan@horizoncapital.eu',
        adminPassword: 'SecurePassword123!',
        brokerType: 'IBKR',
        branding: {
          primaryColor: '#059669',
          accentColor: '#10b981',
          portalTitle: 'Horizon Wealth Portal',
        },
      };

      const res = await request(app)
        .post('/api/public/onboarding')
        .send(signupPayload)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.tenant.tenantId).toBe('horizon-capital');
      expect(res.body.tenant.brokerType).toBe('IBKR');
      expect(res.body.tenant.branding.primaryColor).toBe('#059669');
      expect(res.body.user.email).toBe('johan@horizoncapital.eu');
      expect(res.body.user.role).toBe('Admin');
      expect(res.body.apiKey.secret).toMatch(/^sk_live_/);
      expect(res.body.sampleData.modelId).toBe('model-core-horizon-capital');
      expect(res.body.sampleData.accountId).toBe('port-horizon-capital-1');

      // Verify the new tenant admin can immediately log in
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'johan@horizoncapital.eu',
          password: 'SecurePassword123!',
        })
        .expect(200);

      expect(loginRes.body.token).toBeDefined();
      expect(loginRes.body.tenantId).toBe('horizon-capital');
      expect(loginRes.body.role).toBe('Admin');

      // Verify M2M API key can authenticate directly
      const m2mRes = await request(app)
        .get('/api/tenant/branding')
        .set('Authorization', `Bearer ${res.body.apiKey.secret}`)
        .expect(200);

      expect(m2mRes.body.brandName).toBe('Horizon Capital Management');
      expect(m2mRes.body.portalTitle).toBe('Horizon Wealth Portal');
    });

    it('rejects duplicate tenantId registration with 409 Conflict', async () => {
      const payload = {
        tenantId: 'tenant-baseline', // already seeded
        firmName: 'Duplicate Firm',
        adminEmail: 'unique@duplicate.com',
        adminPassword: 'Password123!',
      };

      const res = await request(app)
        .post('/api/public/onboarding')
        .send(payload)
        .expect(409);

      expect(res.body.error.code).toBe('TENANT_EXISTS');
    });

    it('rejects duplicate adminEmail registration with 409 Conflict', async () => {
      const payload = {
        tenantId: 'firm-new',
        firmName: 'New Firm',
        adminEmail: 'admin@tenant.com', // already seeded
        adminPassword: 'Password123!',
      };

      const res = await request(app)
        .post('/api/public/onboarding')
        .send(payload)
        .expect(409);

      expect(res.body.error.code).toBe('USER_EXISTS');
    });

    it('rejects weak passwords under 8 characters', async () => {
      const payload = {
        tenantId: 'firm-short',
        firmName: 'Short Firm',
        adminEmail: 'admin@shortfirm.com',
        adminPassword: '123',
      };

      const res = await request(app)
        .post('/api/public/onboarding')
        .send(payload)
        .expect(400);

      expect(res.body.error.code).toBe('WEAK_PASSWORD');
    });
  });

  describe('White-Label Branding Endpoints (/api/public/branding & /api/tenant/branding)', () => {
    it('returns public branding for unauthenticated login screen', async () => {
      const res = await request(app)
        .get('/api/public/branding?tenantId=tenant-baseline')
        .expect(200);

      expect(res.body.tenantId).toBe('tenant-baseline');
      expect(res.body.branding.brandName).toBe('Accordant Core');
      expect(res.body.branding.primaryColor).toBe('#0ea5e9');
    });

    it('allows a Tenant Admin to update and retrieve firm branding', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@tenant.com',
          password: 'changeme123',
        })
        .expect(200);

      const adminToken = loginRes.body.token;

      const updatePayload = {
        brandName: 'Accordant Premier Wealth',
        primaryColor: '#7c3aed',
        accentColor: '#a855f7',
        portalTitle: 'Premier Rebalancer',
        supportEmail: 'wealth@accordant.eu',
        logoUrl: 'https://example.com/logo.svg',
      };

      await request(app)
        .put('/api/tenant/branding')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatePayload)
        .expect(200);

      const getRes = await request(app)
        .get('/api/tenant/branding')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getRes.body.brandName).toBe('Accordant Premier Wealth');
      expect(getRes.body.primaryColor).toBe('#7c3aed');
      expect(getRes.body.portalTitle).toBe('Premier Rebalancer');
      expect(getRes.body.logoUrl).toBe('https://example.com/logo.svg');
    });

    it('forbids Viewer role from updating tenant branding', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'compliance@tenant.com',
          password: 'changeme123',
        })
        .expect(200);

      const viewerToken = loginRes.body.token;

      await request(app)
        .put('/api/tenant/branding')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ brandName: 'Hacked Brand' })
        .expect(403);
    });
  });
});
