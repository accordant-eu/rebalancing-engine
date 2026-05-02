import * as fs from 'fs';
import * as path from 'path';
import { evaluateRebalance, selectStrategy, supportedStrategyTypes } from '../src/core';

const scenariosPath = path.join(__dirname, 'fixtures', 'scenarios.json');
const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));

function scenarioById(id: string) {
  const scenario = scenariosData.scenarios.find((s: any) => s.id === id);
  expect(scenario).toBeDefined();
  return scenario;
}

describe('Rebalance Evaluation', () => {
  it('exposes supported strategies in stable order', () => {
    expect(supportedStrategyTypes()).toEqual(['calendar', 'manual', 'threshold']);
  });

  it('defaults omitted strategy policies to threshold evaluation', () => {
    const scenario = scenarioById('one_asset_out_of_band');

    const evaluation = evaluateRebalance({
      eventId: 'evaluation-threshold-default',
      createdAt: '2026-05-02T00:00:00.000Z',
      portfolioState: scenario.portfolioState,
      targetAllocation: scenario.targetAllocation,
      priceSnapshot: scenario.priceSnapshot,
      policy: scenario.policy,
    });

    expect(evaluation.trigger.strategyType).toBe('threshold');
    expect(evaluation.trigger.isTriggered).toBe(true);
    expect(evaluation.tradeProposal.executionTargetMode).toBe('full_reset');
    expect(evaluation.tradeProposal.trades.map((trade) => trade.instrumentId)).toEqual([
      'AAPL',
      'MSFT',
    ]);
    expect(evaluation.auditRecord.outputs.strategyType).toBe('threshold');
  });

  it('uses selected strategy metadata for no-trigger evaluations', () => {
    const scenario = scenarioById('calendar_not_due');

    const evaluation = evaluateRebalance({
      eventId: 'evaluation-calendar-not-due',
      createdAt: '2026-05-02T00:00:00.000Z',
      portfolioState: scenario.portfolioState,
      targetAllocation: scenario.targetAllocation,
      priceSnapshot: scenario.priceSnapshot,
      policy: scenario.policy,
    });

    expect(evaluation.trigger).toMatchObject({
      isTriggered: false,
      reason: null,
      strategyType: 'calendar',
      metadata: {
        evaluationDate: '2026-05-02',
        nextRebalanceDate: '2026-06-01',
        frequency: 'quarterly',
      },
    });
    expect(evaluation.tradeProposal.trades).toEqual([]);
    expect(evaluation.tradeProposal.estimatedPostTradeCash).toBe(evaluation.valuation.cash);
    expect(evaluation.auditRecord.outputs.strategyType).toBe('calendar');
  });

  it('surfaces pending cash-flow warnings and audit metadata without applying pending cash', () => {
    const scenario = scenarioById('on_target');

    const evaluation = evaluateRebalance({
      eventId: 'evaluation-pending-flow',
      createdAt: '2026-05-02T00:00:00.000Z',
      portfolioState: {
        ...scenario.portfolioState,
        cashFlows: [
          {
            cashFlowId: 'pending-deposit-1',
            direction: 'DEPOSIT',
            status: 'PENDING',
            amount: 1000,
          },
        ],
      },
      targetAllocation: scenario.targetAllocation,
      priceSnapshot: scenario.priceSnapshot,
      policy: scenario.policy,
    });

    expect(evaluation.valuation.cash).toBe(0);
    expect(evaluation.valuation.cashFlowSummary?.pendingDeposits).toBe(1000);
    expect(evaluation.tradeProposal.trades).toEqual([]);
    expect(evaluation.tradeProposal.warnings).toEqual([
      expect.objectContaining({ code: 'PENDING_CASH_FLOW_EXCLUDED' }),
    ]);
    expect(evaluation.explanation.warningExplanation).toContain('Excluded 1 pending cash flow');
    expect(evaluation.auditRecord.outputs.cashFlowSummary?.pendingDeposits).toBe(1000);
  });

  it('applies due scheduled deposits to valuation, proposal sizing, explanation, and audit output', () => {
    const evaluation = evaluateRebalance({
      eventId: 'evaluation-scheduled-deposit',
      createdAt: '2026-05-02T00:00:00.000Z',
      portfolioState: {
        accountId: 'scheduled-deposit-account',
        cash: 0,
        holdings: [
          { instrumentId: 'AAPL', quantity: 100 },
          { instrumentId: 'MSFT', quantity: 100 },
        ],
        cashFlowSchedules: [
          {
            cashFlowScheduleId: 'deposit',
            direction: 'DEPOSIT',
            amount: 1000,
            effectiveDate: '2026-05-02',
          },
        ],
      },
      targetAllocation: {
        targets: [
          { instrumentId: 'AAPL', weight: 0.5 },
          { instrumentId: 'MSFT', weight: 0.5 },
        ],
      },
      priceSnapshot: { prices: { AAPL: 100, MSFT: 100 } },
      policy: { evaluationDate: '2026-05-02', absoluteDriftTolerance: 0.01, minimumTradeSize: 0 },
    });

    expect(evaluation.valuation.cash).toBe(1000);
    expect(evaluation.tradeProposal.trades).toEqual([
      expect.objectContaining({ instrumentId: 'AAPL', direction: 'BUY', estimatedValue: 500 }),
      expect.objectContaining({ instrumentId: 'MSFT', direction: 'BUY', estimatedValue: 500 }),
    ]);
    expect(evaluation.cashFlowScheduleSummary?.appliedEventCount).toBe(1);
    expect(evaluation.auditRecord.inputs.portfolioState.cashFlows).toBeUndefined();
    expect(evaluation.auditRecord.outputs.cashFlowScheduleSummary?.netAppliedCashFlow).toBe(1000);
    expect(evaluation.explanation.cashFlowScheduleExplanation).toContain('applied 1 event');
  });

  it('applies due scheduled withdrawals through existing sell proposal behavior', () => {
    const evaluation = evaluateRebalance({
      eventId: 'evaluation-scheduled-withdrawal',
      createdAt: '2026-05-02T00:00:00.000Z',
      portfolioState: {
        accountId: 'scheduled-withdrawal-account',
        cash: 0,
        holdings: [
          { instrumentId: 'AAPL', quantity: 100 },
          { instrumentId: 'MSFT', quantity: 100 },
        ],
        cashFlowSchedules: [
          {
            cashFlowScheduleId: 'withdrawal',
            direction: 'WITHDRAWAL',
            amount: 1000,
            effectiveDate: '2026-05-01',
          },
        ],
      },
      targetAllocation: {
        targets: [
          { instrumentId: 'AAPL', weight: 0.5 },
          { instrumentId: 'MSFT', weight: 0.5 },
        ],
      },
      priceSnapshot: { prices: { AAPL: 100, MSFT: 100 } },
      policy: { evaluationDate: '2026-05-02', absoluteDriftTolerance: 0.01, minimumTradeSize: 0 },
    });

    expect(evaluation.valuation.cash).toBe(-1000);
    expect(evaluation.tradeProposal.trades).toEqual([
      expect.objectContaining({ instrumentId: 'AAPL', direction: 'SELL', estimatedValue: 500 }),
      expect.objectContaining({ instrumentId: 'MSFT', direction: 'SELL', estimatedValue: 500 }),
    ]);
    expect(evaluation.tradeProposal.estimatedPostTradeCash).toBe(0);
    expect(evaluation.auditRecord.outputs.cashFlowScheduleSummary?.netAppliedCashFlow).toBe(
      -1000,
    );
  });

  it('excludes future scheduled flows from valuation and proposal sizing while warning', () => {
    const evaluation = evaluateRebalance({
      eventId: 'evaluation-future-scheduled-deposit',
      createdAt: '2026-05-02T00:00:00.000Z',
      portfolioState: {
        accountId: 'future-scheduled-account',
        cash: 0,
        holdings: [
          { instrumentId: 'AAPL', quantity: 100 },
          { instrumentId: 'MSFT', quantity: 100 },
        ],
        cashFlowSchedules: [
          {
            cashFlowScheduleId: 'future-deposit',
            direction: 'DEPOSIT',
            amount: 1000,
            effectiveDate: '2026-05-03',
          },
        ],
      },
      targetAllocation: {
        targets: [
          { instrumentId: 'AAPL', weight: 0.5 },
          { instrumentId: 'MSFT', weight: 0.5 },
        ],
      },
      priceSnapshot: { prices: { AAPL: 100, MSFT: 100 } },
      policy: { evaluationDate: '2026-05-02', absoluteDriftTolerance: 0.01, minimumTradeSize: 0 },
    });

    expect(evaluation.valuation.cash).toBe(0);
    expect(evaluation.tradeProposal.trades).toEqual([]);
    expect(evaluation.tradeProposal.warnings).toEqual([
      expect.objectContaining({ code: 'FUTURE_CASH_FLOW_SCHEDULED' }),
    ]);
    expect(evaluation.auditRecord.outputs.cashFlowScheduleSummary?.futureEventCount).toBe(1);
  });

  it('rejects unsupported strategy identifiers explicitly', () => {
    expect(() => selectStrategy('unsupported')).toThrow(
      'Unsupported rebalancing strategy: unsupported',
    );
  });
});
