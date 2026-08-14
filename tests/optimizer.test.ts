import { DynamicOptimizerService } from '../src/optimizer';
import { ProjectedGradientDescent } from '../src/optimizer/solver';
import { SqliteStateManager } from '../src/orchestrator/sqlite-state';
import { initDb, getDb } from '../src/db/sqlite';

describe('ProjectedGradientDescent Solver', () => {
  it('solves simple minimum variance', async () => {
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

    // Inverse variance weighting: w0 = (1/0.01) / (1/0.01 + 1/0.04) = 100 / 125 = 0.8
    const result = await solver.solve(cov, mu, 0, 1.0);
    const w = result.weights;
    expect(w[0]).toBeCloseTo(0.8, 3);
    expect(w[1]).toBeCloseTo(0.2, 3);
  });

  it('throws error if covariance matrix or mu has dimension mismatch', async () => {
    const solver = new ProjectedGradientDescent();
    await expect(solver.solve([[1, 0]], [0, 0], 0, 1.0)).rejects.toThrow('Dimension mismatch');
    await expect(solver.solve([[1, 0], [0, 1]], [0], 0, 1.0)).rejects.toThrow('Dimension mismatch');
    await expect(solver.solve([[1, 0], [0]], [0, 0], 0, 1.0)).rejects.toThrow('not square at row 1');
  });

  it('throws error if targetSum or lambda is invalid', async () => {
    const solver = new ProjectedGradientDescent();
    await expect(solver.solve([[1]], [0], 0, -1.0)).rejects.toThrow('Invalid targetSum');
    await expect(solver.solve([[1]], [0], -5, 1.0)).rejects.toThrow('Invalid lambda');
  });

  it('throws error if inputs contain NaN', async () => {
    const solver = new ProjectedGradientDescent();
    await expect(solver.solve([[NaN]], [0], 0, 1.0)).rejects.toThrow('Invalid covariance value');
    await expect(solver.solve([[1]], [NaN], 0, 1.0)).rejects.toThrow('Invalid expected return');
  });

  it('safely handles zero covariance matrix', async () => {
    const solver = new ProjectedGradientDescent();
    const result = await solver.solve([[0, 0], [0, 0]], [0, 0], 0, 1.0);
    expect(result.converged).toBe(false);
    expect(result.weights).toEqual([0.5, 0.5]); // Falls back to equal weights
  });

  it('aborts safely if numerical instability (NaN) is encountered during descent', async () => {
    const solver = new ProjectedGradientDescent();
    
    // We can force NaN by mocking Math.max which is used in projection
    const originalMax = Math.max;
    Math.max = jest.fn().mockReturnValue(NaN);
    
    const result = await solver.solve([[1]], [0], 0, 1.0);
    
    expect(result.converged).toBe(false);
    expect(result.iters).toBe(1);
    expect(result.weights).toEqual([1.0]); // Returns initial weights

    Math.max = originalMax; // Restore
  });

  it('safely converges or produces valid non-negative weights for collinear covariance matrices', async () => {
    const solver = new ProjectedGradientDescent();
    // Collinear assets where Asset 0 and Asset 1 have identical variance and correlation = 1.0
    const cov = [
      [0.04, 0.04, 0.00],
      [0.04, 0.04, 0.00],
      [0.00, 0.00, 0.01],
    ];
    const mu = [0.05, 0.05, 0.02];
    const result = await solver.solve(cov, mu, 0, 1.0);

    const sum = result.weights.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
    for (const w of result.weights) {
      expect(w).toBeGreaterThanOrEqual(0);
      expect(Number.isNaN(w)).toBe(false);
    }
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

  it('generates valid allocation and fans out to portfolios for MinimumVariance models', async () => {
    stateManager.createTenant('tenant-1', 'Acme Firm');
    
    // Register dynamic model
    stateManager.createModel({
      modelId: 'dynamic-model',
      tenantId: 'tenant-1',
      name: 'Dynamic MinVar',
      archetype: 'MinimumVariance',
      evaluationFrequency: 'daily',
      targetAllocation: { cashBuffer: 0.05, targets: [] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      universe: ['AAPL', 'MSFT', 'SPY']
    });
    
    // Register portfolio subscribed to it
    stateManager.registerPortfolio('acc-1', {
      portfolioState: { accountId: 'acc-1', tenantId: 'tenant-1', modelId: 'dynamic-model', subscriptionType: 'discretionary', cash: 1000, holdings: [] },
      priceSnapshot: { prices: {} },
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      archetype: 'MinimumVariance',
      constraints: []
    });

    optimizer = new DynamicOptimizerService(stateManager);
    await optimizer.run();

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
