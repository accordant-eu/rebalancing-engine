import { SqliteStateManager } from '../src/orchestrator/sqlite-state';

describe('StateManager', () => {
  let stateManager: SqliteStateManager;

  beforeEach(() => {
    stateManager = new SqliteStateManager();
  });

  it('should create and retrieve tenants', () => {
    stateManager.createTenant('t1', 'Tenant 1');
    const tenants = stateManager.getAllTenants();
    expect(tenants.length).toBe(1);
    expect(tenants[0].tenantId).toBe('t1');
  });

  it('should register and retrieve portfolio', () => {
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
