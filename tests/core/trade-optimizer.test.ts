import { TradeOptimizerRegistry, TradeOptimizerInterface, TradeOptimizerContext } from '../../src/core/trade-optimizer';
import { TradeProposal } from '../../src/models/domain';

class MockOptimizer implements TradeOptimizerInterface {
  readonly id = 'mock_optimizer';
  readonly name = 'Mock Optimizer';
  readonly description = 'Mock optimizer for testing';

  generateProposal(context: TradeOptimizerContext): TradeProposal {
    return {
      trades: [],
      estimatedPostTradeCash: context.valuation.cash,
      executionTargetMode: 'full_reset',
    };
  }
}

describe('TradeOptimizerRegistry', () => {
  let registry: TradeOptimizerRegistry;

  beforeEach(() => {
    registry = TradeOptimizerRegistry.getInstance();
    registry.reset();
  });

  it('should register and retrieve trade optimizers', () => {
    const mock = new MockOptimizer();
    registry.register(mock);

    const retrieved = registry.get('mock_optimizer');
    expect(retrieved).toBe(mock);
    expect(retrieved.name).toBe('Mock Optimizer');
  });

  it('should list all registered optimizers', () => {
    const mock = new MockOptimizer();
    registry.register(mock);

    const list = registry.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual({
      id: 'mock_optimizer',
      name: 'Mock Optimizer',
      description: 'Mock optimizer for testing',
    });
  });

  it('should throw an error for unregistered optimizer when no fallback exists', () => {
    expect(() => registry.get('non_existent')).toThrow('Unknown trade optimizer: non_existent');
  });
});
