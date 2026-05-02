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

  it('rejects unsupported strategy identifiers explicitly', () => {
    expect(() => selectStrategy('unsupported')).toThrow(
      'Unsupported rebalancing strategy: unsupported',
    );
  });
});
