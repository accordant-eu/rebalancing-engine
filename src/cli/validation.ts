import { roundAuditRecordOutputs } from '../audit';
import { evaluateRebalance } from '../core/evaluation';
import { ProposalWarning } from '../models/domain';
import { ScenarioFixture } from '../runner';

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

export function validateScenarioFixture(scenario: ScenarioFixture, createdAt?: string): ValidationResult {
  try {
    const evaluation = evaluateRebalance({
      eventId: `scenario:${scenario.id}`,
      createdAt: createdAt ?? new Date().toISOString(),
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
