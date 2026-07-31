import { DynamicOptimizerService } from '../src/optimizer';
import { ProjectedGradientDescent } from '../src/optimizer/solver';
import { SqliteStateManager } from '../src/orchestrator/sqlite-state';
import { initDb, getDb } from '../src/db/sqlite';

describe('ProjectedGradientDescent Solver', () => {
  it('solves simple minimum variance', () => {
    const solver = new ProjectedGradientDescent();
    
    // Two independent assets with different volatilities
    // Asset 0 is low vol, Asset 1 is high vol
    const cov = [
      [0.01, 0.00],
      [0.00, 0.04]
    ];
    const mu = [0, 0];
    const lambda = 0;
    const targetSum = 1.0;

    const w = solver.solve(cov, mu, lambda, targetSum);
    
    // Inverse variance weighting: w0 = (1/0.01) / (1/0.01 + 1/0.04) = 100 / 125 = 0.8
    // w1 = 25 / 125 = 0.2
    expect(w[0]).toBeCloseTo(0.8, 3);
    expect(w[1]).toBeCloseTo(0.2, 3);
  });
});

describe('DynamicOptimizerService', () => {
  let stateManager: SqliteStateManager;
  let optimizer: DynamicOptimizerService;

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

    optimizer = new DynamicOptimizerService(stateManager);
    optimizer.run();

    const model = stateManager.getAllModels().find(m => m.modelId === 'static-model');
    expect(model?.targetAllocation.targets).toHaveLength(1);
    expect(model?.targetAllocation.targets[0].instrumentId).toBe('AAPL');
  });

  it('generates valid allocation and fans out to portfolios for MinimumVariance models', () => {
    stateManager.createModel({
      modelId: 'dynamic-model',
      tenantId: 'tenant-1',
      name: 'Dynamic Model',
      archetype: 'MinimumVariance',
      evaluationFrequency: 'daily',
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      universe: ['AAPL', 'MSFT', 'SPY']
    });

    stateManager.registerPortfolio('acc-1', {
      portfolioState: { accountId: 'acc-1', tenantId: 'tenant-1', modelId: 'dynamic-model', subscriptionType: 'discretionary', cash: 1000, holdings: [] },
      priceSnapshot: { prices: {} },
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      archetype: 'MinimumVariance',
    });

    optimizer = new DynamicOptimizerService(stateManager);
    optimizer.run();

    const model = stateManager.getAllModels().find(m => m.modelId === 'dynamic-model');
    expect(model?.targetAllocation.targets.length).toBeGreaterThan(0);
    
    // Ensure sum equals 1.0 - cashBuffer (which is 0.05 by default)
    const sum = model!.targetAllocation.targets.reduce((acc, t) => acc + t.weight, 0);
    expect(sum).toBeCloseTo(0.95);
    expect(model?.targetAllocation.cashBuffer).toBe(0.05);

    // Verify it cascaded to portfolio
    const state = stateManager.getAccountState('acc-1');
    const pSum = state.targetAllocation.targets.reduce((acc, t) => acc + t.weight, 0);
    expect(pSum).toBeCloseTo(0.95);
    
    // Verify it enqueued portfolio
    const queue = stateManager.dequeuePortfolios(10);
    expect(queue).toContain('acc-1');
  });
});
