import React from 'react';
import { Shield, Building, Link2, Activity, LogOut } from 'lucide-react';

interface SuperadminLayoutProps {
  children: React.ReactNode;
  identityDisplay: string;
  onSignOut: () => void;
  activeTab: 'tenants' | 'broker' | 'sysops' | 'assets';
  onTabChange: (tab: 'tenants' | 'broker' | 'sysops' | 'assets') => void;
}

export const SuperadminLayout: React.FC<SuperadminLayoutProps> = ({ 
  children, 
  identityDisplay, 
  onSignOut,
  activeTab,
  onTabChange
}) => {
  const getTabClass = (tabId: string) => {
    const baseClass = "px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-300 flex items-center gap-3 relative overflow-hidden group";
    if (activeTab === tabId) {
      return `${baseClass} text-violet-700 bg-violet-50 shadow-sm border border-violet-100/50`;
    }
    return `${baseClass} hover:bg-slate-100/80 text-slate-600 hover:text-slate-900 border border-transparent`;
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar with Glassmorphism */}
      <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
        <div className="p-6 border-b border-slate-100/60 flex items-center gap-3 text-slate-800 font-bold text-lg tracking-tight">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-lg shadow-[0_0_20px_rgba(139,92,246,0.15)]">
            <Shield size={20} className="text-white" />
          </div>
          Platform Pulse
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <div className="pt-2 pb-2 px-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            Global Settings
          </div>
          
          <div className={getTabClass('tenants')} onClick={() => onTabChange('tenants')}>
            {activeTab === 'tenants' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 rounded-r-full"></div>}
            <Building size={18} className={activeTab === 'tenants' ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} />
            Tenant Management
          </div>
          <div className={getTabClass('broker')} onClick={() => onTabChange('broker')}>
            {activeTab === 'broker' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 rounded-r-full"></div>}
            <Link2 size={18} className={activeTab === 'broker' ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} />
            Broker Integrations
          </div>
          
          <div className="pt-6 pb-2 px-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            System Operations
          </div>
          
          <div className={getTabClass('sysops')} onClick={() => onTabChange('sysops')}>
            {activeTab === 'sysops' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 rounded-r-full"></div>}
            <Activity size={18} className={activeTab === 'sysops' ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} />
            Pulse & Telemetry
          </div>
          <div className={getTabClass('assets')} onClick={() => onTabChange('assets')}>
            {activeTab === 'assets' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 rounded-r-full"></div>}
            <Building size={18} className={activeTab === 'assets' ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} />
            Asset Universe
          </div>
        </nav>
        
        <div className="p-5 border-t border-slate-100/60 bg-slate-50/50 backdrop-blur-md">
          <div className="text-xs text-slate-500 mb-4 truncate bg-white p-3 rounded-lg border border-slate-200/50 shadow-sm">
            <span className="uppercase tracking-wider font-semibold text-[10px]">Logged in as</span><br/>
            <strong className="text-slate-700 mt-1 block font-medium">{identityDisplay}</strong>
          </div>
          <button 
            onClick={onSignOut} 
            className="w-full px-4 py-2.5 text-sm text-rose-600 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 hover:border-rose-300 transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-sm hover:shadow-md"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-0">
        {children}
      </main>
    </div>
  );
};
