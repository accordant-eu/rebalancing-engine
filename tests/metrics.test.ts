import { MetricsService } from '../src/services/metrics';

describe('MetricsService', () => {
  let metrics: MetricsService;

  beforeEach(() => {
    metrics = new MetricsService();
  });

  it('records API calls and calculates moving average latency', () => {
    metrics.recordApiCall('tenant-1', 100);
    expect(metrics.getSnapshot().totalApiCalls['tenant-1']).toBe(1);
    expect(metrics.getSnapshot().averageLatencyMs).toBe(100);

    metrics.recordApiCall('tenant-1', 200);
    expect(metrics.getSnapshot().totalApiCalls['tenant-1']).toBe(2);
    // (100 * 0.9) + (200 * 0.1) = 90 + 20 = 110
    expect(metrics.getSnapshot().averageLatencyMs).toBe(110);
    
    metrics.recordApiCall('tenant-2', 50);
    expect(metrics.getSnapshot().totalApiCalls['tenant-2']).toBe(1);
    // (110 * 0.9) + (50 * 0.1) = 99 + 5 = 104
    expect(metrics.getSnapshot().averageLatencyMs).toBe(104);
  });

  it('records rate limit errors by tenant', () => {
    metrics.recordRateLimitError('tenant-1');
    metrics.recordRateLimitError('tenant-1');
    metrics.recordRateLimitError('tenant-2');

    const snapshot = metrics.getSnapshot();
    expect(snapshot.rateLimitErrors['tenant-1']).toBe(2);
    expect(snapshot.rateLimitErrors['tenant-2']).toBe(1);
    expect(snapshot.rateLimitErrors['tenant-3']).toBeUndefined();
  });

  it('records webhooks', () => {
    expect(metrics.getSnapshot().webhooksProcessed).toBe(0);
    
    metrics.recordWebhook();
    metrics.recordWebhook();

    expect(metrics.getSnapshot().webhooksProcessed).toBe(2);
  });

  it('returns a defensive copy of the snapshot data', () => {
    metrics.recordApiCall('tenant-1', 100);
    metrics.recordRateLimitError('tenant-1');

    const snapshot1 = metrics.getSnapshot();
    
    // Mutate the returned snapshot
    snapshot1.totalApiCalls['tenant-1'] = 999;
    snapshot1.rateLimitErrors['tenant-1'] = 999;

    // Verify it didn't affect the internal state
    const snapshot2 = metrics.getSnapshot();
    expect(snapshot2.totalApiCalls['tenant-1']).toBe(1);
    expect(snapshot2.rateLimitErrors['tenant-1']).toBe(1);
  });
});
