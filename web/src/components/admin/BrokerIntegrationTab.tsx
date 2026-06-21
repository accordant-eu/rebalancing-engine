import React, { useState, useEffect } from 'react';
import './Admin.css';

interface MetricsSnapshot {
  totalApiCalls: Record<string, number>;
  rateLimitErrors: Record<string, number>;
  byBrokerType?: Record<string, { calls: number; errors: number }>;
  webhooksProcessed: number;
  averageLatencyMs: number;
}

export const BrokerIntegrationTab: React.FC<{ token: string }> = ({ token }) => {
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);

  const fetchMetrics = async () => {
    const res = await fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setMetrics(await res.json());
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics) return <div style={{ padding: '24px' }}>Loading metrics...</div>;

  const totalCalls = Object.values(metrics.totalApiCalls).reduce((a, b) => a + b, 0);
  const totalErrors = Object.values(metrics.rateLimitErrors).reduce((a, b) => a + b, 0);

  return (
    <div className="admin-container">
      <div className="admin-grid-4">
        <div className="admin-metric-card">
          <div className="admin-metric-title">Total API Calls</div>
          <div className="admin-metric-value">{totalCalls}</div>
        </div>
        <div className="admin-metric-card red">
          <div className="admin-metric-title">Rate Limit / Errors</div>
          <div className="admin-metric-value">{totalErrors}</div>
        </div>
        <div className="admin-metric-card green">
          <div className="admin-metric-title">Webhooks Processed</div>
          <div className="admin-metric-value">{metrics.webhooksProcessed}</div>
        </div>
        <div className="admin-metric-card purple">
          <div className="admin-metric-title">Avg Latency</div>
          <div className="admin-metric-value">
            {metrics.averageLatencyMs} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>ms</span>
          </div>
        </div>
      </div>

      {metrics.byBrokerType && (
        <section className="admin-section" style={{ marginTop: '24px' }}>
          <h2 className="admin-section-title">Aggregate Metrics by Broker Integration</h2>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Broker Type</th>
                  <th>Total API Calls</th>
                  <th>Total Errors</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(metrics.byBrokerType).map(bType => (
                  <tr key={bType}>
                    <td>{bType}</td>
                    <td>{metrics.byBrokerType![bType].calls}</td>
                    <td style={{ color: metrics.byBrokerType![bType].errors > 0 ? 'var(--status-red)' : 'inherit' }}>
                      {metrics.byBrokerType![bType].errors}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="admin-section">
        <h2 className="admin-section-title">Per-Tenant Metrics</h2>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tenant ID</th>
                <th>API Calls</th>
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(metrics.totalApiCalls).map(tenantId => (
                <tr key={tenantId}>
                  <td>{tenantId}</td>
                  <td>{metrics.totalApiCalls[tenantId]}</td>
                  <td style={{ color: metrics.rateLimitErrors[tenantId] ? 'var(--status-red)' : 'inherit' }}>
                    {metrics.rateLimitErrors[tenantId] || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
