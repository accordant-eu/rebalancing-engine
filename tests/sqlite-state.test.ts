import { SqliteStateManager } from '../src/orchestrator/sqlite-state';
import { initDb, getDb } from '../src/db/sqlite';
import { TenantBrokerConfig } from '../src/models/domain';

describe('SqliteStateManager', () => {
  let stateManager: SqliteStateManager;

  beforeEach(() => {
    // Reset database to in-memory clean state before each test
    const db = initDb(':memory:');
    db.exec(`
      DELETE FROM TaxLots;
      DELETE FROM Holdings;
      DELETE FROM Portfolios;
      DELETE FROM Models;
      DELETE FROM Tenants;
      DELETE FROM EvaluationQueue;
    `);

    stateManager = new SqliteStateManager();
  });

  it('creates a tenant and correctly saves broker configuration', () => {
    const config: TenantBrokerConfig = {
      brokerType: 'ALPACA',
      brokerApiKey: 'test-key',
      brokerApiSecret: 'test-secret',
      brokerBaseUrl: 'https://test.alpaca',
    };

    stateManager.createTenant('tenant-1', 'Test Tenant', config);

    const savedConfig = stateManager.getTenantBrokerConfig('tenant-1');
    expect(savedConfig).not.toBeNull();
    expect(savedConfig?.brokerType).toBe('ALPACA');
    expect(savedConfig?.brokerApiKey).toBe('test-key');
    expect(savedConfig?.brokerApiSecret).toBe('test-secret');
    expect(savedConfig?.brokerBaseUrl).toBe('https://test.alpaca');
  });

  it('returns null for unconfigured tenants', () => {
    const savedConfig = stateManager.getTenantBrokerConfig('non-existent');
    expect(savedConfig).toBeNull();
  });

  it('cascades deletion if tenant is deleted (schema enforcement)', () => {
    stateManager.createTenant('tenant-1', 'Test Tenant');
    
    stateManager.createModel({
      modelId: 'model-1',
      tenantId: 'tenant-1',
      name: 'Test Model',
      archetype: 'StaticWeights',
      evaluationFrequency: 'realtime',
      targetAllocation: { targets: [] },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 },
      constraints: []
    });

    const db = getDb();
    const modelCountBefore = db.prepare('SELECT COUNT(*) as count FROM Models WHERE tenantId = ?').get('tenant-1') as { count: number };
    expect(modelCountBefore.count).toBe(1);

    // Act
    db.prepare('DELETE FROM Tenants WHERE tenantId = ?').run('tenant-1');

    // Assert
    const modelCountAfter = db.prepare('SELECT COUNT(*) as count FROM Models WHERE tenantId = ?').get('tenant-1') as { count: number };
    expect(modelCountAfter.count).toBe(0);
  });
});
