import React, { useMemo } from 'react';
import type { StatePayload, SystemStreamEvent, TenantMetrics } from '../types';
import { AlertCircle, Eye, AlertTriangle, AlertOctagon, Activity, Radio } from 'lucide-react';

interface DashboardProps {
  state: StatePayload;
  setSelectedAccountId: (id: string) => void;
  logs: any[];
  metrics?: TenantMetrics | null;
  streamStatus?: 'connected' | 'connecting' | 'disconnected';
  streamEvents?: SystemStreamEvent[];
}

export const CommandCenterDashboard: React.FC<DashboardProps> = ({
  state,
  setSelectedAccountId,
  streamStatus = 'disconnected',
  streamEvents = [],
}) => {
  const accountIds = Object.keys(state.portfolios);

  // 1. Calculate Macro Aggregates
  const aggregates = useMemo(() => {
    let totalAum = 0;
    let breachedCount = 0;
    let haltedCount = 0;
    const portfoliosWithMetrics = accountIds.map(accountId => {
      const portfolio = state.portfolios[accountId];
      let equity = portfolio.portfolioState.cash;
      let maxDrift = 0;
      let isBreached = false;

      (portfolio.portfolioState.holdings || []).forEach(p => {
        equity += p.quantity * (state.globalPrices.prices[p.instrumentId] || 0);
      });

      const targets = portfolio.targetAllocation?.targets || [];
      targets.forEach(t => {
        const value = (portfolio.portfolioState.holdings?.find(h => h.instrumentId === t.instrumentId)?.quantity || 0) * (state.globalPrices.prices[t.instrumentId] || 0);
        const weight = equity > 0 ? value / equity : 0;
        const drift = Math.abs(weight - t.weight);
        if (drift > maxDrift) maxDrift = drift;
      });

      const tolerance = portfolio.policy.absoluteDriftTolerance || 0.05;
      if (maxDrift > tolerance) isBreached = true;
      const isNearMiss = !isBreached && maxDrift > (tolerance - 0.005); // Within 0.5% of breach
      const isHalted = portfolio.portfolioState.circuitBreakerStatus === 'open';

      totalAum += equity;
      if (isBreached) breachedCount++;
      if (isHalted) haltedCount++;

      return { accountId, portfolio, equity, maxDrift, tolerance, isBreached, isNearMiss, isHalted };
    });

    return { totalAum, breachedCount, haltedCount, portfoliosWithMetrics };
  }, [state, accountIds]);

  // Calculate drift distribution
  const driftDistribution = useMemo(() => {
    const buckets = [
      { label: '0-1%', max: 0.01, count: 0, color: 'bg-emerald-500' },
      { label: '1-2%', max: 0.02, count: 0, color: 'bg-emerald-400' },
      { label: '2-3%', max: 0.03, count: 0, color: 'bg-amber-400' },
      { label: '3-5%', max: 0.05, count: 0, color: 'bg-orange-500' },
      { label: '>5%', max: Infinity, count: 0, color: 'bg-rose-500' },
    ];

    aggregates.portfoliosWithMetrics.forEach(p => {
      const bucket = buckets.find(b => p.maxDrift <= b.max);
      if (bucket) bucket.count++;
    });

    const maxCount = Math.max(...buckets.map(b => b.count));
    
    return { buckets, maxCount };
  }, [aggregates.portfoliosWithMetrics]);

  if (accountIds.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-slate-400 h-full">
        <div className="bg-slate-100 p-4 rounded-full mb-4 shadow-sm">
          <Eye size={32} className="text-slate-300" />
        </div>
        <p className="text-lg font-medium">No portfolios loaded</p>
        <p className="text-sm">There is no active data for this tenant.</p>
      </div>
    );
  }

  // 2. Action Queues
  const criticalDrift = aggregates.portfoliosWithMetrics.filter(p => p.isBreached).sort((a, b) => b.maxDrift - a.maxDrift);
  const nearMisses = aggregates.portfoliosWithMetrics.filter(p => p.isNearMiss).sort((a, b) => b.maxDrift - a.maxDrift);
  const halted = aggregates.portfoliosWithMetrics.filter(p => p.isHalted);

  return (
    <div className="flex flex-col gap-6 p-8 h-full max-w-7xl mx-auto font-sans">
      
      {/* Top Layer: HUD Header with Stream Indicator */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/60 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
            <Radio size={20} className={streamStatus === 'connected' ? 'animate-pulse text-emerald-500' : 'text-slate-400'} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fleet Command Center</h1>
            <p className="text-xs text-slate-500">Real-Time Engine Telemetry & Portfolio Monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {streamStatus === 'connected' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Live Streaming (SSE)
            </span>
          ) : streamStatus === 'connecting' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Connecting Stream...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              2s Polling Backup
            </span>
          )}
        </div>
      </div>

      {/* HUD Aggregate Cards */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 p-6 rounded-2xl border border-slate-200/60 bg-white shadow-soft flex flex-col justify-center transition-all duration-300 hover:shadow-soft-hover hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] transform translate-x-4 -translate-y-4 text-emerald-500"><Eye size={120} /></div>
          <div className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1 relative z-10">Total Fleet AUM</div>
          <div className="text-3xl font-bold tracking-tight text-slate-900 font-mono relative z-10 truncate" title={`$${aggregates.totalAum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
            ${aggregates.totalAum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="flex-1 p-6 rounded-2xl border border-slate-200/60 bg-white shadow-soft flex flex-col justify-center transition-all duration-300 hover:shadow-soft-hover hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] transform translate-x-4 -translate-y-4 text-sky-500"><Activity size={120} /></div>
          <div className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1 relative z-10">Fleet Health</div>
          <div className={`text-3xl font-bold tracking-tight font-mono relative z-10 ${aggregates.breachedCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            <span className={aggregates.breachedCount > 0 ? 'text-slate-900' : ''}>{accountIds.length - aggregates.breachedCount}</span> 
            <span className="text-sm font-sans font-medium text-slate-500 ml-1">In-Band</span> 
            <span className="text-slate-300 mx-3">/</span> 
            {aggregates.breachedCount} 
            <span className="text-sm font-sans font-medium text-slate-500 ml-1">Breached</span>
          </div>
        </div>
        <div className={`flex-1 p-6 rounded-2xl border shadow-soft flex flex-col justify-center transition-all duration-300 hover:shadow-soft-hover hover:-translate-y-1 relative overflow-hidden ${aggregates.haltedCount > 0 ? 'border-rose-200/60 bg-rose-50' : 'border-slate-200/60 bg-white'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] transform translate-x-4 -translate-y-4 text-rose-500"><AlertOctagon size={120} /></div>
          <div className={`text-xs font-bold tracking-wider uppercase mb-1 relative z-10 ${aggregates.haltedCount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>Circuit Breaker Halts</div>
          <div className={`text-3xl font-bold tracking-tight font-mono relative z-10 ${aggregates.haltedCount > 0 ? 'text-rose-700' : 'text-emerald-600'}`}>
            {aggregates.haltedCount} <span className="text-sm font-sans font-medium opacity-80">Halted</span>
          </div>
        </div>
      </div>

      {/* Middle Layer: Action Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-soft overflow-hidden flex flex-col transition-all duration-300 hover:shadow-soft-hover">
          <div className="px-6 py-4 border-b border-rose-100 bg-rose-50/80 backdrop-blur-md text-rose-700 font-bold tracking-tight flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              Action Required: Breached Drift
            </div>
            <span className="bg-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">{criticalDrift.length}</span>
          </div>
          <div className="p-4 overflow-auto max-h-96 flex flex-col gap-3 bg-slate-50/30">
            {criticalDrift.length === 0 ? <div className="p-8 text-center text-slate-500 font-medium">No critical drifts. All good! 🎉</div> : (
              criticalDrift.map(p => (
                <div 
                  key={p.accountId}
                  onClick={() => setSelectedAccountId(p.accountId)}
                  className="flex items-center justify-between p-4 bg-white border border-rose-100 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-rose-300 group"
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Account</span>
                    <span className="text-slate-800 font-bold font-mono text-sm">{p.accountId}</span>
                  </div>
                  <div className="flex gap-6 items-center text-right">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Tolerance</span>
                      <span className="text-slate-500 font-mono text-xs">{(p.tolerance * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-rose-400 mb-0.5">Max Drift</span>
                      <span className="text-rose-600 font-bold font-mono bg-rose-50 px-2 py-0.5 rounded-md">{(p.maxDrift * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-soft overflow-hidden flex flex-col transition-all duration-300 hover:shadow-soft-hover">
          <div className="px-6 py-4 border-b border-amber-100 bg-amber-50/80 backdrop-blur-md text-amber-700 font-bold tracking-tight flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} />
              Watchlist: Near-Misses
            </div>
            <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">{nearMisses.length}</span>
          </div>
          <div className="p-4 overflow-auto max-h-96 flex flex-col gap-3 bg-slate-50/30">
            {nearMisses.length === 0 ? <div className="p-8 text-center text-slate-500 font-medium">No near-misses.</div> : (
              nearMisses.map(p => (
                <div 
                  key={p.accountId}
                  onClick={() => setSelectedAccountId(p.accountId)}
                  className="flex items-center justify-between p-4 bg-white border border-amber-100 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-amber-300 group"
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Account</span>
                    <span className="text-slate-800 font-bold font-mono text-sm">{p.accountId}</span>
                  </div>
                  <div className="flex gap-6 items-center text-right">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Tolerance</span>
                      <span className="text-slate-500 font-mono text-xs">{(p.tolerance * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-amber-500 mb-0.5">Max Drift</span>
                      <span className="text-amber-600 font-bold font-mono bg-amber-50 px-2 py-0.5 rounded-md">{(p.maxDrift * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Circuit Breakers (if any) */}
      {halted.length > 0 && (
        <div className="rounded-2xl border border-rose-200/60 bg-white shadow-soft overflow-hidden transition-all duration-300 hover:shadow-soft-hover">
          <div className="px-6 py-4 border-b border-rose-200/60 bg-rose-600 text-white font-bold tracking-wide uppercase flex items-center gap-3">
            <AlertOctagon size={20} />
            CRITICAL: Halted Portfolios
          </div>
          <div className="p-4 flex flex-col gap-3 bg-rose-50/30">
            {halted.map(p => (
              <div 
                key={p.accountId}
                className="flex items-center justify-between p-4 bg-white border border-rose-200 rounded-xl transition-all duration-200 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-rose-100 text-rose-600 rounded-lg"><AlertOctagon size={18} /></div>
                  <div className="flex flex-col">
                    <span className="text-rose-700 font-bold font-mono text-sm">{p.accountId}</span>
                    <span className="text-slate-500 font-medium text-xs">Equity: ${p.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <button 
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 text-xs font-semibold uppercase tracking-wider"
                  onClick={() => setSelectedAccountId(p.accountId)}
                >
                  Inspect & Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Layer: Drift Distribution & Real-Time Stream Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drift Distribution Chart */}
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-soft overflow-hidden flex flex-col p-6 transition-all duration-300 hover:shadow-soft-hover">
          <div className="text-sm font-bold tracking-wider uppercase text-slate-500 mb-4 flex items-center gap-2">
            <Activity size={16} />
            Fleet Drift Distribution
          </div>
          <div className="flex-1 flex items-end justify-between gap-2 h-40 mt-4">
            {driftDistribution.buckets.map(b => {
              const heightPct = driftDistribution.maxCount > 0 ? (b.count / driftDistribution.maxCount) * 100 : 0;
              return (
                <div key={b.label} className="flex flex-col items-center flex-1 group">
                  <div className="text-xs font-bold text-slate-400 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">{b.count}</div>
                  <div className={`w-full max-w-[40px] rounded-t-md transition-all duration-500 ${b.color} relative overflow-hidden group-hover:opacity-80`} style={{ height: `${Math.max(heightPct, 2)}%` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 mt-2">{b.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-Time Telemetry & Live Stream Feed */}
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-soft overflow-hidden flex flex-col p-6 transition-all duration-300 hover:shadow-soft-hover">
          <div className="text-sm font-bold tracking-wider uppercase text-slate-500 mb-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Radio size={16} className={streamStatus === 'connected' ? 'text-emerald-500 animate-pulse' : 'text-slate-400'} />
              Real-Time Telemetry & Event Stream
            </div>
            <span className="text-xs font-mono font-normal text-slate-400">{streamEvents.length} events</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-48 flex flex-col gap-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
            {streamEvents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs italic py-6">
                <Radio size={24} className="mb-2 opacity-30 animate-pulse" />
                Listening for real-time engine events...
              </div>
            ) : (
              streamEvents.map((evt, idx) => (
                <div
                  key={`${evt.eventId}-${idx}`}
                  onClick={() => evt.accountId && setSelectedAccountId(evt.accountId)}
                  className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200/60 text-xs cursor-pointer hover:border-sky-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        evt.type === 'LIVE_EXECUTION'
                          ? 'bg-emerald-100 text-emerald-800'
                          : evt.type === 'CIRCUIT_BREAKER_HALT'
                          ? 'bg-rose-100 text-rose-800'
                          : evt.type === 'THRESHOLD_BREACH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {evt.type}
                    </span>
                    <span className="font-mono text-slate-700 font-semibold">{evt.accountId}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
