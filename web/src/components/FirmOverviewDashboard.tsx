import React, { useState, useEffect } from 'react';
import { DollarSign, Activity, AlertOctagon, Zap, Calendar, Clock } from 'lucide-react';

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
    return (
      <div className="p-8 flex items-center justify-center text-slate-500 h-full">
        <div className="animate-pulse flex items-center gap-2 font-medium">
          <div className="h-4 w-4 bg-slate-300 rounded-full"></div>
          Loading firm overview...
        </div>
      </div>
    );
  }

  const total = summary?.meta?.total || 0;
  const totalAum = summary?.totalAum || 0;
  const halted = summary?.openCircuitBreakers || 0;
  const inBand = summary?.driftSummary?.inBand || 0;
  const breached = summary?.driftSummary?.thresholdBreach || 0;
  const notEval = summary?.driftSummary?.notEvaluated || 0;
  const exec24h = summary?.recentExecutions?.last24h || 0;
  const totalCalendar = summary?.calendarSummary?.totalCalendarPortfolios || 0;
  const upcomingRebalances = summary?.calendarSummary?.upcomingRebalances || [];

  return (
    <div className="p-8 h-full flex flex-col gap-6 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Firm Overview</h1>
      </div>
      
      {/* 4 Macro Aggregate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200/60 shadow-soft rounded-2xl p-6 flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-soft-hover hover:-translate-y-1">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] transform translate-x-4 -translate-y-4 text-emerald-500"><DollarSign size={120} /></div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-4 uppercase tracking-widest relative z-10">
            <DollarSign size={16} className="text-emerald-500" />
            Total AUM
          </div>
          <div className="text-4xl text-slate-900 font-bold tracking-tight font-mono relative z-10">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalAum)}
          </div>
          <div className="text-sm text-slate-500 mt-2 font-medium relative z-10">Across {total} Portfolios</div>
        </div>

        <div className="bg-white border border-slate-200/60 shadow-soft rounded-2xl p-6 flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-soft-hover hover:-translate-y-1">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] transform translate-x-4 -translate-y-4 text-sky-500"><Activity size={120} /></div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-4 uppercase tracking-widest relative z-10">
            <Activity size={16} className="text-sky-500" />
            Drift Health
          </div>
          <div className="flex items-end gap-6 font-mono relative z-10">
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-emerald-600">{inBand}</span>
              <span className="text-xs text-slate-500 font-medium font-sans mt-0.5">In-Band</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-rose-600">{breached}</span>
              <span className="text-xs text-slate-500 font-medium font-sans mt-0.5">Breached</span>
            </div>
          </div>
          <div className="text-sm text-slate-400 mt-2 font-medium relative z-10">{notEval} pending evaluation</div>
        </div>
        
        <div className="bg-white border border-slate-200/60 shadow-soft rounded-2xl p-6 flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-soft-hover hover:-translate-y-1">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] transform translate-x-4 -translate-y-4 text-rose-500"><AlertOctagon size={120} /></div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-4 uppercase tracking-widest relative z-10">
            <AlertOctagon size={16} className={halted > 0 ? 'text-rose-500' : 'text-emerald-500'} />
            Halted Portfolios
          </div>
          <div className={`text-4xl font-bold font-mono tracking-tight relative z-10 ${halted > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {halted}
          </div>
          <div className="text-sm text-slate-500 mt-2 font-medium relative z-10">Circuit breakers triggered</div>
        </div>

        <div className="bg-white border border-slate-200/60 shadow-soft rounded-2xl p-6 flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-soft-hover hover:-translate-y-1">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] transform translate-x-4 -translate-y-4 text-amber-500"><Zap size={120} /></div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-4 uppercase tracking-widest relative z-10">
            <Zap size={16} className="text-amber-500" />
            Recent Executions
          </div>
          <div className="text-4xl text-slate-900 font-bold font-mono tracking-tight relative z-10">{exec24h}</div>
          <div className="text-sm text-slate-500 mt-2 font-medium relative z-10">Over the last 24h</div>
        </div>
      </div>

      {/* Calendar Mandate Horizon Section */}
      <section className="bg-white border border-slate-200/60 shadow-soft rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
            <Calendar size={16} className="text-indigo-500" />
            Scheduled Rebalance Horizon
          </div>
          <span className="text-xs text-slate-500 font-medium">
            <strong>{totalCalendar}</strong> recurring mandate accounts
          </span>
        </div>

        {upcomingRebalances.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-sm">
            No calendar rebalancing mandates currently configured for this firm.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="pb-3 px-3">Account ID</th>
                  <th className="pb-3 px-3">Frequency</th>
                  <th className="pb-3 px-3">Next Rebalance Date</th>
                  <th className="pb-3 px-3 text-right">Cadence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {upcomingRebalances.map((acc: any) => (
                  <tr key={acc.accountId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-slate-900">{acc.accountId}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex capitalize px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {acc.frequency}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-800 font-semibold">{acc.nextRebalanceDate}</td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium bg-indigo-50 px-2.5 py-0.5 rounded-full">
                        <Clock size={12} />
                        Automated
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
