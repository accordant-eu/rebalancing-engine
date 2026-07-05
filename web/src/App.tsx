import { useEffect, useState } from 'react';
import { ArrowLeft, Info, Zap } from 'lucide-react';

import type { LiveState, ModelMandate, StatePayload } from './types';
import { MandateBuilderForm } from './components/MandateBuilderForm';
import { TenantManagementTab } from './components/admin/TenantManagementTab';
import { BrokerIntegrationTab } from './components/admin/BrokerIntegrationTab';
import { RebalancingModelsTab } from './components/admin/RebalancingModelsTab';
import { SystemOpsTab } from './components/admin/SystemOpsTab';
import { AssetUniverseTab } from './components/admin/AssetUniverseTab';
import { CommandCenterDashboard } from './components/CommandCenterDashboard';
import { AdvisorLayout } from './components/AdvisorLayout';
import { ComplianceLayout } from './components/ComplianceLayout';
import { ComplianceDashboard } from './components/ComplianceDashboard';
import { TenantAdminLayout } from './components/TenantAdminLayout';
import { FirmOverviewDashboard } from './components/FirmOverviewDashboard';
import { UserManagementDashboard } from './components/UserManagementDashboard';
import { SuperadminLayout } from './components/SuperadminLayout';

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
  const [currentTab, setCurrentTab] = useState<'inbox' | 'fleet' | 'models' | 'tenants' | 'broker' | 'adminModels' | 'sysops' | 'assets' | 'users'>('fleet');
  
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
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-full max-w-md p-10 bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-center mb-10 gap-3">
            <div className="p-2 bg-sky-100 rounded-lg">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Accordant</h2>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-600">Email Address</label>
              <input name="email" type="email" required className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-sm" placeholder="admin@accordant.eu" />
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-600">Password</label>
              <input name="password" type="password" required className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-sm" placeholder="••••••••" />
            </div>
            <button type="submit" className="mt-4 w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">
              Sign In to Engine
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderHeatmap = () => {
    if (!state) return <div className="metricLabel">Waiting for state...</div>;
    return <CommandCenterDashboard state={state} setSelectedAccountId={setSelectedAccountId} logs={logs} />;
  };

  const renderDetailedView = () => {
    if (!state || !selectedAccountId || !state.portfolios[selectedAccountId]) return null;
    const portfolio = state.portfolios[selectedAccountId];
    const metrics = getPortfolioMetrics(portfolio, state.globalPrices.prices);

    const isDiscretionary = portfolio.portfolioState.subscriptionType === 'discretionary';
    const activeModelId = portfolio.portfolioState.modelId;

    return (
      <div className="p-8 max-w-7xl mx-auto h-full flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <button 
            className="px-4 py-2 bg-white border border-slate-200/60 text-slate-600 hover:text-slate-900 hover:bg-slate-50/80 rounded-xl shadow-sm font-medium transition-all hover:shadow-md hover:-translate-y-0.5 flex items-center gap-2"
            onClick={() => setSelectedAccountId(null)}
          >
            <ArrowLeft size={16} />
            Back to Fleet View
          </button>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Portfolio: <span className="font-mono text-sky-600">{selectedAccountId}</span></h2>
        </div>

        {/* Subscription Control Panel */}
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-soft overflow-hidden transition-all duration-300 hover:shadow-soft-hover">
          <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50/50 backdrop-blur-md flex justify-between items-center">
            <span className="font-bold tracking-tight text-slate-900 text-lg">Mandate Configuration</span>
            <span className={`text-[11px] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider shadow-sm border ${isDiscretionary ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {isDiscretionary ? 'SUBSCRIBED TO MODEL' : 'BESPOKE (CUSTOM)'}
            </span>
          </div>
          <div className="p-6 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <select 
                value={portfolio.portfolioState.subscriptionType || 'bespoke'}
                onChange={(e) => handleUpdateSubscription(selectedAccountId, e.target.value === 'bespoke' ? null : (activeModelId || models[0]?.modelId), e.target.value)}
                className="px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-sm min-w-[200px] cursor-pointer transition-all"
              >
                <option value="bespoke">Bespoke</option>
                <option value="discretionary">Discretionary (Model Mandate)</option>
              </select>

              {isDiscretionary && (
                <select 
                  value={activeModelId || ''}
                  onChange={(e) => handleUpdateSubscription(selectedAccountId, e.target.value, 'discretionary')}
                  className="px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-sm min-w-[200px] cursor-pointer transition-all"
                >
                  {models.map(m => (
                    <option key={m.modelId} value={m.modelId}>{m.name}</option>
                  ))}
                </select>
              )}
            </div>

            {!isDiscretionary && (
              <div className="text-sm text-slate-600 p-5 bg-sky-50/50 rounded-xl border border-sky-100 flex items-start gap-3">
                <Info size={20} className="text-sky-500 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <em>Note: UI for manually editing Bespoke Mandate parameters (target weights, absolute drift tolerance, etc.) is scheduled for a future Tranche. Currently viewing read-only targets.</em>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-soft overflow-hidden flex-1 flex flex-col transition-all duration-300 hover:shadow-soft-hover">
          <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50/50 backdrop-blur-md font-bold tracking-tight text-slate-900 text-lg">Target Allocation Drift</div>
          <div className="p-6 overflow-y-auto grid gap-4 bg-slate-50/30">
            {metrics.positions.map(h => {
              const maxDriftDisplay = (portfolio.policy.absoluteDriftTolerance || 0.05) * 2;
              const normalizedDrift = Math.min(Math.max(h.drift / maxDriftDisplay, -1), 1);
              const barStyle = {
                left: normalizedDrift < 0 ? `${50 + normalizedDrift * 50}%` : '50%',
                width: `${Math.abs(normalizedDrift) * 50}%`,
              };

              return (
                <div key={h.symbol} className={`flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-6 p-5 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md ${h.isBreached ? 'border-rose-200 bg-rose-50/80' : 'border-slate-200/80 bg-white'}`}>
                  <div className="w-16 lg:w-24 font-bold text-xl text-slate-900 tracking-tight">{h.symbol}</div>
                  <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 lg:gap-6 w-full">
                    <div className="flex flex-col w-full sm:w-24 lg:w-32 text-center sm:text-left">
                      <span className="text-[10px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target vs Current</span>
                      <span className="text-sm font-medium text-slate-800 font-mono">{(h.targetWeight * 100).toFixed(1)}% → {(h.currentWeight * 100).toFixed(1)}%</span>
                    </div>
                    
                    <div className="flex-1 h-3 bg-slate-100 rounded-full relative w-full sm:min-w-[150px] shadow-inner overflow-hidden border border-slate-200/50 mt-2 sm:mt-0">
                      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-300 z-10"></div>
                      <div 
                        className={`absolute top-0 bottom-0 transition-all duration-500 ease-out ${h.isPositive ? 'bg-sky-500' : 'bg-rose-500'}`}
                        style={barStyle}
                      ></div>
                    </div>
                    
                    <div className="flex flex-col w-full sm:w-20 lg:w-24 text-center sm:text-right mt-2 sm:mt-0">
                      <span className="text-[10px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Abs Drift</span>
                      <span className={`text-sm font-bold font-mono ${h.isPositive ? 'text-sky-600' : 'text-rose-600'}`}>
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
      <div className="p-8 max-w-7xl mx-auto h-full overflow-y-auto">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-6">Model Mandates</h2>
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-soft mb-8 overflow-hidden transition-all duration-300 hover:shadow-soft-hover">
          <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50/50 backdrop-blur-md flex justify-between items-center">
            <span className="font-bold tracking-tight text-slate-900 text-lg">Create New Model Mandate</span>
            <button 
              onClick={handleRunOptimizer}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold tracking-wide rounded-xl shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 text-sm flex items-center gap-2"
            >
              <Zap size={16} className="text-sky-200" />
              Run Optimizer (Tranche C Mock)
            </button>
          </div>
          <div className="p-6">
            <MandateBuilderForm token={tenantToken || ''} onSubmit={handleCreateModel} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map(m => (
            <div key={m.modelId} className="bg-white border border-slate-200/60 rounded-2xl shadow-soft overflow-hidden flex flex-col transition-all duration-300 hover:shadow-soft-hover hover:-translate-y-1">
              <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50/50 backdrop-blur-md font-bold tracking-tight text-slate-900 text-lg">{m.name}</div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-5 text-[11px] font-bold text-slate-400 flex justify-between uppercase tracking-wider">
                  <span>ID: {m.modelId}</span>
                  {tenantToken === 'superadmin' && <span>Tenant: {m.tenantId}</span>}
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-4 border-b border-slate-100 pb-2">Target Allocation</span>
                  <div className="space-y-3">
                    {m.targetAllocation.targets.map(t => (
                      <div key={t.instrumentId} className="flex justify-between items-center text-sm group">
                        <span className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{t.instrumentId}</span>
                        <span className="font-mono text-sky-600 font-medium bg-sky-50 px-2 py-0.5 rounded">{(t.weight * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  let identityDisplay = tenantToken;
  try {
    if (tenantToken) {
      const parts = tenantToken.split('.');
      if (parts.length === 3) {
        const decoded = JSON.parse(atob(parts[1]));
        identityDisplay = `${decoded.userId} (${decoded.tenantId})`;
      }
    }
  } catch(e) {}

  if (userRole === 'Advisor') {
    const layoutTab = (['inbox', 'fleet', 'models'].includes(currentTab) ? currentTab : 'inbox') as any;

    return (
      <AdvisorLayout 
        identityDisplay={identityDisplay || ''} 
        onSignOut={() => { setTenantToken(null); setUserRole(null); }}
        activeTab={layoutTab}
        onTabChange={(tab) => setCurrentTab(tab)}
      >
        {currentTab === 'inbox' && <div className="p-8 text-slate-500">Action Inbox under construction... Redirecting logic here soon! (Tranche C)</div>}
        {currentTab === 'fleet' && (!selectedAccountId ? renderHeatmap() : renderDetailedView())}
        {currentTab === 'models' && renderModelsTab()}
      </AdvisorLayout>
    );
  }

  if (userRole === 'Viewer') {
    return (
      <ComplianceLayout identityDisplay={identityDisplay || ''} onSignOut={() => { setTenantToken(null); setUserRole(null); }}>
        <ComplianceDashboard token={tenantToken} />
      </ComplianceLayout>
    );
  }

  if (userRole === 'Admin') {
    // We map 'adminModels' and 'assets' to the layout tabs
    // Note: The App component state 'currentTab' can be re-used, but let's use a local mapping
    const getAdminTab = () => {
      switch (currentTab) {
        case 'adminModels': return <RebalancingModelsTab token={tenantToken} />;
        case 'users': return <UserManagementDashboard token={tenantToken} />;
        default: return <FirmOverviewDashboard token={tenantToken} />;
      }
    };
    
    // Map currentTab to the layout's activeTab type
    const layoutTab = (['overview', 'users', 'models'].includes(currentTab) ? currentTab : 'overview') as any;

    return (
      <TenantAdminLayout 
        identityDisplay={identityDisplay || ''} 
        onSignOut={() => { setTenantToken(null); setUserRole(null); }}
        activeTab={layoutTab}
        onTabChange={(tab) => {
          if (tab === 'models') setCurrentTab('adminModels');
          else if (tab === 'overview') setCurrentTab('fleet'); // or just 'overview'
          else setCurrentTab(tab);
        }}
      >
        {getAdminTab()}
      </TenantAdminLayout>
    );
  }

  if (userRole === 'Superadmin') {
    const getSuperTab = () => {
      switch (currentTab) {
        case 'tenants': return <TenantManagementTab token={tenantToken} />;
        case 'broker': return <BrokerIntegrationTab token={tenantToken} />;
        case 'sysops': return <SystemOpsTab token={tenantToken} />;
        default: return <SystemOpsTab token={tenantToken} />;
      }
    };

    const layoutTab = (['tenants', 'broker', 'sysops'].includes(currentTab) ? currentTab : 'sysops') as any;

    return (
      <SuperadminLayout 
        identityDisplay={identityDisplay || ''} 
        onSignOut={() => { setTenantToken(null); setUserRole(null); }}
        activeTab={layoutTab}
        onTabChange={(tab) => setCurrentTab(tab)}
      >
        <div style={{ padding: '24px' }}>
          {getSuperTab()}
        </div>
      </SuperadminLayout>
    );
  }

  // Fallback for unhandled roles
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
                  onClick={() => setCurrentTab('assets')}
                  style={{ background: currentTab === 'assets' ? 'var(--border-subtle)' : 'transparent', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Asset Universe
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
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Logged in as: <strong style={{ color: 'white' }}>{identityDisplay}</strong></span>
          <button 
            onClick={() => { setTenantToken(null); setUserRole(null); }}
            style={{ background: 'transparent', color: 'var(--status-red)', border: '1px solid var(--status-red)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="mainContent">
        {currentTab === 'models' && <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{renderModelsTab()}</div>}
        {currentTab === 'fleet' && (!selectedAccountId ? renderHeatmap() : renderDetailedView())}
        {currentTab === 'tenants' && <div style={{ overflowY: 'auto' }}><TenantManagementTab token={tenantToken} /></div>}
        {currentTab === 'broker' && <div style={{ overflowY: 'auto' }}><BrokerIntegrationTab token={tenantToken} /></div>}
        {currentTab === 'adminModels' && <div style={{ overflowY: 'auto' }}><RebalancingModelsTab token={tenantToken} /></div>}
        {currentTab === 'assets' && <div style={{ overflowY: 'auto' }}><AssetUniverseTab token={tenantToken} /></div>}
        {currentTab === 'sysops' && <div style={{ overflowY: 'auto' }}><SystemOpsTab token={tenantToken} /></div>}
      </main>
    </div>
  );
}

export default App;
