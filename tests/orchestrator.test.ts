import { DryRunExecutor, LiveStateManager, Orchestrator } from '../src/orchestrator';
import { loadScenarioFixture } from '../src/runner';
import * as path from 'path';

describe('Orchestrator', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'scenarios.json');
  const fixture = loadScenarioFixture(fixturePath);
  const scenario = fixture.scenarios.find((s) => s.id === 'on_target');

  if (!scenario) {
    throw new Error('Test fixture missing');
  }

  let stateManager: LiveStateManager;
  let executor: DryRunExecutor;
  let orchestrator: Orchestrator;

  beforeEach(() => {
    stateManager = new LiveStateManager({
      portfolioState: JSON.parse(JSON.stringify(scenario.portfolioState)),
      priceSnapshot: JSON.parse(JSON.stringify(scenario.priceSnapshot)),
      targetAllocation: JSON.parse(JSON.stringify(scenario.targetAllocation)),
      policy: JSON.parse(JSON.stringify(scenario.policy)),
    });

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

  it('does not trigger on tick if portfolio is on target', () => {
    orchestrator.start();
    orchestrator.onTick(1000);

    expect(executor.execute).not.toHaveBeenCalled();
    expect(stateManager.getLastTradeTimeMs()).toBe(0);
  });

  it('triggers execution when prices drift out of bounds', () => {
    orchestrator.start();
    
    // Simulate AAPL price pumping by 50% to trigger drift
    const currentPrices = stateManager.getState().priceSnapshot.prices;
    stateManager.updatePrices({ AAPL: currentPrices['AAPL'] * 2.0 });

    orchestrator.onTick(1000);

    expect(executor.execute).toHaveBeenCalledTimes(1);
    expect(stateManager.getLastTradeTimeMs()).toBe(1000);
  });

  it('respects cooldown timer after execution', () => {
    orchestrator.start();
    
    const currentPrices = stateManager.getState().priceSnapshot.prices;
    stateManager.updatePrices({ AAPL: currentPrices['AAPL'] * 2.0 });

    // First tick triggers execution
    orchestrator.onTick(1000);
    expect(executor.execute).toHaveBeenCalledTimes(1);
    expect(stateManager.getLastTradeTimeMs()).toBe(1000);

    // Second tick within cooldown ignores it
    stateManager.updatePrices({ AAPL: currentPrices['AAPL'] * 2.1 }); // still out of bounds
    orchestrator.onTick(2000);
    expect(executor.execute).toHaveBeenCalledTimes(1); // STILL 1

    // Third tick after cooldown triggers again
    orchestrator.onTick(7000); // 1000 + 5000 + 1000
    expect(executor.execute).toHaveBeenCalledTimes(2);
    expect(stateManager.getLastTradeTimeMs()).toBe(7000);
  });

  it('ignores ticks if not started', () => {
    const currentPrices = stateManager.getState().priceSnapshot.prices;
    stateManager.updatePrices({ AAPL: currentPrices['AAPL'] * 2.0 });

    // Orchestrator not started
    orchestrator.onTick(1000);

    expect(executor.execute).not.toHaveBeenCalled();
  });
});
