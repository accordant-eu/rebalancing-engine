import * as fs from 'fs';
import * as path from 'path';
import { FileAuditStorage } from '../src/audit/storage';
import { AuditRecord } from '../src/audit/audit';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    appendFile: jest.fn(),
    stat: jest.fn().mockRejectedValue({ code: 'ENOENT' }),
    rename: jest.fn(),
  },
}));

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

  it('appends stringified audit record to file', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
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

    expect(fs.promises.appendFile).toHaveBeenCalledTimes(1);
    const [calledPath, calledContent, calledEncoding] = (fs.promises.appendFile as jest.Mock).mock.calls[0];
    
    expect(calledPath).toBe(path.resolve(mockFilePath));
    expect(calledContent).toContain('"eventId":"evt-1"');
    expect(calledContent.endsWith('\n')).toBe(true);
    expect(calledEncoding).toBe('utf-8');
  });
});
