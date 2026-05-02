import { roundAuditRecordOutputs } from '../audit';
import { evaluateRebalance } from '../core/evaluation';
import { ProposalWarning } from '../models/domain';
import { ScenarioFixture } from '../runner';

export const CLI_CREATED_AT = '2026-05-02T00:00:00.000Z';

export interface ValidationSuccess {
  scenarioId: string;
  status: 'valid';
  warningCount: number;
  warnings: ProposalWarning[];
}

export interface ValidationFailure {
  scenarioId: string;
  status: 'invalid';
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export function validateScenarioFixture(scenario: ScenarioFixture): ValidationResult {
  try {
    const evaluation = evaluateRebalance({
      eventId: `scenario:${scenario.id}`,
      createdAt: CLI_CREATED_AT,
      portfolioState: scenario.portfolioState,
      targetAllocation: scenario.targetAllocation,
      priceSnapshot: scenario.priceSnapshot,
      policy: scenario.policy,
    });
    const auditRecord = roundAuditRecordOutputs(evaluation.auditRecord);
    const warnings = auditRecord.outputs.tradeProposal.warnings;
    return {
      scenarioId: scenario.id,
      status: 'valid',
      warningCount: warnings.length,
      warnings,
    };
  } catch (error) {
    return {
      scenarioId: scenario.id,
      status: 'invalid',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
