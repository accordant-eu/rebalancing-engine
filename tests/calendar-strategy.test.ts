import * as fs from 'fs';
import * as path from 'path';
import { calculateDrift } from '../src/core/drift';
import { evaluateRebalance } from '../src/core/evaluation';
import { calculateCurrentWeights, calculateValuation } from '../src/core/valuation';
import { CalendarRebalanceStrategy } from '../src/strategy';

const scenariosPath = path.join(__dirname, 'fixtures', 'scenarios.json');
const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));

function scenarioById(id: string) {
  const scenario = scenariosData.scenarios.find((s: any) => s.id === id);
  expect(scenario).toBeDefined();
  return scenario;
}

describe('Calendar Rebalance Strategy', () => {
  it('triggers when the supplied evaluation date is on or after the next rebalance date', () => {
    const scenario = scenarioById('calendar_due');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);
    const weights = calculateCurrentWeights(valuation);
    const drift = calculateDrift(weights, scenario.targetAllocation, scenario.policy);

    const trigger = new CalendarRebalanceStrategy().evaluateTrigger(
      scenario.portfolioState,
      drift,
      scenario.policy,
    );

    expect(trigger.isTriggered).toBe(true);
    expect(trigger.strategyType).toBe('calendar');
    expect(trigger.reason).toBe('Calendar rebalance due on 2026-05-01.');
    expect(trigger.metadata).toEqual({
      evaluationDate: '2026-05-02',
      nextRebalanceDate: '2026-05-01',
      frequency: 'quarterly',
    });
  });

  it('does not trigger before the supplied next rebalance date', () => {
    const scenario = scenarioById('calendar_not_due');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);
    const weights = calculateCurrentWeights(valuation);
    const drift = calculateDrift(weights, scenario.targetAllocation, scenario.policy);

    const trigger = new CalendarRebalanceStrategy().evaluateTrigger(
      scenario.portfolioState,
      drift,
      scenario.policy,
    );

    expect(trigger).toEqual({
      isTriggered: false,
      reason: null,
      strategyType: 'calendar',
      metadata: {
        evaluationDate: '2026-05-02',
        nextRebalanceDate: '2026-06-01',
        frequency: 'quarterly',
      },
    });
  });

  it('runs through the shared evaluation workflow and audit output', () => {
    const scenario = scenarioById('calendar_due');

    const evaluation = evaluateRebalance({
      eventId: 'calendar-due-test',
      createdAt: '2026-05-02T00:00:00.000Z',
      portfolioState: scenario.portfolioState,
      targetAllocation: scenario.targetAllocation,
      priceSnapshot: scenario.priceSnapshot,
      policy: scenario.policy,
    });

    expect(evaluation.trigger.strategyType).toBe('calendar');
    expect(evaluation.tradeProposal.trades).toHaveLength(2);
    expect(evaluation.auditRecord.outputs.strategyType).toBe('calendar');
    expect(evaluation.explanation.triggerExplanation).toContain('Strategy calendar');
  });

  it('does not describe a not-due calendar hold as an in-tolerance portfolio', () => {
    const scenario = scenarioById('calendar_not_due');

    const evaluation = evaluateRebalance({
      eventId: 'calendar-not-due-test',
      createdAt: '2026-05-02T00:00:00.000Z',
      portfolioState: scenario.portfolioState,
      targetAllocation: scenario.targetAllocation,
      priceSnapshot: scenario.priceSnapshot,
      policy: scenario.policy,
    });

    expect(evaluation.trigger.isTriggered).toBe(false);
    expect(evaluation.explanation.summary).toBe(
      'Strategy did not trigger; no rebalance is recommended.',
    );
    expect(evaluation.explanation.residualDriftExplanation).toContain('residual out-of-band drift');
  });

  it('rejects calendar strategy without calendar policy configuration', () => {
    const scenario = scenarioById('one_asset_out_of_band');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);
    const weights = calculateCurrentWeights(valuation);
    const drift = calculateDrift(weights, scenario.targetAllocation, scenario.policy);

    expect(() =>
      new CalendarRebalanceStrategy().evaluateTrigger(scenario.portfolioState, drift, {
        ...scenario.policy,
        strategyType: 'calendar',
      }),
    ).toThrow('Calendar strategy requires calendar policy configuration');
  });

  it('rejects datetime strings for evaluationDate (timezone-local ambiguity guard)', () => {
    expect(() =>
      new CalendarRebalanceStrategy().evaluateTrigger({} as any, [], {
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 0,
        strategyType: 'calendar',
        calendar: {
          evaluationDate: '2026-05-02T00:00:00',
          nextRebalanceDate: '2026-05-01',
        },
      }),
    ).toThrow('YYYY-MM-DD');
  });

  it('rejects datetime strings for nextRebalanceDate (timezone-local ambiguity guard)', () => {
    expect(() =>
      new CalendarRebalanceStrategy().evaluateTrigger({} as any, [], {
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 0,
        strategyType: 'calendar',
        calendar: {
          evaluationDate: '2026-05-02',
          nextRebalanceDate: '2026-05-01T00:00:00Z',
        },
      }),
    ).toThrow('YYYY-MM-DD');
  });

  it('rejects non-date strings for calendar dates', () => {
    expect(() =>
      new CalendarRebalanceStrategy().evaluateTrigger({} as any, [], {
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 0,
        strategyType: 'calendar',
        calendar: {
          evaluationDate: 'not-a-date',
          nextRebalanceDate: '2026-05-01',
        },
      }),
    ).toThrow('YYYY-MM-DD');
  });
});
