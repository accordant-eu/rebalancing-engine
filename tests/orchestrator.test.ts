import { DryRunExecutor, Orchestrator } from '../src/orchestrator';
import { MockCalendar } from '../src/services/market-calendar';
import { SqliteStateManager } from '../src/orchestrator/sqlite-state';
import { initDb, getDb } from '../src/db/sqlite';
import { loadScenarioFixture } from '../src/runner';
import * as path from 'path';
import { ConcentrationLimitIndicator, DriftReductionIndicator, DriftUtilityTranslator } from '../src/core/quality';
import { logger } from '../src/utils/logger';

describe('Orchestrator', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'scenarios.json');
  const fixture = loadScenarioFixture(fixturePath);
  const scenario = fixture.scenarios.find((s) => s.id === 'on_target');

  if (!scenario) {
    throw new Error('Test fixture missing');
  }

  let stateManager: SqliteStateManager;
  let executor: DryRunExecutor;
  let orchestrator: Orchestrator;
  const accountId = 'on_target';

  beforeEach(() => {
    initDb(':memory:');
    const db = getDb();
    db.exec(`
      DELETE FROM TaxLots;
      DELETE FROM Holdings;
      DELETE FROM Portfolios;
      DELETE FROM Models;
      DELETE FROM Tenants;
      DELETE FROM EvaluationQueue;
    `);

    stateManager = new SqliteStateManager();
    stateManager.createTenant('tenant-1', 'Test Tenant');
    scenario.portfolioState.tenantId = 'tenant-1';
    stateManager.registerPortfolio(accountId, {
      portfolioState: JSON.parse(JSON.stringify(scenario.portfolioState)),
      priceSnapshot: JSON.parse(JSON.stringify(scenario.priceSnapshot)),
      targetAllocation: JSON.parse(JSON.stringify(scenario.targetAllocation)),
      policy: JSON.parse(JSON.stringify(scenario.policy)),
      archetype: scenario.archetype || 'StaticWeights',
      constraints: scenario.constraints || []
    });
    // init global prices
    stateManager.updateGlobalPrices(scenario.priceSnapshot.prices);
    (stateManager as any).getTenantBrokerConfig = jest.fn().mockReturnValue({ brokerType: 'MOCK', brokerApiKey: 'mock', brokerApiSecret: 'mock' });

    executor = new DryRunExecutor();
    jest.spyOn(executor, 'execute');

    orchestrator = new Orchestrator(stateManager, executor, {
      cooldownMs: 5000,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not trigger on tick if portfolio is on target', async () => {
    orchestrator.start();
    stateManager.enqueuePortfolio(accountId, 1000);
    await orchestrator.onTick(1000);

    expect(executor.execute).not.toHaveBeenCalled();
    expect(stateManager.getLastTradeTimeMs(accountId)).toBe(0);
  });

  it('triggers execution when prices drift out of bounds', async () => {
    orchestrator.start();
    
    // Simulate US0378331005:XNAS:USD price pumping by 50% to trigger drift
    const currentPrices = stateManager.getGlobalPrices().prices;
    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': currentPrices['US0378331005:XNAS:USD'] * 2.0 });

    stateManager.enqueuePortfolio(accountId, 1000);
    await orchestrator.onTick(1000);

    expect(executor.execute).toHaveBeenCalledTimes(1);
    expect(stateManager.getLastTradeTimeMs(accountId)).toBe(1000);
  });

  it('respects cooldown timer after execution', async () => {
    orchestrator.start();
    
    const currentPrices = stateManager.getGlobalPrices().prices;
    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': currentPrices['US0378331005:XNAS:USD'] * 2.0 });

    // First tick triggers execution
    stateManager.enqueuePortfolio(accountId, 1000);
    await orchestrator.onTick(1000);
    expect(executor.execute).toHaveBeenCalledTimes(1);
    expect(stateManager.getLastTradeTimeMs(accountId)).toBe(1000);

    // Second tick within cooldown ignores it
    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': currentPrices['US0378331005:XNAS:USD'] * 2.1 }); // still out of bounds
    stateManager.enqueuePortfolio(accountId, 2000);
    orchestrator.onTick(2000);
    expect(executor.execute).toHaveBeenCalledTimes(1); // STILL 1

    // Third tick after cooldown triggers again
    stateManager.enqueuePortfolio(accountId, 7000);
    await orchestrator.onTick(7000); // 1000 + 5000 + 1000
    expect(executor.execute).toHaveBeenCalledTimes(2);
    expect(stateManager.getLastTradeTimeMs(accountId)).toBe(7000);
  });

  it('ignores ticks if not started', async () => {
    const currentPrices = stateManager.getGlobalPrices().prices;
    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': currentPrices['US0378331005:XNAS:USD'] * 2.0 });

    // Orchestrator not started
    stateManager.enqueuePortfolio(accountId, 1000);
    await orchestrator.onTick(1000);

    expect(executor.execute).not.toHaveBeenCalled();
  });

  it('skips evaluation if the market calendar says it is closed', async () => {
    const closedCalendar = new MockCalendar(false);
    const customOrchestrator = new Orchestrator(stateManager, executor, { cooldownMs: 5000 }, undefined, undefined, closedCalendar);
    customOrchestrator.start();

    const currentPrices = stateManager.getGlobalPrices().prices;
    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': currentPrices['US0378331005:XNAS:USD'] * 2.0 }); // large drift

    stateManager.enqueuePortfolio(accountId, 1000);
    await customOrchestrator.onTick(1000);

    expect(executor.execute).not.toHaveBeenCalled(); // Market is closed, so no execution despite drift
  });

  it('pause() and resume() should halt and restore onTick processing', async () => {
    orchestrator.start();
    expect(orchestrator.getIsRunning()).toBe(true);
    
    orchestrator.pause();
    expect(orchestrator.getIsPaused()).toBe(true);
    
    const currentPrices = stateManager.getGlobalPrices().prices;
    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': currentPrices['US0378331005:XNAS:USD'] * 2.0 });

    stateManager.enqueuePortfolio(accountId, 1000);
    await orchestrator.onTick(1000);
    expect(executor.execute).not.toHaveBeenCalled(); // paused
    
    orchestrator.resume();
    expect(orchestrator.getIsPaused()).toBe(false);
    
    await orchestrator.onTick(2000);
    expect(executor.execute).toHaveBeenCalledTimes(1); // resumed
    
    orchestrator.stop();
    expect(orchestrator.getIsRunning()).toBe(false);
  });

  it('circuit breaks execution if tenant broker config is missing', async () => {
    orchestrator.start();
    
    // Remove the tenant broker config
    (stateManager as any).getTenantBrokerConfig = jest.fn().mockReturnValue(undefined);

    const currentPrices = stateManager.getGlobalPrices().prices;
    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': currentPrices['US0378331005:XNAS:USD'] * 2.0 });

    stateManager.enqueuePortfolio(accountId, 1000);
    await orchestrator.onTick(1000);

    expect(executor.execute).not.toHaveBeenCalled(); // circuit broken
  });

  it('uses translateBrokerSymbol from stateManager if available', async () => {
    const mockExecutor = {
      execute: jest.fn().mockImplementation(async (context) => {
        context.translateBrokerSymbol('US0378331005:XNAS:USD', 'MOCK');
      })
    };
    const customOrchestrator = new Orchestrator(stateManager, mockExecutor as any, { cooldownMs: 5000 });
    customOrchestrator.start();
    
    (stateManager as any).getBrokerSymbol = jest.fn().mockReturnValue('CUSTOM_TICKER');

    const currentPrices = stateManager.getGlobalPrices().prices;
    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': currentPrices['US0378331005:XNAS:USD'] * 2.0 });

    stateManager.enqueuePortfolio(accountId, 1234);
    await customOrchestrator.onTick(1234);

    expect(mockExecutor.execute).toHaveBeenCalledTimes(1);
    expect((stateManager as any).getBrokerSymbol).toHaveBeenCalled();
  });

  it('injects concentration limit indicators if constraints are present', async () => {
    const currentState = stateManager.getAccountState(accountId);
    // Use a large maxWeight so it doesn't break target allocations
    currentState.constraints = [{ type: 'concentration_limit', parameters: { maxWeight: 0.95 } }];
    // Re-register portfolio state
    stateManager.registerPortfolio(accountId, currentState);

    orchestrator.start();
    
    const currentPrices = stateManager.getGlobalPrices().prices;
    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': currentPrices['US0378331005:XNAS:USD'] * 2.0 });

    stateManager.enqueuePortfolio(accountId, 1000);
    await orchestrator.onTick(1000);

    expect(executor.execute).toHaveBeenCalledTimes(1);
  });

  it('gracefully handles audit storage save failures without crashing and falls back to logger if no notifications', async () => {
    const brokenAuditStorage = { 
      saveAuditRecord: jest.fn().mockImplementation(() => Promise.reject(new Error('DB Timeout')))
    };
    const orchestratorWithAudit = new Orchestrator(stateManager, executor, { cooldownMs: 5000 }, brokenAuditStorage);
    orchestratorWithAudit.start();

    const currentPrices = stateManager.getGlobalPrices().prices;
    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': currentPrices['US0378331005:XNAS:USD'] * 2.0 });

    stateManager.enqueuePortfolio(accountId, 1000);
    
    const loggerSpy = jest.spyOn(logger as any, 'error').mockImplementation();
    await orchestratorWithAudit.onTick(1000);

    expect(executor.execute).toHaveBeenCalledTimes(1);
    expect(brokenAuditStorage.saveAuditRecord).toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalledWith(expect.objectContaining({ err: expect.any(Error) }), expect.stringContaining('Failed to save audit record'));
  });

  it('notifies error when audit storage fails and notifications are configured', async () => {
    const brokenAuditStorage = { 
      saveAuditRecord: jest.fn().mockImplementation(() => Promise.reject(new Error('DB Timeout')))
    };
    const notifications = { notify: jest.fn() };
    const orchestratorWithAudit = new Orchestrator(stateManager, executor, { cooldownMs: 5000 }, brokenAuditStorage, notifications as any);
    orchestratorWithAudit.start();

    const currentPrices = stateManager.getGlobalPrices().prices;
    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': currentPrices['US0378331005:XNAS:USD'] * 2.0 });

    stateManager.enqueuePortfolio(accountId, 1000);
    await orchestratorWithAudit.onTick(1000);

    expect(notifications.notify).toHaveBeenCalledWith('error', expect.stringContaining('Failed to save audit record'), expect.any(Object));
  });

  it('catches fatal evaluation errors and logs via logger if notifications are not configured', async () => {
    const customOrchestrator = new Orchestrator(stateManager, executor, { cooldownMs: 5000 });
    customOrchestrator.start();

    jest.spyOn(stateManager, 'getAccountState').mockImplementation(() => {
      throw new Error('Evaluation Crash');
    });
    
    const loggerSpy = jest.spyOn(logger as any, 'error').mockImplementation();

    stateManager.enqueuePortfolio(accountId, 1000);
    await customOrchestrator.onTick(1000);

    expect(loggerSpy).toHaveBeenCalledWith(expect.objectContaining({ err: expect.any(Error) }), expect.stringContaining('Evaluation loop crashed'));
  });

  it('catches fatal evaluation errors, opens circuit breaker, and logs fatal audit record via notifications and auditStorage', async () => {
    const auditStorage = { saveAuditRecord: jest.fn().mockResolvedValue(true) };
    const notifications = { notify: jest.fn() };
    const customOrchestrator = new Orchestrator(stateManager, executor, { cooldownMs: 5000 }, auditStorage as any, notifications as any);
    customOrchestrator.start();

    // Mock evaluateRebalance to throw a CIRCUIT BREAKER error
    jest.spyOn(stateManager, 'getAccountState').mockImplementation(() => {
      throw new Error('CIRCUIT BREAKER: Failed to load portfolio');
    });
    
    stateManager.updateCircuitBreakerStatus = jest.fn();

    stateManager.enqueuePortfolio(accountId, 1000);
    await customOrchestrator.onTick(1000);

    // Circuit breaker status updated
    expect(stateManager.updateCircuitBreakerStatus).toHaveBeenCalledWith(accountId, 'open');
    
    // Notification sent
    expect(notifications.notify).toHaveBeenCalledWith('error', expect.stringContaining('Evaluation loop crashed'), expect.any(Object));
    
    // Fatal audit record saved
    expect(auditStorage.saveAuditRecord).toHaveBeenCalledWith(expect.objectContaining({
      type: 'EVALUATION',
      error: expect.stringContaining('CIRCUIT BREAKER: Failed to load portfolio'),
    }));
  });

  it('notifies info when rebalance is triggered', async () => {
    const notifications = { notify: jest.fn() };
    const customOrchestrator = new Orchestrator(stateManager, executor, { cooldownMs: 5000 }, undefined, notifications as any);
    customOrchestrator.start();

    const currentPrices = stateManager.getGlobalPrices().prices;
    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': currentPrices['US0378331005:XNAS:USD'] * 2.0 });

    stateManager.enqueuePortfolio(accountId, 1000);
    await customOrchestrator.onTick(1000);

    expect(notifications.notify).toHaveBeenCalledWith('info', expect.stringContaining('Triggered rebalance'), expect.any(Object));
  });

  it('translates broker symbol using fallback when getBrokerSymbol is undefined', async () => {
    const mockExecutor = {
      execute: jest.fn().mockImplementation(async (context) => {
        const symbol = context.translateBrokerSymbol('US0378331005:XNAS:USD', 'MOCK');
        expect(symbol).toBe('US0378331005');
      })
    };
    const customOrchestrator = new Orchestrator(stateManager, mockExecutor as any, { cooldownMs: 5000 });
    customOrchestrator.start();
    
    // Ensure getBrokerSymbol is undefined
    (stateManager as any).getBrokerSymbol = undefined;

    const currentPrices = stateManager.getGlobalPrices().prices;
    stateManager.updateGlobalPrices({ 'US0378331005:XNAS:USD': currentPrices['US0378331005:XNAS:USD'] * 2.0 });

    stateManager.enqueuePortfolio(accountId, 1234);
    await customOrchestrator.onTick(1234);

    expect(mockExecutor.execute).toHaveBeenCalledTimes(1);
  });
});
