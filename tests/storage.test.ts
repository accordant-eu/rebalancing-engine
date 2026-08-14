import * as fs from 'fs';
import * as path from 'path';
import { FileAuditStorage, SqliteAuditStorage } from '../src/audit/storage';
import { AuditRecord } from '../src/audit/audit';
import { initDb, getDb } from '../src/db/sqlite';

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    promises: {
      ...actualFs.promises,
      appendFile: jest.fn(),
      stat: jest.fn(),
      rename: jest.fn(),
    },
  };
});

describe('FileAuditStorage', () => {
  const mockFilePath = '/mock/path/audit.jsonl';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates directory if it does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    new FileAuditStorage(mockFilePath);

    expect(fs.existsSync).toHaveBeenCalledWith('/mock/path');
    expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/path', { recursive: true });
  });

  it('does not create directory if it exists', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    new FileAuditStorage(mockFilePath);

    expect(fs.existsSync).toHaveBeenCalledWith('/mock/path');
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  it('appends stringified audit record to file without rotation when size is under 5MB', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.promises.stat as jest.Mock).mockResolvedValue({ size: 1024 * 1024 }); // 1MB

    const storage = new FileAuditStorage(mockFilePath);

    const mockRecord = {
      eventId: 'evt-1',
      createdAt: '2026-06-14T00:00:00Z',
      accountId: 'acc-1',
      inputs: {
        portfolioState: { accountId: 'acc-1', cash: 100, holdings: [] },
        targetAllocation: { targets: [] },
        priceSnapshot: { prices: {} },
        policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05 },
      },
      outputs: {
        strategyType: 'threshold',
        executionTargetMode: 'full_reset',
        driftMeasurements: [],
        trigger: { isTriggered: true, strategyType: 'threshold', reason: 'Test' },
        tradeProposal: { trades: [], estimatedPostTradeCash: 100, warnings: [], executionTargetMode: 'full_reset' },
        postTradeSimulation: { residualDrift: [] },
        explanation: { summary: 'test', triggerExplanation: 'test', tradeExplanations: [] },
      },
    } as unknown as AuditRecord;

    await storage.saveAuditRecord(mockRecord);

    expect(fs.promises.rename).not.toHaveBeenCalled();
    expect(fs.promises.appendFile).toHaveBeenCalledTimes(1);
    const [calledPath, calledContent, calledEncoding] = (fs.promises.appendFile as jest.Mock).mock.calls[0];
    
    expect(calledPath).toBe(path.resolve(mockFilePath));
    expect(calledContent).toContain('"eventId":"evt-1"');
    expect(calledContent.endsWith('\n')).toBe(true);
    expect(calledEncoding).toBe('utf-8');
  });

  it('triggers log rotation when file size exceeds 5MB threshold', async () => {
    const resolvedPath = path.resolve(mockFilePath);
    // Stat says file is already 5.1MB (> 5MB limit)
    (fs.promises.stat as jest.Mock).mockResolvedValue({ size: 5.1 * 1024 * 1024 });
    // Simulate existence of previous rotated files: .1 and .2 exist
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
      if (p === '/mock/path') return true;
      if (p === `${resolvedPath}.1`) return true;
      if (p === `${resolvedPath}.2`) return true;
      return false;
    });

    const storage = new FileAuditStorage(mockFilePath);
    const mockRecord = {
      eventId: 'evt-large',
      inputs: {},
      outputs: {},
    } as unknown as AuditRecord;

    await storage.saveAuditRecord(mockRecord);

    // Rotation should cascade: .2 -> .3, .1 -> .2, original -> .1
    expect(fs.promises.rename).toHaveBeenCalledWith(`${resolvedPath}.2`, `${resolvedPath}.3`);
    expect(fs.promises.rename).toHaveBeenCalledWith(`${resolvedPath}.1`, `${resolvedPath}.2`);
    expect(fs.promises.rename).toHaveBeenCalledWith(resolvedPath, `${resolvedPath}.1`);
    expect(fs.promises.appendFile).toHaveBeenCalledWith(resolvedPath, expect.stringContaining('evt-large'), 'utf-8');
  });

  it('handles stat ENOENT gracefully on first run when file does not exist yet', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.promises.stat as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

    const storage = new FileAuditStorage(mockFilePath);
    const mockRecord = { eventId: 'evt-first', inputs: {}, outputs: {} } as unknown as AuditRecord;

    await expect(storage.saveAuditRecord(mockRecord)).resolves.not.toThrow();
    expect(fs.promises.appendFile).toHaveBeenCalled();
  });
});

describe('SqliteAuditStorage', () => {
  beforeEach(() => {
    initDb(':memory:');
    const db = getDb();
    db.exec(`
      DELETE FROM AuditTrails;
      DELETE FROM Tenants;
      DELETE FROM Portfolios;
    `);
  });

  it('persists audit records into SQLite AuditTrails table', async () => {
    const storage = new SqliteAuditStorage();
    const record = {
      eventId: 'acc-100:tick-1',
      accountId: 'acc-100',
      tenantId: 'tenant-1',
      type: 'REBALANCE_EVALUATION',
      createdAt: '2026-08-14T20:00:00Z',
      inputs: {
        portfolioState: { accountId: 'acc-100', tenantId: 'tenant-1', cash: 500, holdings: [] },
        targetAllocation: { targets: [] },
        priceSnapshot: { prices: {} },
        policy: { absoluteDriftTolerance: 0.05 },
      },
      outputs: {
        trigger: { isTriggered: true, reason: 'Drift breach' },
        tradeProposal: { trades: [], estimatedPostTradeCash: 500, warnings: [], executionTargetMode: 'full_reset' },
      },
    };

    await storage.saveAuditRecord(record);

    const db = getDb();
    const saved = db.prepare('SELECT * FROM AuditTrails WHERE eventId = ?').get('acc-100:tick-1') as any;

    expect(saved).toBeDefined();
    expect(saved.accountId).toBe('acc-100');
    expect(saved.tenantId).toBe('tenant-1');
    expect(saved.type).toBe('REBALANCE_EVALUATION');
    
    const parsedInputs = JSON.parse(saved.inputs);
    expect(parsedInputs.portfolioState.accountId).toBe('acc-100');
    const parsedOutputs = JSON.parse(saved.outputs);
    expect(parsedOutputs.trigger.isTriggered).toBe(true);
  });

  it('derives accountId from eventId prefix and tenantId from inputs when omitted at top level', async () => {
    const storage = new SqliteAuditStorage();
    const record = {
      eventId: 'acc-derived-123:timestamp-456',
      inputs: {
        portfolioState: { accountId: 'acc-derived-123', tenantId: 'tenant-nested', cash: 100, holdings: [] },
      },
      outputs: {},
    };

    await storage.saveAuditRecord(record);

    const db = getDb();
    const saved = db.prepare('SELECT * FROM AuditTrails WHERE eventId = ?').get('acc-derived-123:timestamp-456') as any;

    expect(saved).toBeDefined();
    expect(saved.accountId).toBe('acc-derived-123');
    expect(saved.tenantId).toBe('tenant-nested');
    expect(saved.type).toBe('UNKNOWN');
  });
});
