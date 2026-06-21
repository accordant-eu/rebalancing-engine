import { MockOptimizerService } from '../src/optimizer';
import { SqliteStateManager } from '../src/orchestrator/sqlite-state';
import { initDb, getDb } from '../src/db/sqlite';

describe('MockOptimizerService', () => {
  let stateManager: SqliteStateManager;
  let optimizer: MockOptimizerService;

  beforeEach(() => {
    initDb(':memory:');
    const db = getDb();
    db.exec(`
      DELETE FROM TaxLots;
      DELETE FROM Holdings;
      DELETE FROM Portfolios;
      DELETE FROM Models;
      DELETE FROM Tenants;
      DELETE FROM EvaluationQueue;
    `);

    stateManager = new SqliteStateManager();
    stateManager.createTenant('tenant-1', 'Test Tenant');
  });

  it('skips StaticWeights models', () => {
    stateManager.createModel({
      modelId: 'static-model',
      tenantId: 'tenant-1',
      name: 'Static Model',
      archetype: 'StaticWeights',
      evaluationFrequency: 'realtime',
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
    });

    const mockClock = () => new Date('2026-06-19T10:00:00Z').getTime();
    optimizer = new MockOptimizerService(stateManager, mockClock);

    optimizer.run();

    const model = stateManager.getAllModels().find(m => m.modelId === 'static-model');
    expect(model?.targetAllocation.targets).toHaveLength(1);
    expect(model?.targetAllocation.targets[0].instrumentId).toBe('AAPL');
  });

  it('generates valid allocation and fans out to portfolios for non-StaticWeights models', () => {
    stateManager.createModel({
      modelId: 'dynamic-model',
      tenantId: 'tenant-1',
      name: 'Dynamic Model',
      archetype: 'EfficientFrontier',
      evaluationFrequency: 'daily',
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
    });

    stateManager.registerPortfolio('acc-1', {
      portfolioState: { accountId: 'acc-1', tenantId: 'tenant-1', modelId: 'dynamic-model', subscriptionType: 'discretionary', cash: 1000, holdings: [] },
      priceSnapshot: { prices: {} },
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      archetype: 'EfficientFrontier',
    });

    const mockClock = () => new Date('2026-06-19T10:00:00Z').getTime();
    optimizer = new MockOptimizerService(stateManager, mockClock);

    optimizer.run();

    const model = stateManager.getAllModels().find(m => m.modelId === 'dynamic-model');
    expect(model?.targetAllocation.targets).toHaveLength(3);
    
    // Ensure sum equals 1.0 - cashBuffer (which is 0.05)
    const sum = model!.targetAllocation.targets.reduce((acc, t) => acc + t.weight, 0);
    expect(sum).toBeCloseTo(0.95);
    expect(model?.targetAllocation.cashBuffer).toBe(0.05);

    // Verify it cascaded to portfolio
    const state = stateManager.getAccountState('acc-1');
    expect(state.targetAllocation.targets).toHaveLength(3);
    const pSum = state.targetAllocation.targets.reduce((acc, t) => acc + t.weight, 0);
    expect(pSum).toBeCloseTo(0.95);
    
    // Verify it enqueued portfolio
    const queue = stateManager.dequeuePortfolios(10);
    expect(queue).toContain('acc-1');
  });
});
