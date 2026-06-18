export interface BrokerMetricsSnapshot {
  totalApiCalls: Record<string, number>;
  rateLimitErrors: Record<string, number>;
  webhooksProcessed: number;
  averageLatencyMs: number;
}

export class MetricsService {
  private totalApiCalls: Record<string, number> = {};
  private rateLimitErrors: Record<string, number> = {};
  private webhooksProcessed: number = 0;
  
  // Exponential moving average for latency
  private averageLatencyMs: number = 0;
  private latencyCount: number = 0;

  public recordApiCall(tenantId: string, latencyMs: number): void {
    if (!this.totalApiCalls[tenantId]) {
      this.totalApiCalls[tenantId] = 0;
    }
    this.totalApiCalls[tenantId]++;

    // Update moving average latency
    this.latencyCount++;
    if (this.latencyCount === 1) {
      this.averageLatencyMs = latencyMs;
    } else {
      // Weight new value at 10% for a smooth moving average
      this.averageLatencyMs = (this.averageLatencyMs * 0.9) + (latencyMs * 0.1);
    }
  }

  public recordRateLimitError(tenantId: string): void {
    if (!this.rateLimitErrors[tenantId]) {
      this.rateLimitErrors[tenantId] = 0;
    }
    this.rateLimitErrors[tenantId]++;
  }

  public recordWebhook(): void {
    this.webhooksProcessed++;
  }

  public getSnapshot(): BrokerMetricsSnapshot {
    return {
      totalApiCalls: { ...this.totalApiCalls },
      rateLimitErrors: { ...this.rateLimitErrors },
      webhooksProcessed: this.webhooksProcessed,
      averageLatencyMs: Math.round(this.averageLatencyMs),
    };
  }
}

// Global singleton for the in-memory MVP phase
export const globalMetrics = new MetricsService();
