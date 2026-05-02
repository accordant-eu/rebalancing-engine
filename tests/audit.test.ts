import * as fs from 'fs';
import * as path from 'path';
import { generateAuditRecord, serializeAuditRecord } from '../src/audit';
import { calculateDrift } from '../src/core/drift';
import { simulatePostTrade } from '../src/core/simulation';
import { generateTradeProposal } from '../src/core/trades';
import { calculateCurrentWeights, calculateValuation } from '../src/core/valuation';
import { generateExplanation } from '../src/explanation';
import { ThresholdStrategy } from '../src/strategy/threshold';

const scenariosPath = path.join(__dirname, 'fixtures', 'scenarios.json');
const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));

function scenarioById(id: string) {
  const scenario = scenariosData.scenarios.find((s: any) => s.id === id);
  expect(scenario).toBeDefined();
  return scenario;
}

function evaluateScenario(id: string) {
  const scenario = scenarioById(id);
  const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);
  const weights = calculateCurrentWeights(valuation);
  const driftMeasurements = calculateDrift(weights, scenario.targetAllocation, scenario.policy);
  const trigger = new ThresholdStrategy().evaluateTrigger(
    scenario.portfolioState,
    driftMeasurements,
    scenario.policy,
  );
  const tradeProposal = generateTradeProposal(
    valuation,
    scenario.targetAllocation,
    scenario.priceSnapshot,
    scenario.policy,
  );
  const postTradeSimulation = simulatePostTrade(
    scenario.portfolioState,
    scenario.priceSnapshot,
    scenario.targetAllocation,
    scenario.policy,
    tradeProposal,
  );
  const explanation = generateExplanation(trigger, tradeProposal, postTradeSimulation);

  return {
    scenario,
    driftMeasurements,
    trigger,
    tradeProposal,
    postTradeSimulation,
    explanation,
  };
}

describe('Audit Record', () => {
  it('captures inputs and outputs required for deterministic replay', () => {
    const evaluation = evaluateScenario('one_asset_out_of_band');

    const record = generateAuditRecord({
      eventId: 'audit-1',
      createdAt: '2026-05-02T00:00:00.000Z',
      portfolioState: evaluation.scenario.portfolioState,
      targetAllocation: evaluation.scenario.targetAllocation,
      priceSnapshot: evaluation.scenario.priceSnapshot,
      policy: evaluation.scenario.policy,
      driftMeasurements: evaluation.driftMeasurements,
      trigger: evaluation.trigger,
      tradeProposal: evaluation.tradeProposal,
      postTradeSimulation: evaluation.postTradeSimulation,
      explanation: evaluation.explanation,
    });

    expect(record.eventId).toBe('audit-1');
    expect(record.createdAt).toBe('2026-05-02T00:00:00.000Z');
    expect(record.accountId).toBe('acc-2');
    expect(record.inputs.portfolioState).toEqual(evaluation.scenario.portfolioState);
    expect(record.inputs.targetAllocation).toEqual(evaluation.scenario.targetAllocation);
    expect(record.inputs.priceSnapshot).toEqual(evaluation.scenario.priceSnapshot);
    expect(record.inputs.policy).toEqual(evaluation.scenario.policy);
    expect(record.outputs.tradeProposal).toEqual(evaluation.tradeProposal);
    expect(record.outputs.explanation.summary).toContain('2 proposed trades');

    const replayValuation = calculateValuation(
      record.inputs.portfolioState,
      record.inputs.priceSnapshot,
    );
    const replayWeights = calculateCurrentWeights(replayValuation);
    const replayDrift = calculateDrift(
      replayWeights,
      record.inputs.targetAllocation,
      record.inputs.policy,
    );
    const replayProposal = generateTradeProposal(
      replayValuation,
      record.inputs.targetAllocation,
      record.inputs.priceSnapshot,
      record.inputs.policy,
    );

    expect(replayDrift).toEqual(record.outputs.driftMeasurements);
    expect(replayProposal).toEqual(record.outputs.tradeProposal);
  });

  it('serializes audit records deterministically', () => {
    const evaluation = evaluateScenario('min_trade_size_issue');
    const record = generateAuditRecord({
      eventId: 'audit-min-trade',
      createdAt: '2026-05-02T00:00:00.000Z',
      portfolioState: evaluation.scenario.portfolioState,
      targetAllocation: evaluation.scenario.targetAllocation,
      priceSnapshot: evaluation.scenario.priceSnapshot,
      policy: evaluation.scenario.policy,
      driftMeasurements: evaluation.driftMeasurements,
      trigger: evaluation.trigger,
      tradeProposal: evaluation.tradeProposal,
      postTradeSimulation: evaluation.postTradeSimulation,
      explanation: evaluation.explanation,
    });

    const first = serializeAuditRecord(record);
    const second = serializeAuditRecord(record);

    expect(first).toBe(second);
    expect(JSON.parse(first)).toEqual(record);
    expect(first).toContain('"eventId": "audit-min-trade"');
    expect(first).toContain('"MINIMUM_TRADE_SIZE"');
  });
});
