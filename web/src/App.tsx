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
  portfolioState: { accountId: string; tenantId?: string; modelId?: string; subscriptionType?: string; cash: number; holdings: Position[] };
  priceSnapshot: { prices: Record<string, number> };
  targetAllocation: { targets: Target[] };
  policy: { strategyType?: string; absoluteDriftTolerance?: number; thresholds?: { absolute?: number; relative?: number } };
}

interface ModelMandate {
  modelId: string;
  tenantId: string;
  name: string;
  targetAllocation: { targets: Target[] };
  policy: any;
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
  
  const absoluteThreshold = portfolio.policy.absoluteDriftTolerance || portfolio.policy.thresholds?.absolute || 0.05;

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
  const [tenantToken, setTenantToken] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'fleet' | 'models'>('fleet');
  
  const [state, setState] = useState<StatePayload | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [models, setModels] = useState<ModelMandate[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // new model form
  const [newModelName, setNewModelName] = useState('');
  const [newModelTargets, setNewModelTargets] = useState('AAPL:0.5,MSFT:0.5');

  useEffect(() => {
    if (!tenantToken) return;

    const headers = { 'Authorization': `Bearer ${tenantToken}` };

    const fetchState = async () => {
      try {
        const res = await fetch('/api/state', { headers });
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
        const res = await fetch('/api/logs', { headers });
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (e) {
        console.error('Failed to fetch logs', e);
      }
    };

    const fetchModels = async () => {
      try {
        const res = await fetch('/api/models', { headers });
        if (res.ok) {
          const data = await res.json();
          setModels(data);
        }
      } catch(e) {}
    };

    fetchState();
    fetchLogs();
    fetchModels();
    
    const interval = setInterval(() => {
      fetchState();
      fetchLogs();
    }, 2000);

    return () => clearInterval(interval);
  }, [tenantToken]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const tenantId = formData.get('tenantId') as string;
    if (tenantId) setTenantToken(tenantId);
  };

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    const targets = newModelTargets.split(',').map(t => {
      const [instrumentId, weight] = t.split(':');
      return { instrumentId: instrumentId.trim(), weight: parseFloat(weight) };
    });
    
    const payload = {
      modelId: `model-${Date.now()}`,
      name: newModelName,
      targetAllocation: { targets },
      policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 }
    };

    await fetch('/api/models', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tenantToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    setNewModelName('');
    const res = await fetch('/api/models', { headers: { 'Authorization': `Bearer ${tenantToken}` } });
    if (res.ok) setModels(await res.json());
  };

  const handleUpdateSubscription = async (accountId: string, modelId: string | null, subscriptionType: string) => {
    await fetch(`/api/portfolios/${accountId}/subscription`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tenantToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId, subscriptionType })
    });
    // Immediately clear state or wait for next poll
  };

  if (!tenantToken) {
    return (
      <div className="appContainer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="panel" style={{ width: '400px', padding: '32px' }}>
          <h2>SaaS Command Center</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Select Tenant Environment</label>
              <select name="tenantId" style={{ width: '100%', padding: '12px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                <option value="tenant-baseline">Baseline Tenant</option>
                <option value="tenant-b">Tenant B (Empty Data Isolation)</option>
              </select>
            </div>
            <button type="submit" style={{ padding: '12px', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderHeatmap = () => {
    if (!state) return <div className="metricLabel">Waiting for state...</div>;
    const accountIds = Object.keys(state.portfolios);
    if (accountIds.length === 0) return <div className="metricLabel" style={{ padding: '24px' }}>No portfolios loaded in this tenant.</div>;

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
              <div className="panelHeader" style={{ display: 'flex', justifyContent: 'space-between' }}>
                {accountId}
                {portfolio.portfolioState.subscriptionType === 'discretionary' && (
                  <span style={{ fontSize: '0.7rem', background: 'var(--accent-blue)', padding: '2px 6px', borderRadius: '4px' }}>MODEL</span>
                )}
              </div>
              <div className="panelBody">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="metricLabel">Total Equity</span>
                  <span className="metricValue">${metrics.totalEquity.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="metricLabel">Max Drift</span>
                  <span className="metricValue" style={{ color: Math.abs(metrics.maxDrift) > (portfolio.policy.absoluteDriftTolerance || portfolio.policy.thresholds?.absolute || 0.05) ? 'var(--status-red)' : 'var(--status-green)' }}>
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

    const isDiscretionary = portfolio.portfolioState.subscriptionType === 'discretionary';
    const activeModelId = portfolio.portfolioState.modelId;

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

        {/* Subscription Control Panel */}
        <div className="panel" style={{ marginBottom: '16px' }}>
          <div className="panelHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Mandate</span>
            <span style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', background: isDiscretionary ? 'var(--accent-blue)' : 'var(--status-yellow)', color: isDiscretionary ? 'white' : 'black', fontWeight: 'bold' }}>
              {isDiscretionary ? 'SUBSCRIBED TO MODEL' : 'BESPOKE (CUSTOM)'}
            </span>
          </div>
          <div className="panelBody" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <select 
                value={portfolio.portfolioState.subscriptionType || 'bespoke'}
                onChange={(e) => handleUpdateSubscription(selectedAccountId, e.target.value === 'bespoke' ? null : (activeModelId || models[0]?.modelId), e.target.value)}
                style={{ padding: '8px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px', minWidth: '200px' }}
              >
                <option value="bespoke">Bespoke</option>
                <option value="discretionary">Discretionary (Model Mandate)</option>
              </select>

              {isDiscretionary && (
                <select 
                  value={activeModelId || ''}
                  onChange={(e) => handleUpdateSubscription(selectedAccountId, e.target.value, 'discretionary')}
                  style={{ padding: '8px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px', minWidth: '200px' }}
                >
                  {models.map(m => (
                    <option key={m.modelId} value={m.modelId}>{m.name}</option>
                  ))}
                </select>
              )}
            </div>

            {!isDiscretionary && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px dashed var(--border-subtle)' }}>
                <em>Note: UI for manually editing Bespoke Mandate parameters (target weights, absolute drift tolerance, etc.) is scheduled for a future Tranche. Currently viewing read-only targets.</em>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">Target Allocation Drift</div>
          <div className="panelBody holdingsGrid">
            {metrics.positions.map(h => {
              const maxDriftDisplay = (portfolio.policy.absoluteDriftTolerance || portfolio.policy.thresholds?.absolute || 0.05) * 2;
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

  const renderModelsTab = () => {
    return (
      <div>
        <div className="panel" style={{ marginBottom: '24px' }}>
          <div className="panelHeader">Create New Model Mandate</div>
          <div className="panelBody">
            <form onSubmit={handleCreateModel} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label className="metricLabel" style={{ display: 'block', marginBottom: '8px' }}>Model Name</label>
                <input required value={newModelName} onChange={e => setNewModelName(e.target.value)} placeholder="e.g. Aggressive Growth" style={{ width: '100%', padding: '8px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px' }} />
              </div>
              <div style={{ flex: 2 }}>
                <label className="metricLabel" style={{ display: 'block', marginBottom: '8px' }}>Targets (Symbol:Weight, ...)</label>
                <input required value={newModelTargets} onChange={e => setNewModelTargets(e.target.value)} style={{ width: '100%', padding: '8px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px' }} />
              </div>
              <button type="submit" style={{ padding: '8px 16px', height: '37px', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Publish Model
              </button>
            </form>
          </div>
        </div>

        <div className="heatmapGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {models.map(m => (
            <div key={m.modelId} className="panel">
              <div className="panelHeader">{m.name}</div>
              <div className="panelBody">
                <div style={{ marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {m.modelId}</div>
                <div>
                  <span className="metricLabel" style={{ display: 'block', marginBottom: '4px' }}>Target Allocation</span>
                  {m.targetAllocation.targets.map(t => (
                    <div key={t.instrumentId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span>{t.instrumentId}</span>
                      <span>{(t.weight * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const accountLogs = selectedAccountId 
    ? logs.filter(l => l.eventId?.startsWith(`${selectedAccountId}:`) || l.accountId === selectedAccountId)
    : logs;

  return (
    <div className="appContainer">
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div className="headerTitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Command Center
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => { setCurrentTab('fleet'); setSelectedAccountId(null); }}
              style={{ background: currentTab === 'fleet' ? 'var(--border-subtle)' : 'transparent', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Fleet Dashboard
            </button>
            <button 
              onClick={() => setCurrentTab('models')}
              style={{ background: currentTab === 'models' ? 'var(--border-subtle)' : 'transparent', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Model Mandates
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Logged in as: <strong style={{ color: 'white' }}>{tenantToken}</strong></span>
          <button 
            onClick={() => setTenantToken(null)}
            style={{ background: 'transparent', color: 'var(--status-red)', border: '1px solid var(--status-red)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="mainContent">
        {currentTab === 'models' ? renderModelsTab() : (!selectedAccountId ? renderHeatmap() : renderDetailedView())}

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
