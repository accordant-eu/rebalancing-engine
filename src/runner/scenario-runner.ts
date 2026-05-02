import * as fs from 'fs';
import * as path from 'path';
import { generateAuditRecord, AuditRecord } from '../audit';
import { calculateDrift } from '../core/drift';
import { simulatePostTrade } from '../core/simulation';
import { generateTradeProposal } from '../core/trades';
import { calculateCurrentWeights, calculateValuation } from '../core/valuation';
import { generateExplanation } from '../explanation';
import {
  PortfolioState,
  PriceSnapshot,
  RebalancingPolicy,
  TargetAllocation,
} from '../models/domain';
import { ThresholdStrategy } from '../strategy/threshold';

const RUNNER_CREATED_AT = '2026-05-02T00:00:00.000Z';

export interface ScenarioFixture {
  id: string;
  description: string;
  portfolioState: PortfolioState;
  targetAllocation: TargetAllocation;
  priceSnapshot: PriceSnapshot;
  policy: RebalancingPolicy;
}

export interface ScenarioRunnerInput {
  scenarios: ScenarioFixture[];
}

export interface ScenarioRunSuccess {
  scenarioId: string;
  status: 'success';
  auditRecord: AuditRecord;
}

export interface ScenarioRunError {
  scenarioId: string;
  status: 'error';
  error: string;
}

export type ScenarioRunResult = ScenarioRunSuccess | ScenarioRunError;

export function runScenarios(input: ScenarioRunnerInput): ScenarioRunResult[] {
  return [...input.scenarios]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((scenario) => runScenario(scenario));
}

export function runScenario(scenario: ScenarioFixture): ScenarioRunResult {
  try {
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);
    const weights = calculateCurrentWeights(valuation);
    const driftMeasurements = calculateDrift(weights, scenario.targetAllocation, scenario.policy);
    const trigger = new ThresholdStrategy().evaluateTrigger(
      scenario.portfolioState,
      driftMeasurements,
      scenario.policy,
    );
    const tradeProposal = generateTradeProposal(
      valuation,
      scenario.targetAllocation,
      scenario.priceSnapshot,
      scenario.policy,
    );
    const postTradeSimulation = simulatePostTrade(
      scenario.portfolioState,
      scenario.priceSnapshot,
      scenario.targetAllocation,
      scenario.policy,
      tradeProposal,
    );
    const explanation = generateExplanation(trigger, tradeProposal, postTradeSimulation);

    return {
      scenarioId: scenario.id,
      status: 'success',
      auditRecord: generateAuditRecord({
        eventId: `scenario:${scenario.id}`,
        createdAt: RUNNER_CREATED_AT,
        portfolioState: scenario.portfolioState,
        targetAllocation: scenario.targetAllocation,
        priceSnapshot: scenario.priceSnapshot,
        policy: scenario.policy,
        driftMeasurements,
        trigger,
        tradeProposal,
        postTradeSimulation,
        explanation,
      }),
    };
  } catch (error) {
    return {
      scenarioId: scenario.id,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function loadScenarioFixture(filePath: string): ScenarioRunnerInput {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as ScenarioRunnerInput;
}

if (require.main === module) {
  const fixturePath =
    process.argv[2] ?? path.join(process.cwd(), 'tests', 'fixtures', 'scenarios.json');
  const results = runScenarios(loadScenarioFixture(fixturePath));
  process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
}
