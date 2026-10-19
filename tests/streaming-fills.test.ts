import { SqliteStateManager } from '../src/orchestrator/sqlite-state';
import { initDb } from '../src/db/sqlite';
import { systemEventBus, TradeFillEvent } from '../src/events/bus';

describe('Streaming Execution Fills & Shadow Ledger Reconciliation', () => {
  let stateManager: SqliteStateManager;

  beforeEach(() => {
    initDb(':memory:');
    stateManager = new SqliteStateManager();

    stateManager.createTenant('tenant-stream', 'Streaming Tenant');
    stateManager.registerPortfolio('acc-stream-1', {
      portfolioState: {
        accountId: 'acc-stream-1',
        tenantId: 'tenant-stream',
        cash: 2000,
        holdings: [],
      },
      priceSnapshot: { prices: { AAPL: 150 } },
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 1.0 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      archetype: 'StaticWeights',
    });
  });

  it('processes incremental partial fill followed by complete fill and emits events', () => {
    const events: TradeFillEvent[] = [];
    const listener = (evt: any) => {
      if (evt.type === 'TRADE_FILL') {
        events.push(evt);
      }
    };
    systemEventBus.on('system_event', listener);

    try {
      // 1. Register BUY order for 10 shares of AAPL
      stateManager.registerOrder('ord-1', 'acc-stream-1', 'AAPL', 'BUY', 10);

      // 2. Partial fill: 4 shares @ 150
      stateManager.processExecutionReport(
        'ord-1',
        'acc-stream-1',
        'PARTIALLY_FILLED',
        4,
        150,
        '2026-10-19T10:00:00.000Z'
      );

      let state = stateManager.getAccountState('acc-stream-1');
      // 4 * 150 = 600 exchanged -> Cash: 2000 - 600 = 1400. AAPL qty: 4
      expect(state.portfolioState.cash).toBe(1400);
      expect(state.portfolioState.holdings).toEqual([{ instrumentId: 'AAPL', quantity: 4 }]);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'TRADE_FILL',
        accountId: 'acc-stream-1',
        tenantId: 'tenant-stream',
        orderId: 'ord-1',
        instrumentId: 'AAPL',
        direction: 'BUY',
        status: 'PARTIALLY_FILLED',
        deltaFilled: 4,
        totalFilled: 4,
        fillPrice: 150,
        remainingQuantity: 6,
      });

      // 3. Complete fill: total 10 shares @ 150
      stateManager.processExecutionReport(
        'ord-1',
        'acc-stream-1',
        'FILLED',
        10,
        150,
        '2026-10-19T10:00:05.000Z'
      );

      state = stateManager.getAccountState('acc-stream-1');
      // Additional 6 * 150 = 900 exchanged -> Cash: 1400 - 900 = 500. AAPL qty: 10
      expect(state.portfolioState.cash).toBe(500);
      expect(state.portfolioState.holdings).toEqual([{ instrumentId: 'AAPL', quantity: 10 }]);

      expect(events).toHaveLength(2);
      expect(events[1]).toMatchObject({
        type: 'TRADE_FILL',
        accountId: 'acc-stream-1',
        tenantId: 'tenant-stream',
        orderId: 'ord-1',
        instrumentId: 'AAPL',
        direction: 'BUY',
        status: 'FILLED',
        deltaFilled: 6,
        totalFilled: 10,
        fillPrice: 150,
        remainingQuantity: 0,
      });
    } finally {
      systemEventBus.off('system_event', listener);
    }
  });

  it('handles duplicate identical fill reports idempotently without double-charging cash', () => {
    stateManager.registerOrder('ord-dup', 'acc-stream-1', 'AAPL', 'BUY', 10);

    // Initial fill: 5 shares @ 150
    stateManager.processExecutionReport('ord-dup', 'acc-stream-1', 'PARTIALLY_FILLED', 5, 150);
    const initialCash = stateManager.getAccountState('acc-stream-1').portfolioState.cash;
    expect(initialCash).toBe(1250); // 2000 - 750

    // Duplicate fill report
    stateManager.processExecutionReport('ord-dup', 'acc-stream-1', 'PARTIALLY_FILLED', 5, 150);
    const postDupCash = stateManager.getAccountState('acc-stream-1').portfolioState.cash;
    expect(postDupCash).toBe(1250);
    expect(stateManager.getAccountState('acc-stream-1').portfolioState.holdings).toEqual([
      { instrumentId: 'AAPL', quantity: 5 },
    ]);
  });

  it('safely discards out-of-order execution reports with older timestamps', () => {
    stateManager.registerOrder('ord-ooo', 'acc-stream-1', 'AAPL', 'BUY', 10);

    // Newer complete fill arrives first at T=10
    stateManager.processExecutionReport(
      'ord-ooo',
      'acc-stream-1',
      'FILLED',
      10,
      150,
      '2026-10-19T10:00:10.000Z'
    );
    expect(stateManager.getAccountState('acc-stream-1').portfolioState.cash).toBe(500);
    expect(stateManager.getAccountState('acc-stream-1').portfolioState.holdings).toEqual([
      { instrumentId: 'AAPL', quantity: 10 },
    ]);

    // Stale delayed partial fill arrives later with timestamp T=05
    stateManager.processExecutionReport(
      'ord-ooo',
      'acc-stream-1',
      'PARTIALLY_FILLED',
      4,
      150,
      '2026-10-19T10:00:05.000Z'
    );

    // Verify state was NOT regressed
    const state = stateManager.getAccountState('acc-stream-1');
    expect(state.portfolioState.cash).toBe(500);
    expect(state.portfolioState.holdings).toEqual([{ instrumentId: 'AAPL', quantity: 10 }]);
  });

  it('rejects decreasing filledQuantity and protects terminal status', () => {
    stateManager.registerOrder('ord-term', 'acc-stream-1', 'AAPL', 'BUY', 5);

    // Complete fill
    stateManager.processExecutionReport('ord-term', 'acc-stream-1', 'FILLED', 5, 150);
    expect(stateManager.getAccountState('acc-stream-1').portfolioState.cash).toBe(1250);

    // Malformed report with lower quantity
    stateManager.processExecutionReport('ord-term', 'acc-stream-1', 'PARTIALLY_FILLED', 2, 150);
    expect(stateManager.getAccountState('acc-stream-1').portfolioState.cash).toBe(1250);
  });

  it('correctly credits cash and decrements/deletes holdings on SELL order fills', () => {
    // Setup portfolio with existing holding: 10 shares of AAPL
    stateManager.registerPortfolio('acc-sell-1', {
      portfolioState: {
        accountId: 'acc-sell-1',
        tenantId: 'tenant-stream',
        cash: 1000,
        holdings: [{ instrumentId: 'AAPL', quantity: 10 }],
      },
      priceSnapshot: { prices: { AAPL: 160 } },
      targetAllocation: { targets: [{ instrumentId: 'AAPL', weight: 0.5 }] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      archetype: 'StaticWeights',
    });

    stateManager.registerOrder('ord-sell-1', 'acc-sell-1', 'AAPL', 'SELL', 10);

    // Partial SELL fill: 4 shares @ 160 -> +$640 cash
    stateManager.processExecutionReport('ord-sell-1', 'acc-sell-1', 'PARTIALLY_FILLED', 4, 160);
    let state = stateManager.getAccountState('acc-sell-1');
    expect(state.portfolioState.cash).toBe(1640);
    expect(state.portfolioState.holdings).toEqual([{ instrumentId: 'AAPL', quantity: 6 }]);

    // Complete remaining 6 shares @ 160 -> +$960 cash (total 2600), holding liquidated
    stateManager.processExecutionReport('ord-sell-1', 'acc-sell-1', 'FILLED', 10, 160);
    state = stateManager.getAccountState('acc-sell-1');
    expect(state.portfolioState.cash).toBe(2600);
    expect(state.portfolioState.holdings).toEqual([]);
  });
});
