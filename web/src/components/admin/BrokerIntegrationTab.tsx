import React, { useState, useEffect } from 'react';
import { Activity, Clock, Zap, AlertCircle, Link } from 'lucide-react';

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

  if (!metrics) return (
    <div className="flex items-center justify-center p-24 text-slate-400">
      <div className="animate-spin mr-3"><Activity size={24} /></div>
      <span className="font-medium text-lg tracking-wide">Loading integration telemetry...</span>
    </div>
  );

  const totalCalls = Object.values(metrics.totalApiCalls).reduce((a, b) => a + b, 0);
  const totalErrors = Object.values(metrics.rateLimitErrors).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-12">
      {/* Top Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border-t-4 border-t-sky-500 border border-slate-200/60 rounded-xl p-6 shadow-soft transition-all duration-300 hover:shadow-soft-hover hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.05] text-sky-500"><Activity size={80} /></div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Activity size={14} className="text-sky-500"/> Total API Calls</div>
          <div className="text-4xl font-light text-slate-900 tracking-tight tabular-nums relative z-10">{totalCalls.toLocaleString()}</div>
        </div>
        
        <div className="bg-white border-t-4 border-t-rose-500 border border-slate-200/60 rounded-xl p-6 shadow-soft transition-all duration-300 hover:shadow-soft-hover hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.05] text-rose-500"><AlertCircle size={80} /></div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><AlertCircle size={14} className="text-rose-500"/> Rate Limit / Errors</div>
          <div className="text-4xl font-light text-slate-900 tracking-tight tabular-nums relative z-10">{totalErrors.toLocaleString()}</div>
        </div>
        
        <div className="bg-white border-t-4 border-t-emerald-500 border border-slate-200/60 rounded-xl p-6 shadow-soft transition-all duration-300 hover:shadow-soft-hover hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.05] text-emerald-500"><Zap size={80} /></div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Zap size={14} className="text-emerald-500"/> Webhooks Processed</div>
          <div className="text-4xl font-light text-slate-900 tracking-tight tabular-nums relative z-10">{metrics.webhooksProcessed.toLocaleString()}</div>
        </div>
        
        <div className="bg-white border-t-4 border-t-purple-500 border border-slate-200/60 rounded-xl p-6 shadow-soft transition-all duration-300 hover:shadow-soft-hover hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.05] text-purple-500"><Clock size={80} /></div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Clock size={14} className="text-purple-500"/> Avg Latency</div>
          <div className="text-4xl font-light text-slate-900 tracking-tight tabular-nums relative z-10">
            {metrics.averageLatencyMs} <span className="text-lg text-slate-400 font-medium">ms</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Broker Aggregate */}
        {metrics.byBrokerType && (
          <section className="bg-white border border-slate-200/60 rounded-2xl shadow-soft overflow-hidden transition-all duration-300 hover:shadow-soft-hover flex flex-col h-[500px]">
            <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50/50 backdrop-blur-md flex items-center gap-3">
              <Link size={18} className="text-slate-400" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Aggregate Metrics by Broker</h2>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-slate-500 border-b border-slate-200/60 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px]">Broker Type</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px] text-right">API Calls</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px] text-right">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.keys(metrics.byBrokerType).map(bType => (
                    <tr key={bType} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-slate-900 font-bold tracking-wide">
                        <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-xs">{bType}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-700">{metrics.byBrokerType![bType].calls.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-mono">
                        {metrics.byBrokerType![bType].errors > 0 ? (
                          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 font-bold text-xs">{metrics.byBrokerType![bType].errors.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Right Column: Per-Tenant Metrics */}
        <section className="bg-white border border-slate-200/60 rounded-2xl shadow-soft overflow-hidden transition-all duration-300 hover:shadow-soft-hover flex flex-col h-[500px]">
          <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50/50 backdrop-blur-md flex items-center gap-3">
            <Activity size={18} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Per-Tenant Telemetry</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-slate-500 border-b border-slate-200/60 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px]">Tenant ID</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px] text-right">API Calls</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px] text-right">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.keys(metrics.totalApiCalls).map(tenantId => (
                  <tr key={tenantId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-slate-900 font-medium">{tenantId}</td>
                    <td className="px-6 py-4 text-right font-mono text-slate-700">{metrics.totalApiCalls[tenantId].toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-mono">
                      {metrics.rateLimitErrors[tenantId] ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 font-bold text-xs">{metrics.rateLimitErrors[tenantId].toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
