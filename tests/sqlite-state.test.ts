import { SqliteStateManager } from '../src/orchestrator/sqlite-state';
import { initDb, getDb } from '../src/db/sqlite';
import { TenantBrokerConfig } from '../src/models/domain';

describe('SqliteStateManager', () => {
  let stateManager: SqliteStateManager;

  beforeEach(() => {
    // Reset database to in-memory clean state before each test
    const db = initDb(':memory:');
    db.exec(`
      DELETE FROM CashFlows;
      DELETE FROM TaxLots;
      DELETE FROM Holdings;
      DELETE FROM Portfolios;
      DELETE FROM Models;
      DELETE FROM Tenants;
      DELETE FROM EvaluationQueue;
    `);

    stateManager = new SqliteStateManager();
  });

  it('creates a tenant and correctly saves broker configuration', () => {
    const config: TenantBrokerConfig = {
      brokerType: 'ALPACA',
      brokerApiKey: 'test-key',
      brokerApiSecret: 'test-secret',
      brokerBaseUrl: 'https://test.alpaca',
    };

    stateManager.createTenant('tenant-1', 'Test Tenant', config);

    const savedConfig = stateManager.getTenantBrokerConfig('tenant-1');
    expect(savedConfig).not.toBeNull();
    expect(savedConfig?.brokerType).toBe('ALPACA');
    expect(savedConfig?.brokerApiKey).toBe('test-key');
    expect(savedConfig?.brokerApiSecret).toBe('test-secret');
    expect(savedConfig?.brokerBaseUrl).toBe('https://test.alpaca');
  });

  it('returns null for unconfigured tenants', () => {
    const savedConfig = stateManager.getTenantBrokerConfig('non-existent');
    expect(savedConfig).toBeNull();
  });

  it('cascades deletion if tenant is deleted (schema enforcement)', () => {
    stateManager.createTenant('tenant-1', 'Test Tenant');
    
    stateManager.createModel({
      modelId: 'model-1',
      tenantId: 'tenant-1',
      name: 'Test Model',
      archetype: 'StaticWeights',
      evaluationFrequency: 'realtime',
      targetAllocation: { targets: [] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      constraints: []
    });

    const db = getDb();
    const modelCountBefore = db.prepare('SELECT COUNT(*) as count FROM Models WHERE tenantId = ?').get('tenant-1') as { count: number };
    expect(modelCountBefore.count).toBe(1);

    // Act
    db.prepare('DELETE FROM Tenants WHERE tenantId = ?').run('tenant-1');

    // Assert
    const modelCountAfter = db.prepare('SELECT COUNT(*) as count FROM Models WHERE tenantId = ?').get('tenant-1') as { count: number };
    expect(modelCountAfter.count).toBe(0);
  });
  it('cascades targetAllocation to discretionary portfolios on updateModel', () => {
    stateManager.createTenant('tenant-1', 'Test Tenant');
    
    stateManager.createModel({
      modelId: 'model-1',
      tenantId: 'tenant-1',
      name: 'Test Model',
      archetype: 'StaticWeights',
      evaluationFrequency: 'realtime',
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
    });

    stateManager.registerPortfolio('acc-1', {
      portfolioState: { accountId: 'acc-1', tenantId: 'tenant-1', modelId: 'model-1', subscriptionType: 'discretionary', cash: 1000, holdings: [] },
      priceSnapshot: { prices: {} },
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      archetype: 'StaticWeights',
    });

    // Update model with new target and policy
    stateManager.updateModel({
      modelId: 'model-1',
      tenantId: 'tenant-1',
      name: 'Test Model',
      archetype: 'StaticWeights',
      evaluationFrequency: 'realtime',
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 0.5 }, { instrumentId: 'MSFT', weight: 0.5 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.02, minimumTradeSize: 5 },
    });

    const state = stateManager.getAccountState('acc-1');
    expect(state.targetAllocation.targets).toHaveLength(2);
    expect(state.policy.absoluteDriftTolerance).toBe(0.02);

    const queue = stateManager.dequeuePortfolios(10);
    expect(queue).toContain('acc-1');
  });

  it('does not cascade to bespoke portfolios on updateModel', () => {
    stateManager.createTenant('tenant-1', 'Test Tenant');
    
    stateManager.createModel({
      modelId: 'model-1',
      tenantId: 'tenant-1',
      name: 'Test Model',
      archetype: 'StaticWeights',
      evaluationFrequency: 'realtime',
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
    });

    stateManager.registerPortfolio('acc-2', {
      portfolioState: { accountId: 'acc-2', tenantId: 'tenant-1', modelId: 'model-1', subscriptionType: 'bespoke', cash: 1000, holdings: [] },
      priceSnapshot: { prices: {} },
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      archetype: 'StaticWeights',
    });

    stateManager.updateModel({
      modelId: 'model-1',
      tenantId: 'tenant-1',
      name: 'Test Model',
      archetype: 'StaticWeights',
      evaluationFrequency: 'realtime',
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 0.5 }, { instrumentId: 'MSFT', weight: 0.5 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.02, minimumTradeSize: 5 },
    });

    const state = stateManager.getAccountState('acc-2');
    expect(state.targetAllocation.targets).toHaveLength(1);
    expect(state.policy.absoluteDriftTolerance).toBe(0.05);

    const queue = stateManager.dequeuePortfolios(10);
    expect(queue).not.toContain('acc-2');
  });

  it('preserves cashBuffer, pending cashFlows, taxJurisdiction, and taxWrapper across getAccountState and getStatesFilteredByTenant', () => {
    stateManager.createTenant('tenant-1', 'Test Tenant');
    stateManager.registerPortfolio('acc-parity', {
      portfolioState: {
        accountId: 'acc-parity',
        tenantId: 'tenant-1',
        cash: 1000,
        taxJurisdiction: 'US',
        taxWrapper: 'TAXABLE',
        holdings: [{ instrumentId: 'AAPL', quantity: 10 }],
      },
      priceSnapshot: { prices: { AAPL: 100 } },
      targetAllocation: { cashBuffer: 0.1, targets: [{ instrumentId: 'AAPL', weight: 0.9 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      archetype: 'StaticWeights',
    });

    stateManager.submitCashFlow('acc-parity', {
      cashFlowId: 'cf-pending-1',
      amount: 250,
      direction: 'DEPOSIT',
      currency: 'USD',
      expectedSettlementDate: '2026-08-20',
      status: 'PENDING',
    }, 'user-1');

    stateManager.updatePortfolio('acc-parity', {
      taxJurisdiction: 'UK',
      taxWrapper: 'UK_ISA',
    });

    const single = stateManager.getAccountState('acc-parity');
    const filtered = stateManager.getStatesFilteredByTenant('tenant-1')['acc-parity'];

    expect(single.targetAllocation.cashBuffer).toBe(0.1);
    expect(filtered.targetAllocation.cashBuffer).toBe(0.1);
    expect(single.portfolioState.cashFlows).toHaveLength(1);
    expect(filtered.portfolioState.cashFlows).toHaveLength(1);
    expect(filtered.portfolioState.cashFlows?.[0].cashFlowId).toBe('cf-pending-1');
    expect(single.portfolioState.taxJurisdiction).toBe('UK');
    expect(filtered.portfolioState.taxJurisdiction).toBe('UK');
    expect(single.portfolioState.taxWrapper).toBe('UK_ISA');
    expect(filtered.portfolioState.taxWrapper).toBe('UK_ISA');
  });

  it('persists corporate action CASH_DIVIDEND without failing CashFlows.submittedBy NOT NULL constraint', () => {
    stateManager.createTenant('tenant-1', 'Test Tenant');
    stateManager.registerPortfolio('acc-div', {
      portfolioState: {
        accountId: 'acc-div',
        tenantId: 'tenant-1',
        cash: 1000,
        holdings: [{ instrumentId: 'AAPL', quantity: 50 }],
      },
      priceSnapshot: { prices: { AAPL: 100 } },
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      archetype: 'StaticWeights',
    });

    const res = stateManager.applyCorporateAction({
      actionId: 'ca-div-1',
      type: 'CASH_DIVIDEND',
      instrumentId: 'AAPL',
      effectiveDate: '2026-08-15',
      exDate: '2026-08-15',
      amountPerShare: 2.0,
    });

    expect(res.affectedAccounts).toEqual(['acc-div']);
    const reloaded = stateManager.getAccountState('acc-div');
    expect(reloaded.portfolioState.cash).toBe(1100);
  });

  it('persists and reloads model universe for MinimumVariance and EfficientFrontier models', () => {
    stateManager.createTenant('tenant-1', 'Test Tenant');
    stateManager.createModel({
      modelId: 'min-var-1',
      tenantId: 'tenant-1',
      name: 'MinVar Universe Model',
      archetype: 'MinimumVariance',
      evaluationFrequency: 'daily',
      targetAllocation: { cashBuffer: 0.05, targets: [] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      universe: ['AAPL', 'MSFT', 'GOOG'],
    });

    const models = stateManager.getModels('tenant-1');
    expect(models).toHaveLength(1);
    expect(models[0].universe).toEqual(['AAPL', 'MSFT', 'GOOG']);
  });
});

