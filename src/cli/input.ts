import * as fs from 'fs';
import * as path from 'path';
import {
  PortfolioState,
  PriceSnapshot,
  RebalancingPolicy,
  TargetAllocation,
} from '../models/domain';
import { ScenarioFixture, ScenarioRunnerInput } from '../runner';
import { UsageError } from './errors';

export interface ExplicitInputPaths {
  portfolio?: string;
  prices?: string;
  target?: string;
  policy?: string;
  scenarioId?: string;
}

export interface JsonInputOptions {
  stdin?: string;
  allowStdin?: boolean;
}

export function readJsonFile<T>(filePath: string, cwd: string, options: JsonInputOptions = {}): T {
  if (filePath === '-') {
    if (options.allowStdin !== true) {
      throw new UsageError('Stdin is supported only for --scenario -.');
    }

    const content = options.stdin ?? fs.readFileSync(0, 'utf8');
    if (content.trim() === '') {
      throw new UsageError('Stdin scenario input is empty.');
    }

    try {
      return JSON.parse(content) as T;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new UsageError(`Invalid JSON in stdin: ${error.message}`);
      }
      throw error;
    }
  }

  const resolvedPath = path.resolve(cwd, filePath);
  try {
    return JSON.parse(fs.readFileSync(resolvedPath, 'utf8')) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new UsageError(`Invalid JSON in ${filePath}: ${error.message}`);
    }
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new UsageError(`File not found: ${filePath}`);
    }
    throw error;
  }
}

export function loadScenarioSelection(
  scenarioPath: string,
  scenarioId: string | undefined,
  cwd: string,
  stdin?: string,
): ScenarioFixture[] {
  const input = readJsonFile<ScenarioFixture | ScenarioRunnerInput>(scenarioPath, cwd, {
    allowStdin: true,
    stdin,
  });
  const scenarios = isScenarioRunnerInput(input) ? input.scenarios : [input];

  if (scenarioId === undefined) {
    return scenarios;
  }

  const scenario = scenarios.find((candidate) => candidate.id === scenarioId);
  if (scenario === undefined) {
    throw new UsageError(`Scenario ID not found in ${scenarioPath}: ${scenarioId}`);
  }
  return [scenario];
}

export function loadOneScenario(
  scenarioPath: string,
  scenarioId: string | undefined,
  cwd: string,
  stdin?: string,
): ScenarioFixture {
  const scenarios = loadScenarioSelection(scenarioPath, scenarioId, cwd, stdin);

  if (scenarios.length !== 1) {
    throw new UsageError(
      `Scenario manifest contains ${scenarios.length} scenarios. Provide --scenario-id to run one scenario.`,
    );
  }

  return scenarios[0];
}

export function loadExplicitScenario(paths: ExplicitInputPaths, cwd: string): ScenarioFixture {
  const missing = [
    ['portfolio', paths.portfolio],
    ['prices', paths.prices],
    ['target', paths.target],
    ['policy', paths.policy],
  ]
    .filter(([, value]) => value === undefined)
    .map(([name]) => `--${name}`);

  if (missing.length > 0) {
    throw new UsageError(`Explicit input mode requires ${missing.join(', ')}.`);
  }

  return {
    id: paths.scenarioId ?? 'explicit_input',
    description: 'Scenario assembled from explicit input files',
    portfolioState: readJsonFile<PortfolioState>(paths.portfolio as string, cwd),
    priceSnapshot: readJsonFile<PriceSnapshot>(paths.prices as string, cwd),
    targetAllocation: readJsonFile<TargetAllocation>(paths.target as string, cwd),
    policy: readJsonFile<RebalancingPolicy>(paths.policy as string, cwd),
  };
}

export function loadScenarioManifests(inputPath: string, cwd: string): ScenarioRunnerInput {
  if (inputPath === '-') {
    throw new UsageError('Stdin is supported only for --scenario -, not --scenarios.');
  }

  const resolvedPath = path.resolve(cwd, inputPath);
  const stat = statPath(resolvedPath, inputPath);

  if (stat.isFile()) {
    return { scenarios: loadScenarioSelection(inputPath, undefined, cwd) };
  }

  if (!stat.isDirectory()) {
    throw new UsageError(`Scenario path is not a file or directory: ${inputPath}`);
  }

  const scenarios = fs
    .readdirSync(resolvedPath)
    .filter((fileName) => fileName.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right))
    .flatMap((fileName) => {
      const childPath = path.join(inputPath, fileName);
      const input = readJsonFile<unknown>(childPath, cwd);
      return isScenarioRunnerInput(input) ? input.scenarios : [];
    });

  if (scenarios.length === 0) {
    throw new UsageError(`No scenario manifests found in directory: ${inputPath}`);
  }

  return { scenarios };
}

export function validateInputMode(
  scenarioPath: string | undefined,
  explicitPaths: ExplicitInputPaths,
): void {
  const hasExplicitInput =
    explicitPaths.portfolio !== undefined ||
    explicitPaths.prices !== undefined ||
    explicitPaths.target !== undefined ||
    explicitPaths.policy !== undefined;

  if (
    explicitPaths.portfolio === '-' ||
    explicitPaths.prices === '-' ||
    explicitPaths.target === '-' ||
    explicitPaths.policy === '-'
  ) {
    throw new UsageError('Stdin is supported only for --scenario -, not explicit input files.');
  }

  if (scenarioPath !== undefined && hasExplicitInput) {
    throw new UsageError('Use either --scenario or explicit input files, not both.');
  }

  if (scenarioPath === undefined && !hasExplicitInput) {
    throw new UsageError('Provide --scenario or explicit input files.');
  }
}

export function defaultScenarioManifestPath(cwd: string): string | undefined {
  const relativePath = path.join('tests', 'fixtures', 'scenarios.json');
  return fs.existsSync(path.resolve(cwd, relativePath)) ? relativePath : undefined;
}

function statPath(resolvedPath: string, displayPath: string): fs.Stats {
  try {
    return fs.statSync(resolvedPath);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new UsageError(`File not found: ${displayPath}`);
    }
    throw error;
  }
}

function isScenarioRunnerInput(value: unknown): value is ScenarioRunnerInput {
  return (
    value !== null &&
    typeof value === 'object' &&
    Array.isArray((value as { scenarios?: unknown }).scenarios)
  );
}
