import React, { useMemo } from 'react';
import type { StatePayload } from '../types';

interface DashboardProps {
  state: StatePayload;
  setSelectedAccountId: (id: string) => void;
  logs: any[];
}

export const CommandCenterDashboard: React.FC<DashboardProps> = ({ state, setSelectedAccountId }) => {
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

  if (accountIds.length === 0) {
    return <div className="p-6 text-gray-400">No portfolios loaded in this tenant.</div>;
  }

  // 2. Action Queues
  const criticalDrift = aggregates.portfoliosWithMetrics.filter(p => p.isBreached).sort((a, b) => b.maxDrift - a.maxDrift);
  const nearMisses = aggregates.portfoliosWithMetrics.filter(p => p.isNearMiss).sort((a, b) => b.maxDrift - a.maxDrift);
  const halted = aggregates.portfoliosWithMetrics.filter(p => p.isHalted);

  return (
    <div className="flex flex-col gap-6 p-6 h-full font-sans text-gray-100">
      
      {/* Top Layer: HUD */}
      <div className="flex gap-4">
        <div className="flex-1 p-5 rounded-xl border border-gray-800 bg-[#1a1d24] shadow-sm">
          <div className="text-sm text-gray-400 font-semibold tracking-wide uppercase">Total Fleet AUM</div>
          <div className="text-3xl font-light mt-2 text-white">
            ${aggregates.totalAum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="flex-1 p-5 rounded-xl border border-gray-800 bg-[#1a1d24] shadow-sm">
          <div className="text-sm text-gray-400 font-semibold tracking-wide uppercase">Fleet Health</div>
          <div className={`text-3xl font-light mt-2 ${aggregates.breachedCount > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
            {accountIds.length - aggregates.breachedCount} In-Band <span className="text-gray-500 text-lg mx-2">/</span> {aggregates.breachedCount} Breached
          </div>
        </div>
        <div className={`flex-1 p-5 rounded-xl border ${aggregates.haltedCount > 0 ? 'border-red-500/50 bg-red-500/10' : 'border-gray-800 bg-[#1a1d24]'} shadow-sm`}>
          <div className="text-sm text-gray-400 font-semibold tracking-wide uppercase">Circuit Breaker Halts</div>
          <div className={`text-3xl font-light mt-2 ${aggregates.haltedCount > 0 ? 'text-red-500 font-medium' : 'text-green-500'}`}>
            {aggregates.haltedCount} Halted
          </div>
        </div>
      </div>

      {/* Middle Layer: Action Queues */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-800 bg-[#1a1d24] shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-800 bg-red-500/5 text-red-400 font-semibold flex justify-between items-center">
            Action Required: Breached Drift
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{criticalDrift.length}</span>
          </div>
          <div className="p-0 overflow-auto max-h-96">
            {criticalDrift.length === 0 ? <div className="p-5 text-gray-500 text-sm">No critical drifts. All good! 🎉</div> : (
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0f1115] text-gray-400 sticky top-0">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Account</th>
                    <th className="px-5 py-3 font-semibold">Max Drift</th>
                    <th className="px-5 py-3 font-semibold">Tolerance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {criticalDrift.map(p => (
                    <tr key={p.accountId} className="hover:bg-[#252830] cursor-pointer transition-colors" onClick={() => setSelectedAccountId(p.accountId)}>
                      <td className="px-5 py-3 text-blue-400 font-medium">{p.accountId}</td>
                      <td className="px-5 py-3 text-red-400 font-semibold">{(p.maxDrift * 100).toFixed(2)}%</td>
                      <td className="px-5 py-3 text-gray-400">{(p.tolerance * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#1a1d24] shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-800 bg-yellow-500/5 text-yellow-500 font-semibold flex justify-between items-center">
            Watchlist: Near-Misses
            <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full">{nearMisses.length}</span>
          </div>
          <div className="p-0 overflow-auto max-h-96">
            {nearMisses.length === 0 ? <div className="p-5 text-gray-500 text-sm">No near-misses.</div> : (
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0f1115] text-gray-400 sticky top-0">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Account</th>
                    <th className="px-5 py-3 font-semibold">Max Drift</th>
                    <th className="px-5 py-3 font-semibold">Tolerance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {nearMisses.map(p => (
                    <tr key={p.accountId} className="hover:bg-[#252830] cursor-pointer transition-colors" onClick={() => setSelectedAccountId(p.accountId)}>
                      <td className="px-5 py-3 text-blue-400 font-medium">{p.accountId}</td>
                      <td className="px-5 py-3 text-yellow-500 font-semibold">{(p.maxDrift * 100).toFixed(2)}%</td>
                      <td className="px-5 py-3 text-gray-400">{(p.tolerance * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Circuit Breakers (if any) */}
      {halted.length > 0 && (
        <div className="rounded-xl border border-red-500/50 bg-[#1a1d24] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-red-500/50 bg-red-600 text-white font-bold tracking-wide uppercase flex justify-between items-center">
            CRITICAL: Halted Portfolios
          </div>
          <div className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0f1115] text-gray-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Account</th>
                  <th className="px-5 py-3 font-semibold">Equity</th>
                  <th className="px-5 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {halted.map(p => (
                  <tr key={p.accountId}>
                    <td className="px-5 py-3 text-red-500 font-bold">{p.accountId}</td>
                    <td className="px-5 py-3 text-gray-300">${p.equity.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right">
                      <button 
                        className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 rounded shadow-sm transition-colors text-xs font-semibold uppercase tracking-wider"
                        onClick={() => setSelectedAccountId(p.accountId)}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
