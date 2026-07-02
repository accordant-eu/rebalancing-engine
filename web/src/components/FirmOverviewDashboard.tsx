import React, { useState, useEffect } from 'react';

export const FirmOverviewDashboard: React.FC<{ token: string | null }> = ({ token }) => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/portfolios/summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSummary(data);
        }
      } catch (e) {
        console.error('Failed to fetch firm overview', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [token]);

  if (loading) {
    return <div className="p-6 text-gray-500">Loading firm overview...</div>;
  }

  const total = summary?.meta?.total || 0;
  const totalAum = summary?.totalAum || 0;
  const halted = summary?.openCircuitBreakers || 0;
  const inBand = summary?.driftSummary?.inBand || 0;
  const breached = summary?.driftSummary?.thresholdBreach || 0;
  const notEval = summary?.driftSummary?.notEvaluated || 0;
  const exec24h = summary?.recentExecutions?.last24h || 0;

  return (
    <div className="p-6 h-full flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-light text-white">Firm Overview</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1a1d24] border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <div className="text-gray-400 text-sm font-semibold mb-2">Total AUM</div>
          <div className="text-3xl text-emerald-400 font-bold">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalAum)}
          </div>
          <div className="text-xs text-gray-500 mt-2">Across {total} Portfolios</div>
        </div>

        <div className="bg-[#1a1d24] border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <div className="text-gray-400 text-sm font-semibold mb-2">Drift Health</div>
          <div className="flex items-end gap-3">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-emerald-500">{inBand}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">In-Band</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-red-400">{breached}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Breached</span>
            </div>
          </div>
          <div className="text-xs text-gray-600 mt-2">{notEval} pending evaluation</div>
        </div>
        
        <div className="bg-[#1a1d24] border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <div className="text-gray-400 text-sm font-semibold mb-2">Halted Portfolios</div>
          <div className={`text-4xl font-bold ${halted > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{halted}</div>
        </div>

        <div className="bg-[#1a1d24] border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <div className="text-gray-400 text-sm font-semibold mb-2">Recent Executions</div>
          <div className="text-3xl text-blue-400 font-bold">{exec24h}</div>
          <div className="text-xs text-gray-500 mt-2">in the last 24h</div>
        </div>
      </div>
    </div>
  );
};
