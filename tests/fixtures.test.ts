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
      'holding_outside_universe',
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
    });
  });
});
