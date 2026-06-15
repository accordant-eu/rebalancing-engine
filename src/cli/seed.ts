import { initDb } from '../db/sqlite';
import { SqliteStateManager } from '../orchestrator/sqlite-state';
import { loadScenarioFixture } from '../runner';
import { CommandContext, CommandResult } from './commands';
import { UsageError } from './errors';
import { ParsedArgs } from './options';

export function executeSeed(parsed: ParsedArgs, _context: CommandContext): CommandResult {
  const scenarioFile = parsed.options['scenarios'];
  const scenarioId = parsed.options['scenario-id'];
  const countOpt = parsed.options['count'];

  if (typeof scenarioFile !== 'string') {
    throw new UsageError('--scenarios <file> is required');
  }
  if (typeof scenarioId !== 'string') {
    throw new UsageError('--scenario-id <id> is required');
  }

  const count = typeof countOpt === 'string' ? parseInt(countOpt, 10) : (typeof countOpt === 'boolean' ? 1000 : 1000);
  if (isNaN(count) || count <= 0) {
    throw new UsageError('--count must be a positive integer');
  }

  const fixture = loadScenarioFixture(scenarioFile);
  const scenario = fixture.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) {
    throw new UsageError(`Scenario ${scenarioId} not found in fixture ${scenarioFile}`);
  }

  console.log(`Initializing SQLite Database...`);
  initDb();

  const stateManager = new SqliteStateManager();

  const tenantId = 'tenant-baseline';
  stateManager.createTenant(tenantId, 'Baseline Tenant');
  
  const modelId = `${scenarioId}-model`;
  stateManager.createModel({
    modelId,
    tenantId,
    name: `Scenario Model: ${scenarioId}`,
    archetype: 'StaticWeights',
    evaluationFrequency: 'realtime',
    targetAllocation: scenario.targetAllocation,
    policy: scenario.policy
  });

  console.log(`Seeding ${count} portfolios based on scenario ${scenarioId}...`);

  const startTime = Date.now();
  for (let i = 1; i <= count; i++) {
    const accountId = `seeded-account-${i}`;
    
    // Add slight random variations so they don't all look identical
    // e.g. randomize cash by +/- 5%
    const randomFactor = 0.95 + Math.random() * 0.1;
    
    const clonedState = {
      portfolioState: {
        ...scenario.portfolioState,
        accountId,
        tenantId,
        modelId,
        subscriptionType: 'discretionary' as const,
        cash: scenario.portfolioState.cash * randomFactor,
        holdings: scenario.portfolioState.holdings.map(h => ({
          ...h,
          quantity: h.quantity * randomFactor,
        }))
      },
      priceSnapshot: scenario.priceSnapshot,
      targetAllocation: scenario.targetAllocation,
      policy: scenario.policy,
    };

    stateManager.registerPortfolio(accountId, clonedState);
    if (i === 1) {
      // Seed global prices once based on the scenario
      stateManager.updateGlobalPrices(scenario.priceSnapshot.prices, scenario.priceSnapshot.asOf);
    }
    
    if (i % 100 === 0) {
      console.log(`  Seeded ${i}/${count}...`);
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`Successfully seeded ${count} portfolios in ${durationMs}ms.`);

  return { exitCode: 0, output: '' };
}
