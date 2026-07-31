import { SqliteStateManager } from '../src/orchestrator/sqlite-state';
import { Orchestrator, DryRunExecutor } from '../src/orchestrator';
import { MockCalendar } from '../src/services/market-calendar';
import { startTickerSimulator } from '../src/simulator/ticker';
import { StdoutNotificationAdapter } from '../src/notifications';

describe('Ticker Simulator', () => {
  let stateManager: SqliteStateManager;
  let orchestrator: Orchestrator;

  beforeEach(() => {
    stateManager = new SqliteStateManager();
    const notifications = new StdoutNotificationAdapter();
    const auditStorage = { saveAuditRecord: async () => {} };
    orchestrator = new Orchestrator(stateManager, new DryRunExecutor(), { cooldownMs: 1000 }, auditStorage, notifications, new MockCalendar());
  });

  it('should start ticker without crashing', () => {
    // Just a smoke test to increase coverage
    const intervalId = startTickerSimulator(stateManager, orchestrator, 100);
    expect(intervalId).toBeDefined();
    clearInterval(intervalId as any);
  });
});
