import * as fs from 'fs';
import * as path from 'path';
import { AuditRecord } from '../audit';
import { evaluateRebalance } from '../core/evaluation';
import {
  PortfolioState,
  PriceSnapshot,
  RebalancingPolicy,
  TargetAllocation,
} from '../models/domain';

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

export interface ScenarioExpectedStatus {
  status: 'success' | 'error';
  errorIncludes?: string;
}

export interface ScenarioExpectations {
  scenarios: Record<string, ScenarioExpectedStatus>;
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

export interface ScenarioExpectationMismatch {
  scenarioId: string;
  expected: ScenarioExpectedStatus | null;
  actualStatus: ScenarioRunResult['status'] | null;
  message: string;
}

export interface ScenarioExpectationValidation {
  isValid: boolean;
  checkedScenarioCount: number;
  mismatches: ScenarioExpectationMismatch[];
}

export function runScenarios(input: ScenarioRunnerInput, createdAt?: string): ScenarioRunResult[] {
  return [...input.scenarios]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((scenario) => runScenario(scenario, createdAt));
}

export function runScenario(scenario: ScenarioFixture, createdAt?: string): ScenarioRunResult {
  try {
    const evaluation = evaluateRebalance({
      eventId: `scenario:${scenario.id}`,
      createdAt: createdAt ?? new Date().toISOString(),
      portfolioState: scenario.portfolioState,
      targetAllocation: scenario.targetAllocation,
      priceSnapshot: scenario.priceSnapshot,
      policy: scenario.policy,
    });
    return {
      scenarioId: scenario.id,
      status: 'success',
      auditRecord: evaluation.auditRecord,
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
  return readRunnerJsonFile<ScenarioRunnerInput>(filePath);
}

export function loadScenarioExpectations(filePath: string): ScenarioExpectations {
  return readRunnerJsonFile<ScenarioExpectations>(filePath);
}

function readRunnerJsonFile<T>(filePath: string): T {
  let raw: any;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e: any) {
    if (e?.code === 'ENOENT') throw new Error(`Runner: file not found: ${filePath}`, { cause: e });
    throw e;
  }
  if (typeof raw === 'string' && raw.trim() === '') {
    throw new Error(`Runner: file is empty: ${filePath}`);
  }
  try {
    return JSON.parse(raw as string) as T;
  } catch (e: any) {
    if (e instanceof SyntaxError) throw new Error(`Runner: invalid JSON in ${filePath}: ${e.message}`, { cause: e });
    throw e;
  }
}

export function validateScenarioExpectations(
  results: ScenarioRunResult[],
  expectations: ScenarioExpectations,
): ScenarioExpectationValidation {
  const resultsById = new Map(results.map((result) => [result.scenarioId, result]));
  const mismatches: ScenarioExpectationMismatch[] = [];

  for (const [scenarioId, expected] of Object.entries(expectations.scenarios).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const actual = resultsById.get(scenarioId);

    if (actual === undefined) {
      mismatches.push({
        scenarioId,
        expected,
        actualStatus: null,
        message: `Expected scenario ${scenarioId} was not run.`,
      });
      continue;
    }

    if (actual.status !== expected.status) {
      mismatches.push({
        scenarioId,
        expected,
        actualStatus: actual.status,
        message: `Scenario ${scenarioId} expected ${expected.status} but got ${actual.status}.`,
      });
      continue;
    }

    if (
      expected.status === 'error' &&
      expected.errorIncludes !== undefined &&
      actual.status === 'error' &&
      !actual.error.includes(expected.errorIncludes)
    ) {
      mismatches.push({
        scenarioId,
        expected,
        actualStatus: actual.status,
        message: `Scenario ${scenarioId} error did not include expected text: ${expected.errorIncludes}.`,
      });
    }
  }

  for (const result of results) {
    if (expectations.scenarios[result.scenarioId] === undefined) {
      mismatches.push({
        scenarioId: result.scenarioId,
        expected: null,
        actualStatus: result.status,
        message: `Scenario ${result.scenarioId} ran without an expected status entry.`,
      });
    }
  }

  return {
    isValid: mismatches.length === 0,
    checkedScenarioCount: Object.keys(expectations.scenarios).length,
    mismatches,
  };
}

if (require.main === module) {
  try {
    const fixturePath =
      process.argv[2] ?? path.join(process.cwd(), 'tests', 'fixtures', 'scenarios.json');
    const results = runScenarios(loadScenarioFixture(fixturePath));
    const expectationsPath = process.argv[3];
    const expectationValidation =
      expectationsPath === undefined
        ? undefined
        : validateScenarioExpectations(results, loadScenarioExpectations(expectationsPath));
    if (expectationValidation !== undefined && !expectationValidation.isValid) {
      process.exitCode = 1;
    }
    process.stdout.write(`${JSON.stringify({ results, expectationValidation }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
