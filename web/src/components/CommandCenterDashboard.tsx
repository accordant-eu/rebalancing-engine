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
    return <div className="metricLabel" style={{ padding: '24px' }}>No portfolios loaded in this tenant.</div>;
  }

  // 2. Action Queues
  const criticalDrift = aggregates.portfoliosWithMetrics.filter(p => p.isBreached).sort((a, b) => b.maxDrift - a.maxDrift);
  const nearMisses = aggregates.portfoliosWithMetrics.filter(p => p.isNearMiss).sort((a, b) => b.maxDrift - a.maxDrift);
  const halted = aggregates.portfoliosWithMetrics.filter(p => p.isHalted);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', overflowY: 'auto' }}>
      
      {/* Top Layer: HUD */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <div className="panel" style={{ flex: 1, padding: '16px', background: 'var(--bg-dark)' }}>
          <div className="metricLabel">Total Fleet AUM</div>
          <div className="metricValue" style={{ fontSize: '1.5rem', marginTop: '8px' }}>
            ${aggregates.totalAum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="panel" style={{ flex: 1, padding: '16px', background: 'var(--bg-dark)' }}>
          <div className="metricLabel">Fleet Health</div>
          <div className="metricValue" style={{ fontSize: '1.5rem', marginTop: '8px', color: aggregates.breachedCount > 0 ? 'var(--status-yellow)' : 'var(--status-green)' }}>
            {accountIds.length - aggregates.breachedCount} In-Band / {aggregates.breachedCount} Breached
          </div>
        </div>
        <div className="panel" style={{ flex: 1, padding: '16px', background: 'var(--bg-dark)', borderColor: aggregates.haltedCount > 0 ? 'var(--status-red)' : '' }}>
          <div className="metricLabel">Circuit Breaker Halts</div>
          <div className="metricValue" style={{ fontSize: '1.5rem', marginTop: '8px', color: aggregates.haltedCount > 0 ? 'var(--status-red)' : 'var(--status-green)' }}>
            {aggregates.haltedCount} Halted
          </div>
        </div>
      </div>

      {/* Middle Layer: Action Queues */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="panel">
          <div className="panelHeader" style={{ color: 'var(--status-red)' }}>Action Required: Breached Drift</div>
          <div className="panelBody">
            {criticalDrift.length === 0 ? <div className="metricLabel">No critical drifts.</div> : (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '8px 0' }}>Account</th>
                    <th>Max Drift</th>
                    <th>Tolerance</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalDrift.map(p => (
                    <tr key={p.accountId} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }} onClick={() => setSelectedAccountId(p.accountId)}>
                      <td style={{ padding: '8px 0', color: 'var(--accent-blue)' }}>{p.accountId}</td>
                      <td style={{ color: 'var(--status-red)' }}>{(p.maxDrift * 100).toFixed(2)}%</td>
                      <td>{(p.tolerance * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader" style={{ color: 'var(--status-yellow)' }}>Watchlist: Near-Misses</div>
          <div className="panelBody">
            {nearMisses.length === 0 ? <div className="metricLabel">No near-misses.</div> : (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '8px 0' }}>Account</th>
                    <th>Max Drift</th>
                    <th>Tolerance</th>
                  </tr>
                </thead>
                <tbody>
                  {nearMisses.map(p => (
                    <tr key={p.accountId} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }} onClick={() => setSelectedAccountId(p.accountId)}>
                      <td style={{ padding: '8px 0', color: 'var(--accent-blue)' }}>{p.accountId}</td>
                      <td style={{ color: 'var(--status-yellow)' }}>{(p.maxDrift * 100).toFixed(2)}%</td>
                      <td>{(p.tolerance * 100).toFixed(1)}%</td>
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
        <div className="panel" style={{ borderColor: 'var(--status-red)' }}>
          <div className="panelHeader" style={{ background: 'var(--status-red)', color: 'white' }}>CRITICAL: Halted Portfolios</div>
          <div className="panelBody">
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '8px 0' }}>Account</th>
                  <th>Equity</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {halted.map(p => (
                  <tr key={p.accountId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 0', color: 'var(--status-red)', fontWeight: 'bold' }}>{p.accountId}</td>
                    <td>${p.equity.toFixed(2)}</td>
                    <td>
                      <button 
                        style={{ padding: '4px 8px', background: 'var(--border-subtle)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
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
