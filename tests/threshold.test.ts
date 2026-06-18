import * as fs from 'fs';
import * as path from 'path';
import { calculateValuation, calculateCurrentWeights } from '../src/core/valuation';
import { calculateDrift } from '../src/core/drift';
import { ThresholdStrategy } from '../src/strategy/threshold';
import {
  PortfolioState,
  PriceSnapshot,
  TargetAllocation,
  RebalancingPolicy,
} from '../src/models/domain';

const scenariosPath = path.join(__dirname, 'fixtures', 'scenarios.json');
const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));

describe('Threshold Strategy', () => {
  const strategy = new ThresholdStrategy();

  it('does not trigger when all assets are in band', () => {
    const scenario = scenariosData.scenarios.find((s: any) => s.id === 'on_target');
    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;
    const target: TargetAllocation = scenario.targetAllocation;
    const policy: RebalancingPolicy = scenario.policy;

    const valuation = calculateValuation(state, prices);
    const weights = calculateCurrentWeights(valuation);
    const drift = calculateDrift(weights, target, policy);

    const triggerResult = strategy.evaluateTrigger(state, drift, policy);
    expect(triggerResult.isTriggered).toBe(false);
    expect(triggerResult.reason).toBeNull();
  });

  it('triggers when an asset breaches the band', () => {
    const scenario = scenariosData.scenarios.find((s: any) => s.id === 'one_asset_out_of_band');
    const state: PortfolioState = scenario.portfolioState;
    const prices: PriceSnapshot = scenario.priceSnapshot;
    const target: TargetAllocation = scenario.targetAllocation;
    const policy: RebalancingPolicy = scenario.policy;

    const valuation = calculateValuation(state, prices);
    const weights = calculateCurrentWeights(valuation);
    const drift = calculateDrift(weights, target, policy);

    const triggerResult = strategy.evaluateTrigger(state, drift, policy);
    expect(triggerResult.isTriggered).toBe(true);
    expect(triggerResult.reason).toContain('US0378331005:XNAS:USD (abs drift: 10.00%)');
    expect(triggerResult.reason).toContain('US5949181045:XNAS:USD (abs drift: -10.00%)');
    expect(triggerResult.reason).toContain('Policy absolute tolerance: 5.00%');
  });
});
