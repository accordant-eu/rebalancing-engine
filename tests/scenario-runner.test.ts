import * as fs from 'fs';
import * as path from 'path';
import {
  loadScenarioExpectations,
  runScenarios,
  validateScenarioExpectations,
} from '../src/runner';

const scenariosPath = path.join(__dirname, 'fixtures', 'scenarios.json');
const expectationsPath = path.join(__dirname, 'fixtures', 'scenario-expectations.json');
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
      'invalid_cash_flow_amount',
      'invalid_recurring_cash_flow',
      'invalid_strategy',
      'min_trade_size_issue',
      'missing_price',
      'multiple_assets_out_of_band',
      'on_target',
      'one_asset_out_of_band',
      'pending_cash_flow',
      'positive_cash',
      'recurring_monthly_contribution',
      'recurring_quarterly_withdrawal',
      'scheduled_cash_flow_already_settled',
      'scheduled_deposit_due',
      'scheduled_deposit_future',
      'scheduled_deposit_on_evaluation_date',
      'scheduled_withdrawal_due',
      'settled_deposit_cash_flow',
      'settled_withdrawal_cash_flow',
      'target_allocation_sum_error',
      'tax_lot_fifo_sell',
      'threshold_boundary_target',
      'threshold_relative_boundary_target',
    ]);
  });

  it('returns audit records for successful scenarios and errors for invalid scenarios', () => {
    const results = runScenarios(scenariosData);
    const successes = results.filter((result) => result.status === 'success');
    const errors = results.filter((result) => result.status === 'error');

    expect(successes).toHaveLength(21);
    expect(errors).toHaveLength(5);

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

    const invalidStrategy = errors.find((result) => result.scenarioId === 'invalid_strategy');
    expect(invalidStrategy?.status).toBe('error');
    if (invalidStrategy?.status === 'error') {
      expect(invalidStrategy.error).toContain('Unsupported rebalancing strategy');
    }

    const targetError = errors.find(
      (result) => result.scenarioId === 'target_allocation_sum_error',
    );
    expect(targetError?.status).toBe('error');
    if (targetError?.status === 'error') {
      expect(targetError.error).toContain('Target allocation does not sum to 100%');
    }

    const invalidCashFlow = errors.find(
      (result) => result.scenarioId === 'invalid_cash_flow_amount',
    );
    expect(invalidCashFlow?.status).toBe('error');
    if (invalidCashFlow?.status === 'error') {
      expect(invalidCashFlow.error).toContain('Cash flow amount must be positive');
    }

    const invalidRecurringCashFlow = errors.find(
      (result) => result.scenarioId === 'invalid_recurring_cash_flow',
    );
    expect(invalidRecurringCashFlow?.status).toBe('error');
    if (invalidRecurringCashFlow?.status === 'error') {
      expect(invalidRecurringCashFlow.error).toContain(
        'Unsupported cash flow recurrence frequency',
      );
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

    const pendingCashFlow = successes.find((result) => result.scenarioId === 'pending_cash_flow');
    expect(pendingCashFlow?.status).toBe('success');
    if (pendingCashFlow?.status === 'success') {
      expect(pendingCashFlow.auditRecord.outputs.cashFlowSummary?.pendingDeposits).toBe(1000);
      expect(pendingCashFlow.auditRecord.outputs.tradeProposal.warnings[0].code).toBe(
        'PENDING_CASH_FLOW_EXCLUDED',
      );
    }

    const taxLotSell = successes.find((result) => result.scenarioId === 'tax_lot_fifo_sell');
    expect(taxLotSell?.status).toBe('success');
    if (taxLotSell?.status === 'success') {
      const aaplSell = taxLotSell.auditRecord.outputs.tradeProposal.trades.find(
        (trade) => trade.instrumentId === 'AAPL',
      );
      expect(aaplSell?.lotAllocations?.[0].lotId).toBe('aapl-older-lot');
      expect(taxLotSell.auditRecord.outputs.explanation.tradeExplanation).toContain(
        'aapl-older-lot',
      );
    }

    const scheduledDeposit = successes.find((result) => result.scenarioId === 'scheduled_deposit_due');
    expect(scheduledDeposit?.status).toBe('success');
    if (scheduledDeposit?.status === 'success') {
      expect(scheduledDeposit.auditRecord.outputs.cashFlowScheduleSummary?.appliedEventCount).toBe(
        1,
      );
      expect(scheduledDeposit.auditRecord.outputs.cashFlowScheduleSummary?.netAppliedCashFlow).toBe(
        1000,
      );
    }
  });

  it('validates results against an expected-status manifest', () => {
    const results = runScenarios(scenariosData);
    const expectations = loadScenarioExpectations(expectationsPath);

    const validation = validateScenarioExpectations(results, expectations);

    expect(validation).toEqual({
      isValid: true,
      checkedScenarioCount: 26,
      mismatches: [],
    });
  });

  it('reports expected-status manifest mismatches', () => {
    const results = runScenarios(scenariosData);

    const validation = validateScenarioExpectations(results, {
      scenarios: {
        on_target: { status: 'error' },
        missing_price: { status: 'error', errorIncludes: 'different error text' },
        not_in_fixture: { status: 'success' },
      },
    });

    expect(validation.isValid).toBe(false);
    expect(validation.mismatches.map((mismatch) => mismatch.scenarioId)).toEqual([
      'missing_price',
      'not_in_fixture',
      'on_target',
      'calendar_due',
      'calendar_not_due',
      'holding_outside_universe',
      'invalid_cash_flow_amount',
      'invalid_recurring_cash_flow',
      'invalid_strategy',
      'min_trade_size_issue',
      'multiple_assets_out_of_band',
      'one_asset_out_of_band',
      'pending_cash_flow',
      'positive_cash',
      'recurring_monthly_contribution',
      'recurring_quarterly_withdrawal',
      'scheduled_cash_flow_already_settled',
      'scheduled_deposit_due',
      'scheduled_deposit_future',
      'scheduled_deposit_on_evaluation_date',
      'scheduled_withdrawal_due',
      'settled_deposit_cash_flow',
      'settled_withdrawal_cash_flow',
      'target_allocation_sum_error',
      'tax_lot_fifo_sell',
      'threshold_boundary_target',
      'threshold_relative_boundary_target',
    ]);
  });
});
