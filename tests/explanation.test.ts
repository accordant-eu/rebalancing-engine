import * as fs from 'fs';
import * as path from 'path';
import { calculateCurrentWeights, calculateValuation } from '../src/core/valuation';
import { calculateDrift } from '../src/core/drift';
import { generateTradeProposal } from '../src/core/trades';
import { simulatePostTrade } from '../src/core/simulation';
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
  const drift = calculateDrift(weights, scenario.targetAllocation, scenario.policy);
  const trigger = new ThresholdStrategy().evaluateTrigger(
    scenario.portfolioState,
    drift,
    scenario.policy,
  );
  const proposal = generateTradeProposal(
    valuation,
    scenario.targetAllocation,
    scenario.priceSnapshot,
    scenario.policy,
  );
  const simulation = simulatePostTrade(
    scenario.portfolioState,
    scenario.priceSnapshot,
    scenario.targetAllocation,
    scenario.policy,
    proposal,
  );

  return { trigger, proposal, simulation };
}

describe('Recommendation Explanation', () => {
  it('explains a no-rebalance outcome', () => {
    const { trigger, proposal, simulation } = evaluateScenario('on_target');

    const explanation = generateExplanation(trigger, proposal, simulation);

    expect(explanation.summary).toContain('within tolerance');
    expect(explanation.triggerExplanation).toContain('No rebalance was triggered');
    expect(explanation.tradeExplanation).toBe('No trades are proposed.');
    expect(explanation.warningExplanation).toBeNull();
    expect(explanation.residualDriftExplanation).toContain('all assets within tolerance');
  });

  it('explains trigger rationale and proposed trades', () => {
    const { trigger, proposal, simulation } = evaluateScenario('one_asset_out_of_band');

    const explanation = generateExplanation(trigger, proposal, simulation);

    expect(explanation.summary).toContain('2 proposed trades');
    expect(explanation.triggerExplanation).toContain('Breached tolerance bands');
    expect(explanation.tradeExplanation).toContain('SELL 20.000000 US0378331005:XNAS:USD');
    expect(explanation.tradeExplanation).toContain('BUY 20.000000 US5949181045:XNAS:USD');
    expect(explanation.residualDriftExplanation).toContain(
      'Estimated sell-side turnover is 10.00%',
    );
  });

  it('explains suppressed trades and residual drift warnings', () => {
    const { trigger, proposal, simulation } = evaluateScenario('min_trade_size_issue');

    const explanation = generateExplanation(trigger, proposal, simulation);

    expect(explanation.summary).toContain('all proposed trades were suppressed');
    expect(explanation.warningExplanation).toContain('below minimum trade size');
    expect(explanation.residualDriftExplanation).toContain('US0378331005:XNAS:USD (2.50%)');
    expect(explanation.residualDriftExplanation).toContain('US5949181045:XNAS:USD (-2.50%)');
  });

  it('explains relative boundary trade sizing', () => {
    const { trigger, proposal, simulation } = evaluateScenario(
      'threshold_relative_boundary_target',
    );

    const explanation = generateExplanation(trigger, proposal, simulation);

    expect(explanation.triggerExplanation).toContain('Relative tolerance: 20.00%');
    expect(explanation.tradeExplanation).toContain('Proposed boundary (relative bands) trades');
    expect(explanation.tradeExplanation).toContain('SELL 30.000000 US0378331005:XNAS:USD');
    expect(explanation.residualDriftExplanation).toContain('all assets within tolerance');
  });
});
