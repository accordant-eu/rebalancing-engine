import * as fs from 'fs';
import * as path from 'path';
import { supportedStrategyTypes } from '../core/evaluation';
import { runScenario, runScenarios, validateScenarioExpectations } from '../runner';
import { UsageError } from './errors';
import { BATCH_HELP, INSPECT_HELP, ROOT_HELP, RUN_HELP, VALIDATE_HELP } from './help';
import {
  defaultScenarioManifestPath,
  loadExplicitScenario,
  loadOneScenario,
  loadScenarioManifests,
  loadScenarioSelection,
  readJsonFile,
  validateInputMode,
} from './input';
import { getFormat, getStringOption, hasBooleanOption, OutputFormat, ParsedArgs } from './options';
import { BatchOutput, CliOutput, InspectOutput, renderOutput, ValidateOutput } from './render';
import { validateScenarioFixture } from './validation';
import { executeAgent } from './agent';

export interface CommandContext {
  cwd: string;
  stdin?: string;
}

export interface CommandResult {
  exitCode: number;
  output: string;
}

export async function executeCommand(parsed: ParsedArgs, context: CommandContext): Promise<CommandResult> {
  if (hasBooleanOption(parsed.options, 'help') && parsed.command === undefined) {
    return { exitCode: 0, output: ROOT_HELP };
  }

  if (hasBooleanOption(parsed.options, 'version')) {
    return { exitCode: 0, output: `${readPackageVersion(context.cwd)}\n` };
  }

  const format = getFormat(parsed.options);
  const quiet = hasBooleanOption(parsed.options, 'quiet');

  switch (parsed.command) {
    case undefined:
      return { exitCode: 0, output: ROOT_HELP };
    case 'help':
      return { exitCode: 0, output: helpFor(parsed.subcommand) };
    case 'validate':
      return renderCommandOutput(executeValidate(parsed, context), format, quiet);
    case 'run':
      return renderCommandOutput(executeRun(parsed, context), format, quiet);
    case 'batch':
      return renderCommandOutput(executeBatch(parsed, context), format, quiet);
    case 'inspect':
      return renderCommandOutput(executeInspect(parsed, context), format, quiet);
    case 'agent':
      return await executeAgent(parsed, context);
    default:
      throw new UsageError(`Unknown command: ${parsed.command}`);
  }
}

export function writeOutputIfRequested(
  result: CommandResult,
  options: Record<string, string | boolean>,
  cwd: string,
): CommandResult {
  const outputPath = getStringOption(options, 'output');
  if (outputPath === undefined) {
    return result;
  }

  const resolvedPath = path.resolve(cwd, outputPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, result.output, 'utf8');
  return { ...result, output: '' };
}

function executeValidate(
  parsed: ParsedArgs,
  context: CommandContext,
): CommandResult & {
  data: ValidateOutput;
} {
  if (hasBooleanOption(parsed.options, 'help')) {
    return { exitCode: 0, output: VALIDATE_HELP, data: emptyValidateOutput() };
  }

  const scenarioPath = getStringOption(parsed.options, 'scenario');
  const scenarioId = getStringOption(parsed.options, 'scenario-id');
  const explicitPaths = {
    portfolio: getStringOption(parsed.options, 'portfolio'),
    prices: getStringOption(parsed.options, 'prices'),
    target: getStringOption(parsed.options, 'target'),
    policy: getStringOption(parsed.options, 'policy'),
    scenarioId,
  };
  validateInputMode(scenarioPath, explicitPaths);

  const scenarios =
    scenarioPath === undefined
      ? [loadExplicitScenario(explicitPaths, context.cwd)]
      : loadScenarioSelection(scenarioPath, scenarioId, context.cwd, context.stdin);
  const results = scenarios.map((scenario) => validateScenarioFixture(scenario));
  const invalidCount = results.filter((result) => result.status === 'invalid').length;
  const warningCount = results.reduce(
    (count, result) => (result.status === 'valid' ? count + result.warningCount : count),
    0,
  );
  const data: ValidateOutput = {
    command: 'validate',
    status: invalidCount === 0 ? 'valid' : 'invalid',
    summary: {
      scenarioCount: results.length,
      validCount: results.length - invalidCount,
      invalidCount,
      warningCount,
    },
    results,
  };
  return {
    exitCode: exitCodeForStatus(invalidCount, warningCount, parsed),
    output: '',
    data,
  };
}

function executeRun(
  parsed: ParsedArgs,
  context: CommandContext,
): CommandResult & {
  data: CliOutput;
} {
  if (hasBooleanOption(parsed.options, 'help')) {
    return { exitCode: 0, output: RUN_HELP, data: emptyValidateOutput() };
  }

  const scenarioPath = getStringOption(parsed.options, 'scenario');
  const scenarioId = getStringOption(parsed.options, 'scenario-id');
  const explicitPaths = {
    portfolio: getStringOption(parsed.options, 'portfolio'),
    prices: getStringOption(parsed.options, 'prices'),
    target: getStringOption(parsed.options, 'target'),
    policy: getStringOption(parsed.options, 'policy'),
    scenarioId,
  };
  validateInputMode(scenarioPath, explicitPaths);

  const scenario =
    scenarioPath === undefined
      ? loadExplicitScenario(explicitPaths, context.cwd)
      : loadOneScenario(scenarioPath, scenarioId, context.cwd, context.stdin);
  const result = runScenario(scenario);
  const warningCount =
    result.status === 'success' ? result.auditRecord.outputs.tradeProposal.warnings.length : 0;
  const data: CliOutput = {
    command: 'run',
    scenarioId: scenario.id,
    status: result.status,
    result,
  };

  return {
    exitCode: result.status === 'error' ? 1 : exitCodeForStatus(0, warningCount, parsed),
    output: '',
    data,
  };
}

function executeBatch(
  parsed: ParsedArgs,
  context: CommandContext,
): CommandResult & {
  data: BatchOutput;
} {
  if (hasBooleanOption(parsed.options, 'help')) {
    return { exitCode: 0, output: BATCH_HELP, data: emptyBatchOutput() };
  }

  const scenariosPath = getStringOption(parsed.options, 'scenarios');
  if (scenariosPath === undefined) {
    throw new UsageError('Provide --scenarios <path>.');
  }

  const format = getFormat(parsed.options);
  const input = loadScenarioManifests(scenariosPath, context.cwd);
  const results = runScenarios(input);
  const expectationsPath = getStringOption(parsed.options, 'expectations');
  const expectationValidation =
    expectationsPath === undefined
      ? undefined
      : validateScenarioExpectations(results, readJsonFile(expectationsPath, context.cwd));
  const errorCount = results.filter((result) => result.status === 'error').length;
  const successCount = results.length - errorCount;
  const warningCount = results.reduce(
    (count, result) =>
      result.status === 'success'
        ? count + result.auditRecord.outputs.tradeProposal.warnings.length
        : count,
    0,
  );
  const hasBlockingFailure =
    expectationValidation === undefined ? errorCount > 0 : !expectationValidation.isValid;
  const data: BatchOutput = {
    command: 'batch',
    status: hasBlockingFailure ? 'error' : 'success',
    summary: {
      scenarioCount: results.length,
      successCount,
      errorCount,
      warningCount,
    },
    results,
    expectationValidation,
  };

  writeBatchScenarioOutputsIfRequested(results, parsed, context, format);

  return {
    exitCode: hasBlockingFailure ? 1 : exitCodeForStatus(0, warningCount, parsed),
    output: '',
    data,
  };
}

function writeBatchScenarioOutputsIfRequested(
  results: BatchOutput['results'],
  parsed: ParsedArgs,
  context: CommandContext,
  stdoutFormat: OutputFormat,
): void {
  const outputDir = getStringOption(parsed.options, 'output-dir');
  if (outputDir === undefined) {
    return;
  }

  const resolvedDir = path.resolve(context.cwd, outputDir);
  fs.mkdirSync(resolvedDir, { recursive: true });

  const perScenarioFormat =
    getStringOption(parsed.options, 'format') === undefined ? 'json' : stdoutFormat;
  const extension = perScenarioFormat === 'json' ? 'json' : 'txt';
  const force = hasBooleanOption(parsed.options, 'force');

  const plannedOutputs = results.map((result) => ({
    result,
    path: path.join(resolvedDir, `${sanitizeScenarioFileName(result.scenarioId)}.${extension}`),
  }));
  const outputPaths = new Set<string>();
  for (const output of plannedOutputs) {
    if (outputPaths.has(output.path)) {
      throw new UsageError(
        `Batch output scenario IDs produce duplicate file name: ${path.basename(output.path)}`,
      );
    }
    outputPaths.add(output.path);
  }

  if (!force) {
    const existingPath = plannedOutputs.find((output) => fs.existsSync(output.path))?.path;
    if (existingPath !== undefined) {
      throw new UsageError(
        `Batch output file already exists: ${path.relative(context.cwd, existingPath)}. Use --force to overwrite.`,
      );
    }
  }

  for (const output of plannedOutputs) {
    fs.writeFileSync(
      output.path,
      renderOutput(
        {
          command: 'run',
          scenarioId: output.result.scenarioId,
          status: output.result.status,
          result: output.result,
        },
        perScenarioFormat,
        false,
      ),
      'utf8',
    );
  }
}

function sanitizeScenarioFileName(scenarioId: string): string {
  const sanitized = scenarioId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized === '' || sanitized === '.' || sanitized === '..' ? 'scenario' : sanitized;
}

function executeInspect(
  parsed: ParsedArgs,
  context: CommandContext,
): CommandResult & {
  data: InspectOutput;
} {
  if (hasBooleanOption(parsed.options, 'help') || parsed.subcommand === undefined) {
    return { exitCode: 0, output: INSPECT_HELP, data: emptyInspectOutput() };
  }

  switch (parsed.subcommand) {
    case 'scenarios': {
      const scenariosPath =
        getStringOption(parsed.options, 'scenarios') ?? defaultScenarioManifestPath(context.cwd);
      if (scenariosPath === undefined) {
        throw new UsageError('Provide --scenarios <path>.');
      }
      const input = loadScenarioManifests(scenariosPath, context.cwd);
      return {
        exitCode: 0,
        output: '',
        data: {
          command: 'inspect',
          subject: 'scenarios',
          items: input.scenarios
            .map((scenario) => ({
              id: scenario.id,
              description: scenario.description,
              strategyType: scenario.policy.strategyType ?? 'threshold',
              cashFlowScheduleCount: scenario.portfolioState.cashFlowSchedules?.length ?? 0,
              evaluationDate:
                scenario.policy.evaluationDate ?? scenario.policy.calendar?.evaluationDate,
            }))
            .sort((left, right) => left.id.localeCompare(right.id)),
        },
      };
    }
    case 'strategies':
      return {
        exitCode: 0,
        output: '',
        data: {
          command: 'inspect',
          subject: 'strategies',
          items: supportedStrategyTypes().map((strategyType) => ({
            strategyType,
            default: strategyType === 'threshold',
            description: strategyDescription(strategyType),
          })),
        },
      };
    case 'policies':
      return {
        exitCode: 0,
        output: '',
        data: {
          command: 'inspect',
          subject: 'policies',
          items: policyFieldDescriptions(),
        },
      };
    default:
      throw new UsageError(`Unknown inspect subject: ${parsed.subcommand}`);
  }
}

function renderCommandOutput(
  result: CommandResult & { data?: CliOutput },
  format: OutputFormat,
  quiet: boolean,
): CommandResult {
  if (result.output !== '' || result.data === undefined) {
    return result;
  }
  return {
    exitCode: result.exitCode,
    output: renderOutput(result.data, format, quiet),
  };
}

function exitCodeForStatus(
  invalidOrErrorCount: number,
  warningCount: number,
  parsed: ParsedArgs,
): number {
  if (invalidOrErrorCount > 0) {
    return 1;
  }
  if (warningCount > 0 && hasBooleanOption(parsed.options, 'strict')) {
    return 1;
  }
  return 0;
}

function helpFor(command: string | undefined): string {
  switch (command) {
    case undefined:
      return ROOT_HELP;
    case 'validate':
      return VALIDATE_HELP;
    case 'run':
      return RUN_HELP;
    case 'batch':
      return BATCH_HELP;
    case 'inspect':
      return INSPECT_HELP;
    default:
      throw new UsageError(`Unknown help topic: ${command}`);
  }
}

function readPackageVersion(cwd: string): string {
  const packagePath = path.relative(cwd, path.resolve(__dirname, '..', '..', 'package.json'));
  const packageJson = readJsonFile<{ version?: string }>(packagePath, cwd);
  return packageJson.version ?? '0.0.0';
}

function strategyDescription(strategyType: string): string {
  switch (strategyType) {
    case 'calendar':
      return 'Rebalance when caller-supplied evaluation date reaches the configured rebalance date.';
    case 'manual':
      return 'Always trigger a rebalance when requested by policy.';
    case 'threshold':
      return 'Trigger when absolute or relative drift exceeds configured tolerance bands.';
    default:
      return 'Supported strategy.';
  }
}

function policyFieldDescriptions(): Array<{
  name: string;
  required: boolean;
  description: string;
}> {
  return [
    {
      name: 'evaluationDate',
      required: false,
      description:
        'ISO YYYY-MM-DD date used to evaluate scheduled cash flows for non-calendar workflows.',
    },
    {
      name: 'absoluteDriftTolerance',
      required: true,
      description: 'Global absolute drift tolerance, for example 0.05 for 5%.',
    },
    {
      name: 'minimumTradeSize',
      required: true,
      description: 'Global minimum estimated trade value. Smaller trades become warnings.',
    },
    {
      name: 'strategyType',
      required: false,
      description: 'threshold, calendar, or manual. Omitted value defaults to threshold.',
    },
    {
      name: 'relativeDriftTolerance',
      required: false,
      description: 'Relative drift tolerance used by threshold and relative-boundary policies.',
    },
    {
      name: 'executionTargetMode',
      required: false,
      description: 'full_reset by default, or boundary for tolerance-boundary targeting.',
    },
    {
      name: 'boundaryBandMode',
      required: false,
      description: 'absolute by default in boundary mode, or relative.',
    },
    {
      name: 'calendar',
      required: false,
      description: 'Required only when strategyType is calendar.',
    },
    {
      name: 'sellSelectionMode',
      required: false,
      description: 'FIFO, LIFO, HIGHEST_COST, or LOWEST_COST for generic tax-lot allocation.',
    },
  ];
}

function emptyValidateOutput(): ValidateOutput {
  return {
    command: 'validate',
    status: 'valid',
    summary: {
      scenarioCount: 0,
      validCount: 0,
      invalidCount: 0,
      warningCount: 0,
    },
    results: [],
  };
}

function emptyBatchOutput(): BatchOutput {
  return {
    command: 'batch',
    status: 'success',
    summary: {
      scenarioCount: 0,
      successCount: 0,
      errorCount: 0,
      warningCount: 0,
    },
    results: [],
  };
}

function emptyInspectOutput(): InspectOutput {
  return {
    command: 'inspect',
    subject: 'strategies',
    items: [],
  };
}
