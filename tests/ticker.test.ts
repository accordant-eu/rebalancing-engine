import { SqliteStateManager } from '../src/orchestrator/sqlite-state';
import { Orchestrator, DryRunExecutor } from '../src/orchestrator';
import { MockCalendar } from '../src/services/market-calendar';
import { startTickerSimulator } from '../src/simulator/ticker';
import { StdoutNotificationAdapter } from '../src/notifications';
import { initDb, getDb } from '../src/db/sqlite';

describe('Ticker Simulator', () => {
  let stateManager: SqliteStateManager;
  let orchestrator: Orchestrator;

  beforeEach(() => {
    initDb(':memory:');
    const db = getDb();
    db.exec(`
      PRAGMA foreign_keys = OFF;
      DELETE FROM TaxLots;
      DELETE FROM Holdings;
      DELETE FROM Portfolios;
      DELETE FROM Models;
      DELETE FROM Tenants;
      DELETE FROM EvaluationQueue;
    `);

    jest.useFakeTimers();
    stateManager = new SqliteStateManager();
    const notifications = new StdoutNotificationAdapter();
    const auditStorage = { saveAuditRecord: async () => {} };
    orchestrator = new Orchestrator(stateManager, new DryRunExecutor(), { cooldownMs: 1000 }, auditStorage, notifications, new MockCalendar());
    
    // Setup initial prices
    stateManager.updateGlobalPrices({ 'AAPL': 150, 'TSLA': 600 });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should artificially drift prices, enqueue affected portfolios, and call onTick', async () => {
    jest.spyOn(stateManager, 'updateGlobalPrices');
    jest.spyOn(stateManager, 'getPortfoliosAffectedByInstrument').mockReturnValue(['port-1']);
    jest.spyOn(stateManager, 'enqueuePortfolio');
    jest.spyOn(orchestrator, 'onTick').mockResolvedValue(undefined);

    const intervalId = startTickerSimulator(stateManager, orchestrator, 100);

    // Advance time by 100ms to trigger the first tick
    jest.advanceTimersByTime(100);

    // Wait for async tick to complete
    await Promise.resolve(); 

    expect(stateManager.updateGlobalPrices).toHaveBeenCalled();
    expect(stateManager.getPortfoliosAffectedByInstrument).toHaveBeenCalledWith('AAPL');
    expect(stateManager.getPortfoliosAffectedByInstrument).toHaveBeenCalledWith('TSLA');
    
    expect(stateManager.enqueuePortfolio).toHaveBeenCalledWith('port-1', expect.any(Number));
    expect(orchestrator.onTick).toHaveBeenCalled();

    clearInterval(intervalId as any);
  });

  it('should gracefully catch and log errors during tick without stopping the interval', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Force an error
    jest.spyOn(stateManager, 'getGlobalPrices').mockImplementation(() => {
      throw new Error('Database disconnected');
    });

    const intervalId = startTickerSimulator(stateManager, orchestrator, 100);

    jest.advanceTimersByTime(100);
    await Promise.resolve();

    expect(console.error).toHaveBeenCalledWith(
      '[Ticker Simulator] Tick failed:',
      expect.any(Error)
    );

    // Verify it reschedules itself
    expect(jest.getTimerCount()).toBe(1);

    clearInterval(intervalId as any);
  });
});
