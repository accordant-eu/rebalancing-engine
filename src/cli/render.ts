import { roundAuditRecordOutputs } from '../audit';
import { ScenarioRunResult, ScenarioExpectationValidation } from '../runner';
import { supportedStrategyTypes } from '../core/evaluation';
import { stableStringify } from './json';
import { OutputFormat } from './options';
import { ValidationResult } from './validation';

export interface RunOutput {
  command: 'run';
  scenarioId: string;
  status: ScenarioRunResult['status'];
  result: ScenarioRunResult;
}

export interface ValidateOutput {
  command: 'validate';
  status: 'valid' | 'invalid';
  summary: {
    scenarioCount: number;
    validCount: number;
    invalidCount: number;
    warningCount: number;
  };
  results: ValidationResult[];
}

export interface BatchOutput {
  command: 'batch';
  status: 'success' | 'error';
  summary: {
    scenarioCount: number;
    successCount: number;
    errorCount: number;
    warningCount: number;
  };
  results: ScenarioRunResult[];
  expectationValidation?: ScenarioExpectationValidation;
}

export interface InspectOutput {
  command: 'inspect';
  subject: 'scenarios' | 'strategies' | 'policies';
  items: unknown[];
}

export type CliOutput = RunOutput | ValidateOutput | BatchOutput | InspectOutput;

export function renderOutput(output: CliOutput, format: OutputFormat, quiet: boolean): string {
  if (quiet && format !== 'json') {
    return '';
  }

  if (format === 'json') {
    return stableStringify(normalizeForJson(output));
  }

  if (format === 'pretty') {
    return renderPretty(output);
  }

  return renderSummary(output);
}

export function normalizeRunResult(result: ScenarioRunResult): ScenarioRunResult {
  if (result.status === 'error') {
    return result;
  }
  return {
    ...result,
    auditRecord: roundAuditRecordOutputs(result.auditRecord),
  };
}

function normalizeForJson(output: CliOutput): unknown {
  switch (output.command) {
    case 'run':
      return {
        ...output,
        result: normalizeRunResult(output.result),
      };
    case 'batch':
      return {
        ...output,
        results: output.results.map((result) => normalizeRunResult(result)),
      };
    default:
      return output;
  }
}

function renderSummary(output: CliOutput): string {
  switch (output.command) {
    case 'validate':
      return [
        `Validation: ${output.status}`,
        `Scenarios: ${output.summary.scenarioCount} valid: ${output.summary.validCount} invalid: ${output.summary.invalidCount} warnings: ${output.summary.warningCount}`,
        ...output.results
          .filter((result) => result.status === 'invalid')
          .map((result) => `- ${result.scenarioId}: ${result.error}`),
      ]
        .join('\n')
        .concat('\n');
    case 'run':
      return renderRunSummary(output.result);
    case 'batch':
      return [
        `Batch: ${output.status}`,
        `Scenarios: ${output.summary.scenarioCount} success: ${output.summary.successCount} errors: ${output.summary.errorCount} warnings: ${output.summary.warningCount}`,
        ...(output.expectationValidation === undefined
          ? []
          : [
              `Expectations: ${output.expectationValidation.isValid ? 'valid' : 'invalid'} checked: ${output.expectationValidation.checkedScenarioCount}`,
              ...output.expectationValidation.mismatches.map(
                (mismatch) => `- ${mismatch.scenarioId}: ${mismatch.message}`,
              ),
            ]),
        ...output.results
          .filter((result) => result.status === 'error')
          .map((result) => `- ${result.scenarioId}: ${result.error}`),
      ]
        .join('\n')
        .concat('\n');
    case 'inspect':
      return renderInspectSummary(output);
  }
}

function renderPretty(output: CliOutput): string {
  switch (output.command) {
    case 'run':
      return renderRunPretty(output.result);
    case 'validate':
    case 'batch':
    case 'inspect':
      return renderSummary(output);
  }
}

function renderRunSummary(result: ScenarioRunResult): string {
  if (result.status === 'error') {
    return `Scenario: ${result.scenarioId}\nStatus: error\nError: ${result.error}\n`;
  }

  const auditRecord = roundAuditRecordOutputs(result.auditRecord);
  const outputs = auditRecord.outputs;
  return [
    `Scenario: ${result.scenarioId}`,
    'Status: success',
    `Strategy: ${outputs.strategyType}`,
    `Rebalance needed: ${outputs.trigger.isTriggered ? 'yes' : 'no'}`,
    `Reason: ${outputs.trigger.reason ?? 'none'}`,
    `Trades: ${outputs.tradeProposal.trades.length}`,
    `Warnings: ${outputs.tradeProposal.warnings.length}`,
    ...(outputs.cashFlowScheduleSummary === undefined
      ? []
      : [
          `Scheduled cash flows: applied ${outputs.cashFlowScheduleSummary.appliedEventCount} future ${outputs.cashFlowScheduleSummary.futureEventCount}`,
        ]),
    `Turnover: ${outputs.postTradeSimulation.turnover}`,
  ]
    .join('\n')
    .concat('\n');
}

function renderRunPretty(result: ScenarioRunResult): string {
  if (result.status === 'error') {
    return renderRunSummary(result);
  }

  const auditRecord = roundAuditRecordOutputs(result.auditRecord);
  const outputs = auditRecord.outputs;
  const lines = [
    `Scenario: ${result.scenarioId}`,
    'Status: success',
    `Account: ${auditRecord.accountId}`,
    `Strategy: ${outputs.strategyType}`,
    `Execution target: ${outputs.executionTargetMode}${outputs.boundaryBandMode === undefined ? '' : ` (${outputs.boundaryBandMode})`}`,
    `Rebalance needed: ${outputs.trigger.isTriggered ? 'yes' : 'no'}`,
    `Reason: ${outputs.trigger.reason ?? 'none'}`,
    '',
    'Trades:',
    ...formatTrades(outputs.tradeProposal.trades),
    '',
    'Warnings:',
    ...formatWarnings(outputs.tradeProposal.warnings),
    '',
    'Scheduled cash flows:',
    ...formatCashFlowScheduleSummary(outputs.cashFlowScheduleSummary),
    '',
    'Explanation:',
    outputs.explanation.summary,
    outputs.explanation.triggerExplanation,
    outputs.explanation.cashFlowScheduleExplanation ?? 'No scheduled cash flows were evaluated.',
    outputs.explanation.tradeExplanation,
    outputs.explanation.warningExplanation ?? 'No warnings.',
    outputs.explanation.residualDriftExplanation,
    '',
    `Turnover: ${outputs.postTradeSimulation.turnover}`,
  ];

  return `${lines.join('\n')}\n`;
}

function formatCashFlowScheduleSummary(
  summary:
    | {
        evaluationDate: string;
        sourceScheduleCount: number;
        appliedEventCount: number;
        futureEventCount: number;
        alreadyRepresentedEventCount: number;
        netAppliedCashFlow: number;
        netFutureCashFlow: number;
      }
    | undefined,
): string[] {
  if (summary === undefined) {
    return ['- none'];
  }

  return [
    `- evaluation date ${summary.evaluationDate}`,
    `- source schedules ${summary.sourceScheduleCount}`,
    `- applied events ${summary.appliedEventCount} net ${summary.netAppliedCashFlow}`,
    `- future events ${summary.futureEventCount} net ${summary.netFutureCashFlow}`,
    `- already represented events ${summary.alreadyRepresentedEventCount}`,
  ];
}

function formatTrades(
  trades: Array<{
    instrumentId: string;
    direction: string;
    quantity: number;
    estimatedValue: number;
  }>,
): string[] {
  if (trades.length === 0) {
    return ['- none'];
  }
  return trades.map(
    (trade) =>
      `- ${trade.direction} ${trade.instrumentId} quantity ${trade.quantity} estimated value ${trade.estimatedValue}`,
  );
}

function formatWarnings(warnings: Array<{ message: string }>): string[] {
  if (warnings.length === 0) {
    return ['- none'];
  }
  return warnings.map((warning) => `- ${warning.message}`);
}

function renderInspectSummary(output: InspectOutput): string {
  switch (output.subject) {
    case 'scenarios':
      return [
        `Scenarios: ${output.items.length}`,
        ...output.items.map((item) => {
          const scenario = item as {
            id: string;
            description?: string;
            cashFlowScheduleCount?: number;
          };
          const scheduleSuffix =
            scenario.cashFlowScheduleCount === undefined || scenario.cashFlowScheduleCount === 0
              ? ''
              : ` [scheduled cash flows: ${scenario.cashFlowScheduleCount}]`;
          return `- ${scenario.id}${scheduleSuffix}${scenario.description === undefined ? '' : `: ${scenario.description}`}`;
        }),
      ]
        .join('\n')
        .concat('\n');
    case 'strategies':
      return [
        `Strategies: ${supportedStrategyTypes().length}`,
        ...output.items.map((item) => {
          const strategy = item as { strategyType: string; default?: boolean; description: string };
          return `- ${strategy.strategyType}${strategy.default === true ? ' (default)' : ''}: ${strategy.description}`;
        }),
      ]
        .join('\n')
        .concat('\n');
    case 'policies':
      return [
        `Policy fields: ${output.items.length}`,
        ...output.items.map((item) => {
          const field = item as { name: string; required: boolean; description: string };
          return `- ${field.name}${field.required ? ' (required)' : ''}: ${field.description}`;
        }),
      ]
        .join('\n')
        .concat('\n');
  }
}
