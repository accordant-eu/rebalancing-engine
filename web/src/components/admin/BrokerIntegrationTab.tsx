import React, { useState, useEffect } from 'react';

interface MetricsSnapshot {
  totalApiCalls: Record<string, number>;
  rateLimitErrors: Record<string, number>;
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

  if (!metrics) return <div>Loading metrics...</div>;

  const totalCalls = Object.values(metrics.totalApiCalls).reduce((a, b) => a + b, 0);
  const totalErrors = Object.values(metrics.rateLimitErrors).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#1C1F26] p-6 rounded text-center border-t-4 border-blue-500">
          <div className="text-gray-400 text-sm font-bold uppercase mb-2">Total API Calls</div>
          <div className="text-4xl font-light">{totalCalls}</div>
        </div>
        <div className="bg-[#1C1F26] p-6 rounded text-center border-t-4 border-red-500">
          <div className="text-gray-400 text-sm font-bold uppercase mb-2">Rate Limit / Errors</div>
          <div className="text-4xl font-light">{totalErrors}</div>
        </div>
        <div className="bg-[#1C1F26] p-6 rounded text-center border-t-4 border-green-500">
          <div className="text-gray-400 text-sm font-bold uppercase mb-2">Webhooks Processed</div>
          <div className="text-4xl font-light">{metrics.webhooksProcessed}</div>
        </div>
        <div className="bg-[#1C1F26] p-6 rounded text-center border-t-4 border-purple-500">
          <div className="text-gray-400 text-sm font-bold uppercase mb-2">Avg Latency</div>
          <div className="text-4xl font-light">{metrics.averageLatencyMs} <span className="text-xl text-gray-500">ms</span></div>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-bold mb-4">Per-Tenant Metrics</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left bg-[#1C1F26] rounded">
            <thead>
              <tr className="border-b border-[#2A2F3A]">
                <th className="p-3">Tenant ID</th>
                <th className="p-3">API Calls</th>
                <th className="p-3">Errors</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(metrics.totalApiCalls).map(tenantId => (
                <tr key={tenantId} className="border-b border-[#2A2F3A]">
                  <td className="p-3">{tenantId}</td>
                  <td className="p-3">{metrics.totalApiCalls[tenantId]}</td>
                  <td className="p-3 text-red-400">{metrics.rateLimitErrors[tenantId] || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
