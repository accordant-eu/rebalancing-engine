import { TradeOptimizerRegistry, TradeOptimizerInterface, TradeOptimizerContext } from '../../src/core/trade-optimizer';
import { TradeProposal } from '../../src/models/domain';
import { OracleTaxOptimizerAdapter } from '../../src/core/oracle-adapter';
import { calculateValuation } from '../../src/core/valuation';

class MockOptimizer implements TradeOptimizerInterface {
  readonly id = 'mock_optimizer';
  readonly name = 'Mock Optimizer';
  readonly description = 'Mock optimizer for testing';

  generateProposal(context: TradeOptimizerContext): TradeProposal {
    return {
      trades: [],
      estimatedPostTradeCash: context.valuation.cash,
      warnings: [],
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

describe('OracleTaxOptimizerAdapter Hardening', () => {
  let adapter: OracleTaxOptimizerAdapter;

  beforeEach(() => {
    adapter = new OracleTaxOptimizerAdapter({ serviceUrl: 'http://invalid-test-domain.local/v1/optimize', timeoutMs: 100 });
  });

  it('sanitizes response filtering out NaN, Infinity, negative quantity/price, and invalid directions', () => {
    const rawMaliciousResponse = {
      status: 'success',
      request_id: 'req_123',
      trades: [
        { identifier: 'AAPL', direction: 'BUY', quantity: 10, estimated_price: 150, lot_id: 'lot-1' }, // VALID
        { identifier: 'MSFT', direction: 'SELL', quantity: NaN, estimated_price: 300, lot_id: 'lot-2' }, // INVALID NaN qty
        { identifier: 'GOOGL', direction: 'BUY', quantity: -5, estimated_price: 2800, lot_id: 'lot-3' }, // INVALID negative qty
        { identifier: 'AMZN', direction: 'BUY', quantity: 2, estimated_price: Infinity, lot_id: 'lot-4' }, // INVALID Infinity price
        { identifier: 'TSLA', direction: 'INVALID_DIR', quantity: 10, estimated_price: 200, lot_id: 'lot-5' }, // INVALID direction
        { identifier: '', direction: 'BUY', quantity: 10, estimated_price: 200, lot_id: 'lot-6' }, // INVALID empty identifier
      ],
      metrics: {
        estimated_realized_loss: NaN,
        wash_sales_prevented: -1,
      },
    };

    const sanitized = adapter.sanitizeAndValidateResponse(rawMaliciousResponse, 'req_123');

    expect(sanitized.trades).toHaveLength(1);
    expect(sanitized.trades[0]).toEqual({
      identifier: 'AAPL',
      direction: 'BUY',
      quantity: 10,
      estimated_price: 150,
      lot_id: 'lot-1',
    });
    expect(sanitized.metrics?.estimated_realized_loss).toBe(0);
    expect(sanitized.metrics?.wash_sales_prevented).toBe(0);
  });

  it('rejects mismatched request_id replay payload', () => {
    const rawResponse = {
      status: 'success',
      request_id: 'req_attacker',
      trades: [],
    };

    expect(() => adapter.sanitizeAndValidateResponse(rawResponse, 'req_expected_123')).toThrow(
      'Replay or mismatched request_id (expected req_expected_123, got req_attacker)'
    );
  });

  it('trips adapter circuit breaker after 3 consecutive failures', async () => {
    const portfolioState = { accountId: 'acc-1', cash: 10000, holdings: [] };
    const priceSnapshot = { prices: { AAPL: 150 } };
    const targetAllocation = { targets: [{ instrumentId: 'AAPL', weight: 1 }] };
    const policy = { absoluteDriftTolerance: 0.05, minimumTradeSize: 10 };
    const valuation = calculateValuation(portfolioState, priceSnapshot);

    const mockContext: TradeOptimizerContext = {
      portfolioState,
      priceSnapshot,
      targetAllocation,
      policy,
      valuation,
      weights: [],
      driftMeasurements: [],
    };

    expect(adapter.getCircuitState()).toBe('CLOSED');

    // 3 consecutive failures
    await adapter.generateProposal(mockContext);
    await adapter.generateProposal(mockContext);
    await adapter.generateProposal(mockContext);

    expect(adapter.getCircuitState()).toBe('OPEN');

    // 4th call while OPEN immediately returns fallback warning without retrying fetch
    const proposal = await adapter.generateProposal(mockContext);
    expect(proposal.warnings.some((w) => w.code === 'TAX_OPTIMIZER_UNREACHABLE_FALLBACK' && w.message.includes('circuit breaker OPEN'))).toBe(true);
  });
});
