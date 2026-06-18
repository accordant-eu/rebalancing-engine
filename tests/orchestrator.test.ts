import { DryRunExecutor, MultiPortfolioStateManager, Orchestrator } from '../src/orchestrator';
import { loadScenarioFixture } from '../src/runner';
import * as path from 'path';

describe('Orchestrator', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'scenarios.json');
  const fixture = loadScenarioFixture(fixturePath);
  const scenario = fixture.scenarios.find((s) => s.id === 'on_target');

  if (!scenario) {
    throw new Error('Test fixture missing');
  }

  let stateManager: MultiPortfolioStateManager;
  let executor: DryRunExecutor;
  let orchestrator: Orchestrator;
  const accountId = 'on_target';

  beforeEach(() => {
    stateManager = new MultiPortfolioStateManager();
    stateManager.registerPortfolio(accountId, {
      portfolioState: JSON.parse(JSON.stringify(scenario.portfolioState)),
      priceSnapshot: JSON.parse(JSON.stringify(scenario.priceSnapshot)),
      targetAllocation: JSON.parse(JSON.stringify(scenario.targetAllocation)),
      policy: JSON.parse(JSON.stringify(scenario.policy)),
    });
    // init global prices
    stateManager.updateGlobalPrices(scenario.priceSnapshot.prices);

    executor = new DryRunExecutor();
    jest.spyOn(executor, 'execute');
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    orchestrator = new Orchestrator(stateManager, executor, {
      cooldownMs: 5000,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not trigger on tick if portfolio is on target', async () => {
    orchestrator.start();
    stateManager.enqueuePortfolio(accountId, 1000);
    await orchestrator.onTick(1000);

    expect(executor.execute).not.toHaveBeenCalled();
    expect(stateManager.getLastTradeTimeMs(accountId)).toBe(0);
  });

  it('triggers execution when prices drift out of bounds', async () => {
    orchestrator.start();
    
    // Simulate US0378331005:XNAS:USD price pumping by 50% to trigger drift
    const currentPrices = stateManager.getGlobalPrices().prices;
    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': currentPrices['US0378331005:XNAS:USD'] * 2.0 });

    stateManager.enqueuePortfolio(accountId, 1000);
    await orchestrator.onTick(1000);

    expect(executor.execute).toHaveBeenCalledTimes(1);
    expect(stateManager.getLastTradeTimeMs(accountId)).toBe(1000);
  });

  it('respects cooldown timer after execution', async () => {
    orchestrator.start();
    
    const currentPrices = stateManager.getGlobalPrices().prices;
    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': currentPrices['US0378331005:XNAS:USD'] * 2.0 });

    // First tick triggers execution
    stateManager.enqueuePortfolio(accountId, 1000);
    await orchestrator.onTick(1000);
    expect(executor.execute).toHaveBeenCalledTimes(1);
    expect(stateManager.getLastTradeTimeMs(accountId)).toBe(1000);

    // Second tick within cooldown ignores it
    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': currentPrices['US0378331005:XNAS:USD'] * 2.1 }); // still out of bounds
    stateManager.enqueuePortfolio(accountId, 2000);
    orchestrator.onTick(2000);
    expect(executor.execute).toHaveBeenCalledTimes(1); // STILL 1

    // Third tick after cooldown triggers again
    stateManager.enqueuePortfolio(accountId, 7000);
    await orchestrator.onTick(7000); // 1000 + 5000 + 1000
    expect(executor.execute).toHaveBeenCalledTimes(2);
    expect(stateManager.getLastTradeTimeMs(accountId)).toBe(7000);
  });

  it('ignores ticks if not started', async () => {
    const currentPrices = stateManager.getGlobalPrices().prices;
    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': currentPrices['US0378331005:XNAS:USD'] * 2.0 });

    // Orchestrator not started
    stateManager.enqueuePortfolio(accountId, 1000);
    await orchestrator.onTick(1000);

    expect(executor.execute).not.toHaveBeenCalled();
  });
});
