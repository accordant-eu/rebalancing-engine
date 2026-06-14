import { useEffect, useState } from 'react';
import './App.css';

interface Target {
  instrumentId: string;
  weight: number;
}

interface Position {
  instrumentId: string;
  quantity: number;
}

interface LiveState {
  portfolioState: { cash: number; holdings: Position[] };
  priceSnapshot: { prices: Record<string, number> };
  targetAllocation: { targets: Target[] };
  policy: { type: string; thresholds?: { absolute?: number; relative?: number } };
}

interface StatePayload {
  globalPrices: { prices: Record<string, number> };
  portfolios: Record<string, LiveState>;
}

// Helper to calculate drift for a single portfolio
function getPortfolioMetrics(portfolio: LiveState, globalPrices: Record<string, number>) {
  let totalEquity = portfolio.portfolioState.cash;
  const currentValues: Record<string, number> = {};
  
  const holdings = portfolio.portfolioState.holdings || [];
  holdings.forEach(p => {
    const price = globalPrices[p.instrumentId] || 0;
    const value = p.quantity * price;
    currentValues[p.instrumentId] = value;
    totalEquity += value;
  });

  const targets = portfolio.targetAllocation?.targets || [];
  let maxDrift = 0;
  let isBreached = false;
  
  const absoluteThreshold = portfolio.policy.thresholds?.absolute || 0.05;

  const positions = targets.map(t => {
    const targetWeight = t.weight;
    const currentValue = currentValues[t.instrumentId] || 0;
    const currentWeight = totalEquity > 0 ? currentValue / totalEquity : 0;
    const drift = currentWeight - targetWeight;
    
    if (Math.abs(drift) > Math.abs(maxDrift)) maxDrift = drift;
    if (Math.abs(drift) > absoluteThreshold) isBreached = true;
    
    return {
      symbol: t.instrumentId,
      targetWeight,
      currentWeight,
      drift,
      value: currentValue,
      isPositive: drift > 0,
      isBreached: Math.abs(drift) > absoluteThreshold
    };
  });

  return {
    totalEquity,
    maxDrift,
    isBreached,
    positions
  };
}

function App() {
  const [state, setState] = useState<StatePayload | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          setState(data);
        }
      } catch (e) {
        console.error('Failed to fetch state', e);
      }
    };

    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/logs');
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (e) {
        console.error('Failed to fetch logs', e);
      }
    };

    fetchState();
    fetchLogs();
    const interval = setInterval(() => {
      fetchState();
      fetchLogs();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const renderHeatmap = () => {
    if (!state) return <div className="metricLabel">Waiting for state...</div>;
    const accountIds = Object.keys(state.portfolios);
    if (accountIds.length === 0) return <div className="metricLabel">No portfolios loaded.</div>;

    return (
      <div className="heatmapGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
        {accountIds.map(accountId => {
          const portfolio = state.portfolios[accountId];
          const metrics = getPortfolioMetrics(portfolio, state.globalPrices.prices);
          
          return (
            <div 
              key={accountId} 
              className="panel" 
              style={{ cursor: 'pointer', borderColor: metrics.isBreached ? 'var(--status-red)' : 'var(--border-subtle)', transition: 'border-color 0.2s' }}
              onClick={() => setSelectedAccountId(accountId)}
            >
              <div className="panelHeader">{accountId}</div>
              <div className="panelBody">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="metricLabel">Total Equity</span>
                  <span className="metricValue">${metrics.totalEquity.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="metricLabel">Max Drift</span>
                  <span className="metricValue" style={{ color: Math.abs(metrics.maxDrift) > (portfolio.policy.thresholds?.absolute || 0.05) ? 'var(--status-red)' : 'var(--status-green)' }}>
                    {(metrics.maxDrift * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDetailedView = () => {
    if (!state || !selectedAccountId || !state.portfolios[selectedAccountId]) return null;
    const portfolio = state.portfolios[selectedAccountId];
    const metrics = getPortfolioMetrics(portfolio, state.globalPrices.prices);

    return (
      <div>
        <div style={{ marginBottom: '16px' }}>
          <button 
            style={{ background: 'var(--border-subtle)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => setSelectedAccountId(null)}
          >
            &larr; Back to Fleet View
          </button>
        </div>
        <div className="panel">
          <div className="panelHeader">Portfolio: {selectedAccountId}</div>
          <div className="panelBody holdingsGrid">
            {metrics.positions.map(h => {
              const maxDriftDisplay = (portfolio.policy.thresholds?.absolute || 0.05) * 2;
              const normalizedDrift = Math.min(Math.max(h.drift / maxDriftDisplay, -1), 1);
              const barStyle = {
                left: normalizedDrift < 0 ? `${50 + normalizedDrift * 50}%` : '50%',
                width: `${Math.abs(normalizedDrift) * 50}%`,
              };

              return (
                <div className="holdingRow" key={h.symbol} style={{ borderColor: h.isBreached ? 'var(--status-red)' : '' }}>
                  <div className="holdingSymbol">{h.symbol}</div>
                  <div className="holdingMetrics">
                    <div className="metricGroup">
                      <span className="metricLabel">Target vs Current</span>
                      <span className="metricValue">{(h.targetWeight * 100).toFixed(1)}% → {(h.currentWeight * 100).toFixed(1)}%</span>
                    </div>
                    
                    <div className="driftBarContainer">
                      <div className="driftBarCenter"></div>
                      <div 
                        className={`driftBarFill ${h.isPositive ? 'driftPositive' : 'driftNegative'}`}
                        style={barStyle}
                      ></div>
                    </div>
                    
                    <div className="metricGroup">
                      <span className="metricLabel">Absolute Drift</span>
                      <span className="metricValue" style={{ color: h.isPositive ? 'var(--status-green)' : 'var(--status-red)' }}>
                        {h.isPositive ? '+' : ''}{(h.drift * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const accountLogs = selectedAccountId 
    ? logs.filter(l => l.eventId?.startsWith(`${selectedAccountId}:`) || l.accountId === selectedAccountId)
    : logs;

  return (
    <div className="appContainer">
      <header className="header">
        <div className="headerTitle">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          Command Center (Live Agent v3)
        </div>
        <div className="statusIndicator">
          <div className="statusDot"></div>
          {state ? 'Connected to Fleet' : 'Reconnecting...'}
        </div>
      </header>

      <main className="mainContent">
        {!selectedAccountId ? renderHeatmap() : renderDetailedView()}

        <div className="panel" style={{ marginTop: '24px' }}>
          <div className="panelHeader">JSONL Audit Tail (Live) {selectedAccountId && `- Filtered: ${selectedAccountId}`}</div>
          <div className="panelBody logContainer">
            {accountLogs.length === 0 && <div>Waiting for logs...</div>}
            {accountLogs.slice().reverse().map((log, i) => (
              <div className="logEntry" key={i}>
                <span className="logTime">{new Date(log.timestamp || log.createdAt).toLocaleTimeString()}</span>
                <span className="logEvent">[{log.type || 'EVALUATION'}]</span>
                <div className="logData">
                  <strong style={{ color: 'var(--accent-blue)' }}>{log.eventId ? log.eventId.split(':')[0] : 'SYSTEM'}: </strong>
                  {log.outputs?.tradeProposal ? `Proposed ${log.outputs.tradeProposal.trades.length} trades` : 'Event Data'}
                  {log.outputs?.tradeProposal?.warnings?.length > 0 && (
                    <div style={{ color: 'var(--status-yellow)', marginTop: '4px', fontSize: '0.7rem' }}>
                      {log.outputs.tradeProposal.warnings.map((w: any, idx: number) => (
                        <div key={idx}>⚠️ {w.message}</div>
                      ))}
                    </div>
                  )}
                  <details className="logDetails">
                    <summary>View Full JSON</summary>
                    <pre>{JSON.stringify(log, null, 2)}</pre>
                  </details>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
