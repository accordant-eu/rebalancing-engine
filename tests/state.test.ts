import { SqliteStateManager } from '../src/orchestrator/sqlite-state';
import { initDb, getDb } from '../src/db/sqlite';

describe('StateManager', () => {
  let stateManager: SqliteStateManager;

  beforeAll(() => {
    initDb(':memory:');
  });

  beforeEach(() => {
    stateManager = new SqliteStateManager();
    const db = getDb();
    db.prepare('DELETE FROM Portfolios').run();
    db.prepare('DELETE FROM Tenants').run();
  });

  it('should create and retrieve tenants', () => {
    stateManager.createTenant('t1', 'Tenant 1');
    const tenants = stateManager.getAllTenants();
    expect(tenants.length).toBe(1);
    expect(tenants[0].tenantId).toBe('t1');
  });

  it('should register and retrieve portfolio', () => {
    stateManager.createTenant('t1', 'Tenant 1');
    stateManager.createModel({
      modelId: 'm1',
      tenantId: 't1',
      name: 'Model 1',
      archetype: 'StaticWeights',
      evaluationFrequency: 'daily',
      targetAllocation: { cashBuffer: 0.05, targets: [] },
      policy: { absoluteDriftTolerance: 0.05, minimumTradeSize: 10 }
    });
    const pState = {
      accountId: 'p1',
      tenantId: 't1',
      modelId: 'm1',
      subscriptionType: 'discretionary' as const,
      cash: 1000,
      holdings: [],
      version: 1
    };
    stateManager.registerPortfolio('p1', {
      portfolioState: pState,
      priceSnapshot: { prices: {}, asOf: '' },
      targetAllocation: { targets: [], cashBuffer: 0 },
      policy: { absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      archetype: 'StaticWeights',
      constraints: []
    });

    const retrieved = stateManager.getAccountState('p1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.portfolioState.accountId).toBe('p1');
  });
});
