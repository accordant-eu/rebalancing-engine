import { DryRunExecutor, LiveStateManager, Orchestrator } from '../orchestrator';
import { loadScenarioFixture } from '../runner';
import { CommandContext, CommandResult } from './commands';
import { UsageError } from './errors';
import { ParsedArgs } from './options';

export function executeAgent(parsed: ParsedArgs, context: CommandContext): CommandResult {
  if (parsed.subcommand !== 'start') {
    throw new UsageError(`Unknown agent command: ${parsed.subcommand}`);
  }

  const scenarioFile = parsed.options['scenarios'];
  const scenarioId = parsed.options['scenario-id'];

  if (typeof scenarioFile !== 'string') {
    throw new UsageError('--scenarios <file> is required');
  }
  if (typeof scenarioId !== 'string') {
    throw new UsageError('--scenario-id <id> is required');
  }

  const fixture = loadScenarioFixture(scenarioFile);
  const scenario = fixture.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) {
    throw new UsageError(`Scenario ${scenarioId} not found in fixture ${scenarioFile}`);
  }

  const stateManager = new LiveStateManager({
    portfolioState: scenario.portfolioState,
    priceSnapshot: scenario.priceSnapshot,
    targetAllocation: scenario.targetAllocation,
    policy: scenario.policy,
  });

  const executor = new DryRunExecutor();
  const orchestrator = new Orchestrator(stateManager, executor, {
    cooldownMs: 5000, // 5 second cooldown for demonstration
  });

  orchestrator.start();

  console.error(`Starting Live Agent in Dry-Run mode.`);
  console.error(`Scenario: ${scenarioId}`);
  console.error(`Tick Interval: 1000ms`);
  console.error(`Cooldown: 5000ms`);
  console.error(`Press Ctrl+C to stop.\n`);

  let iteration = 0;
  setInterval(() => {
    iteration++;
    const currentPrices = stateManager.getState().priceSnapshot.prices;
    const newPrices = { ...currentPrices };

    // Artificially increase the first asset's price by 2% each tick to eventually trigger rebalance
    const firstAsset = Object.keys(newPrices)[0];
    if (firstAsset) {
      newPrices[firstAsset] = newPrices[firstAsset] * 1.02;
    }

    stateManager.updatePrices(newPrices, new Date().toISOString());
    orchestrator.onTick(Date.now());
  }, 1000);

  // Return a generic success message. The streaming outputs bypass this.
  return { exitCode: 0, output: '' };
}
