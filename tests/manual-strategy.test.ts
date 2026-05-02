import * as fs from 'fs';
import * as path from 'path';
import { calculateDrift } from '../src/core/drift';
import { simulatePostTrade } from '../src/core/simulation';
import { generateTradeProposal } from '../src/core/trades';
import { calculateCurrentWeights, calculateValuation } from '../src/core/valuation';
import { generateExplanation } from '../src/explanation';
import { ManualRebalanceStrategy } from '../src/strategy';

const scenariosPath = path.join(__dirname, 'fixtures', 'scenarios.json');
const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));

function scenarioById(id: string) {
  const scenario = scenariosData.scenarios.find((s: any) => s.id === id);
  expect(scenario).toBeDefined();
  return scenario;
}

describe('Manual Rebalance Strategy', () => {
  it('triggers even when threshold drift is in band', () => {
    const scenario = scenarioById('on_target');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);
    const weights = calculateCurrentWeights(valuation);
    const drift = calculateDrift(weights, scenario.targetAllocation, scenario.policy);

    const trigger = new ManualRebalanceStrategy().evaluateTrigger(
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

    expect(trigger).toEqual({
      isTriggered: true,
      reason: 'Manual rebalance requested.',
    });
    expect(proposal.trades).toEqual([]);
  });

  it('reuses shared proposal, simulation, and explanation logic', () => {
    const scenario = scenarioById('positive_cash');
    const valuation = calculateValuation(scenario.portfolioState, scenario.priceSnapshot);
    const weights = calculateCurrentWeights(valuation);
    const drift = calculateDrift(weights, scenario.targetAllocation, scenario.policy);
    const trigger = new ManualRebalanceStrategy().evaluateTrigger(
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
    const explanation = generateExplanation(trigger, proposal, simulation);

    expect(proposal.trades.map((trade) => trade.direction)).toEqual(['BUY', 'BUY']);
    expect(simulation.postTradeState.cash).toBe(0);
    expect(explanation.triggerExplanation).toContain('Manual rebalance requested');
  });
});
