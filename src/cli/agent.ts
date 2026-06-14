import 'dotenv/config';
import { AlpacaAdapter } from '../broker/alpaca';
import { BrokerExecutor, CircuitBreaker, DryRunExecutor, LiveStateManager, Orchestrator } from '../orchestrator';
import { Executor } from '../orchestrator/executor';
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
  const isLive = parsed.options['live'] === 'alpaca';

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

  if (isLive) {
    console.error(`Initializing live broker connection...`);
    const adapter = new AlpacaAdapter();

    (async () => {
      try {
        const livePortfolio = await adapter.getPortfolioState();

        const stateManager = new LiveStateManager({
          portfolioState: {
            ...scenario.portfolioState,
            ...livePortfolio, // Override synthetic cash/holdings with live ledger
          },
          priceSnapshot: { prices: {} },
          targetAllocation: scenario.targetAllocation,
          policy: scenario.policy,
        });

        const executor = new CircuitBreaker(new BrokerExecutor(adapter), {
          maxTradesPerSession: 5,
          maxGrossNotionalPerTrade: 100000,
        });

        const orchestrator = new Orchestrator(stateManager, executor, {
          cooldownMs: 60000, // 1 minute cooldown for paper trading
        });

        orchestrator.start();
        console.error(`Live Agent (Alpaca Paper) Started.`);
        console.error(`Targeting: ${scenarioId}`);
        console.error(`Press Ctrl+C to stop.\n`);

        setInterval(async () => {
          try {
            const currentPortfolio = await adapter.getPortfolioState();
            stateManager.updatePortfolio(currentPortfolio);

            const symbols = scenario.targetAllocation.targets.map((t) => t.instrumentId);
            const prices = await adapter.getPrices(symbols);
            stateManager.updatePrices(prices, new Date().toISOString());

            orchestrator.onTick(Date.now());
          } catch (e) {
            console.error(`[Poll Error]:`, e);
          }
        }, 10000); // Poll every 10 seconds
      } catch (e) {
        console.error(`[Init Error]:`, e);
        process.exit(1);
      }
    })();
  } else {
    // DRY RUN SYNTHETIC MODE
    const stateManager = new LiveStateManager({
      portfolioState: scenario.portfolioState,
      priceSnapshot: scenario.priceSnapshot,
      targetAllocation: scenario.targetAllocation,
      policy: scenario.policy,
    });

    const executor = new DryRunExecutor();
    const orchestrator = new Orchestrator(stateManager, executor, {
      cooldownMs: 5000,
    });

    orchestrator.start();

    console.error(`Starting Live Agent in Dry-Run mode.`);
    console.error(`Scenario: ${scenarioId}`);
    console.error(`Tick Interval: 1000ms`);
    console.error(`Cooldown: 5000ms`);
    console.error(`Press Ctrl+C to stop.\n`);

    setInterval(() => {
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
  }

  return { exitCode: 0, output: '' };
}
