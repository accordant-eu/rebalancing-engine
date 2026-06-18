import { useEffect, useState } from 'react';
import './App.css';

import type { LiveState, ModelMandate, StatePayload } from './types';
import { MandateBuilderForm } from './components/MandateBuilderForm';
import { TenantManagementTab } from './components/admin/TenantManagementTab';
import { BrokerIntegrationTab } from './components/admin/BrokerIntegrationTab';
import { RebalancingModelsTab } from './components/admin/RebalancingModelsTab';
import { SystemOpsTab } from './components/admin/SystemOpsTab';

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
  
  const absoluteThreshold = portfolio.policy.absoluteDriftTolerance || 0.05;

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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'fleet' | 'models' | 'tenants' | 'broker' | 'adminModels' | 'sysops'>('fleet');
  
  const [state, setState] = useState<StatePayload | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [models, setModels] = useState<ModelMandate[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const handleRunOptimizer = async () => {
    try {
      const headers = { 'Content-Type': 'application/json' } as any;
      if (tenantToken) headers['Authorization'] = `Bearer ${tenantToken}`;
      
      const res = await fetch('/api/optimizer/run', {
        method: 'POST',
        headers
      });
      if (!res.ok) throw new Error(await res.text());
      alert('Optimizer ran successfully! Portfolios are being re-evaluated.');
      window.location.reload();
    } catch (e: any) {
      alert(`Failed to run optimizer: ${e.message}`);
    }
  };

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
          const payload = await res.json();
          setLogs(Array.isArray(payload) ? payload : (payload.data || []));
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        alert('Login failed: Invalid credentials');
        return;
      }
      const data = await res.json();
      setTenantToken(data.token);
      setUserRole(data.role);
    } catch(err) {
      alert('Login failed');
    }
  };

  const handleCreateModel = async (mandateData: Partial<ModelMandate>) => {
    const payload = {
      modelId: `model-${Date.now()}`,
      tenantId: tenantToken === 'superadmin' ? 'tenant-baseline' : tenantToken,
      ...mandateData
    };

    await fetch('/api/models', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tenantToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    // Refresh models list
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
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Email</label>
              <input name="email" type="email" required style={{ width: '100%', padding: '12px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Password</label>
              <input name="password" type="password" required style={{ width: '100%', padding: '12px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px' }} />
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
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {tenantToken === 'superadmin' && portfolio.portfolioState.tenantId && (
                    <span style={{ fontSize: '0.6rem', background: 'var(--border-subtle)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                      {portfolio.portfolioState.tenantId}
                    </span>
                  )}
                  {portfolio.portfolioState.subscriptionType === 'discretionary' && (
                    <span style={{ fontSize: '0.7rem', background: 'var(--accent-blue)', padding: '2px 6px', borderRadius: '4px' }}>MODEL</span>
                  )}
                </div>
              </div>
              <div className="panelBody">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="metricLabel">Total Equity</span>
                  <span className="metricValue">${metrics.totalEquity.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="metricLabel">Max Drift</span>
                  <span className="metricValue" style={{ color: Math.abs(metrics.maxDrift) > (portfolio.policy.absoluteDriftTolerance || 0.05) ? 'var(--status-red)' : 'var(--status-green)' }}>
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
              const maxDriftDisplay = (portfolio.policy.absoluteDriftTolerance || 0.05) * 2;
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
          <div className="panelHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Create New Model Mandate</span>
            <button 
              onClick={handleRunOptimizer}
              style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Run Optimizer (Tranche C Mock)
            </button>
          </div>
          <div className="panelBody">
            <MandateBuilderForm onSubmit={handleCreateModel} />
          </div>
        </div>

        <div className="heatmapGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {models.map(m => (
            <div key={m.modelId} className="panel">
              <div className="panelHeader">{m.name}</div>
              <div className="panelBody">
                <div style={{ marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>ID: {m.modelId}</span>
                  {tenantToken === 'superadmin' && <span>Tenant: {m.tenantId}</span>}
                </div>
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
            {userRole === 'Admin' && (
              <>
                <button 
                  onClick={() => setCurrentTab('tenants')}
                  style={{ background: currentTab === 'tenants' ? 'var(--border-subtle)' : 'transparent', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Tenants
                </button>
                <button 
                  onClick={() => setCurrentTab('broker')}
                  style={{ background: currentTab === 'broker' ? 'var(--border-subtle)' : 'transparent', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Broker Integrations
                </button>
                <button 
                  onClick={() => setCurrentTab('adminModels')}
                  style={{ background: currentTab === 'adminModels' ? 'var(--border-subtle)' : 'transparent', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Global Models
                </button>
                <button 
                  onClick={() => setCurrentTab('sysops')}
                  style={{ background: currentTab === 'sysops' ? 'var(--border-subtle)' : 'transparent', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  System Ops
                </button>
              </>
            )}
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
        {currentTab === 'models' && renderModelsTab()}
        {currentTab === 'fleet' && (!selectedAccountId ? renderHeatmap() : renderDetailedView())}
        {currentTab === 'tenants' && <TenantManagementTab token={tenantToken} />}
        {currentTab === 'broker' && <BrokerIntegrationTab token={tenantToken} />}
        {currentTab === 'adminModels' && <RebalancingModelsTab token={tenantToken} />}
        {currentTab === 'sysops' && <SystemOpsTab token={tenantToken} />}

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
