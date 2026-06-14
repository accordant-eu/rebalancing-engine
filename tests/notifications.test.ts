import { StdoutNotificationAdapter } from '../src/notifications/adapter';

describe('StdoutNotificationAdapter', () => {
  let adapter: StdoutNotificationAdapter;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    adapter = new StdoutNotificationAdapter();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.useFakeTimers().setSystemTime(new Date('2026-06-14T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('logs info messages to stdout', async () => {
    await adapter.notify('info', 'System started');
    
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('[2026-06-14T00:00:00.000Z] [INFO] System started');
  });

  it('logs warning messages to stdout', async () => {
    await adapter.notify('warning', 'High memory');
    
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('[2026-06-14T00:00:00.000Z] [WARNING] High memory');
  });

  it('logs error messages to stderr', async () => {
    await adapter.notify('error', 'Connection failed');
    
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('[2026-06-14T00:00:00.000Z] [ERROR] Connection failed');
  });

  it('appends context if provided', async () => {
    await adapter.notify('info', 'User login', { userId: 123 });
    
    expect(logSpy).toHaveBeenCalledWith('[2026-06-14T00:00:00.000Z] [INFO] User login | Context: {"userId":123}');
  });
});
