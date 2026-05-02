import * as fs from 'fs';
import * as path from 'path';
import {
  PortfolioState,
  TargetAllocation,
  PriceSnapshot,
  RebalancingPolicy,
} from '../src/models/domain';

interface Scenario {
  id: string;
  description: string;
  portfolioState: PortfolioState;
  targetAllocation: TargetAllocation;
  priceSnapshot: PriceSnapshot;
  policy: RebalancingPolicy;
}

describe('Domain Fixtures', () => {
  it('should load and validate scenario fixtures', () => {
    const scenariosPath = path.join(__dirname, 'fixtures', 'scenarios.json');
    const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));

    expect(scenariosData).toHaveProperty('scenarios');
    const scenarios: Scenario[] = scenariosData.scenarios;
    expect(scenarios.length).toBeGreaterThan(0);

    const expectedIds = [
      'on_target',
      'one_asset_out_of_band',
      'multiple_assets_out_of_band',
      'positive_cash',
      'min_trade_size_issue',
      'missing_price',
      'target_allocation_sum_error',
      'invalid_strategy',
      'invalid_cash_flow_amount',
      'holding_outside_universe',
      'calendar_due',
      'calendar_not_due',
      'threshold_boundary_target',
      'threshold_relative_boundary_target',
      'settled_deposit_cash_flow',
      'settled_withdrawal_cash_flow',
      'pending_cash_flow',
    ];

    const actualIds = scenarios.map((s) => s.id);
    expectedIds.forEach((id) => {
      expect(actualIds).toContain(id);
    });

    // Basic structure validation
    scenarios.forEach((scenario) => {
      expect(scenario.portfolioState.accountId).toBeDefined();
      expect(typeof scenario.portfolioState.cash).toBe('number');
      expect(Array.isArray(scenario.portfolioState.holdings)).toBe(true);

      expect(Array.isArray(scenario.targetAllocation.targets)).toBe(true);
      expect(typeof scenario.priceSnapshot.prices).toBe('object');
      expect(typeof scenario.policy.absoluteDriftTolerance).toBe('number');
      if (scenario.policy.strategyType === 'calendar') {
        expect(scenario.policy.calendar).toBeDefined();
        expect(typeof scenario.policy.calendar?.evaluationDate).toBe('string');
        expect(typeof scenario.policy.calendar?.nextRebalanceDate).toBe('string');
      }
    });
  });
});
