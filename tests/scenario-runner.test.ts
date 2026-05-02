import * as fs from 'fs';
import * as path from 'path';
import { runScenarios } from '../src/runner';

const scenariosPath = path.join(__dirname, 'fixtures', 'scenarios.json');
const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));

describe('Scenario Runner', () => {
  it('runs every fixture and reports deterministic per-scenario results', () => {
    const first = runScenarios(scenariosData);
    const second = runScenarios(scenariosData);

    expect(first).toEqual(second);
    expect(first.map((result) => result.scenarioId)).toEqual([
      'calendar_due',
      'calendar_not_due',
      'holding_outside_universe',
      'min_trade_size_issue',
      'missing_price',
      'multiple_assets_out_of_band',
      'on_target',
      'one_asset_out_of_band',
      'positive_cash',
      'target_allocation_sum_error',
      'threshold_boundary_target',
    ]);
  });

  it('returns audit records for successful scenarios and errors for invalid scenarios', () => {
    const results = runScenarios(scenariosData);
    const successes = results.filter((result) => result.status === 'success');
    const errors = results.filter((result) => result.status === 'error');

    expect(successes).toHaveLength(9);
    expect(errors).toHaveLength(2);

    const success = successes.find((result) => result.scenarioId === 'one_asset_out_of_band');
    expect(success?.status).toBe('success');
    if (success?.status === 'success') {
      expect(success.auditRecord.eventId).toBe('scenario:one_asset_out_of_band');
      expect(success.auditRecord.createdAt).toBe('2026-05-02T00:00:00.000Z');
      expect(success.auditRecord.outputs.explanation.summary).toContain('2 proposed trades');
    }

    const missingPrice = errors.find((result) => result.scenarioId === 'missing_price');
    expect(missingPrice?.status).toBe('error');
    if (missingPrice?.status === 'error') {
      expect(missingPrice.error).toBe('Missing price for instrument: MSFT');
    }

    const targetError = errors.find(
      (result) => result.scenarioId === 'target_allocation_sum_error',
    );
    expect(targetError?.status).toBe('error');
    if (targetError?.status === 'error') {
      expect(targetError.error).toContain('Target allocation does not sum to 100%');
    }

    const calendarDue = successes.find((result) => result.scenarioId === 'calendar_due');
    expect(calendarDue?.status).toBe('success');
    if (calendarDue?.status === 'success') {
      expect(calendarDue.auditRecord.outputs.strategyType).toBe('calendar');
      expect(calendarDue.auditRecord.outputs.trigger.isTriggered).toBe(true);
    }

    const calendarNotDue = successes.find((result) => result.scenarioId === 'calendar_not_due');
    expect(calendarNotDue?.status).toBe('success');
    if (calendarNotDue?.status === 'success') {
      expect(calendarNotDue.auditRecord.outputs.strategyType).toBe('calendar');
      expect(calendarNotDue.auditRecord.outputs.trigger.isTriggered).toBe(false);
      expect(calendarNotDue.auditRecord.outputs.tradeProposal.trades).toEqual([]);
    }
  });
});
