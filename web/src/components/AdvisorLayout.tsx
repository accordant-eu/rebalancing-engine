import React from 'react';
import { Briefcase, Inbox, LineChart, FileText, LogOut } from 'lucide-react';

export const AdvisorLayout: React.FC<{ 
  children: React.ReactNode; 
  identityDisplay: string; 
  onSignOut: () => void;
  activeTab: 'inbox' | 'fleet' | 'models';
  onTabChange: (tab: 'inbox' | 'fleet' | 'models') => void;
}> = ({ children, identityDisplay, onSignOut, activeTab, onTabChange }) => {
  const getTabClass = (tabId: string) => {
    const baseClass = "px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-300 flex items-center gap-3 relative overflow-hidden group";
    if (activeTab === tabId) {
      return `${baseClass} text-teal-700 bg-teal-50 shadow-sm border border-teal-100/50`;
    }
    return `${baseClass} hover:bg-slate-100/80 text-slate-600 hover:text-slate-900 border border-transparent`;
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar with Glassmorphism */}
      <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
        <div className="p-6 border-b border-slate-100/60 flex items-center gap-3 text-slate-800 font-bold text-lg tracking-tight">
          <div className="p-2 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <Briefcase size={20} className="text-white" />
          </div>
          Advisor Workspace
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <div className={getTabClass('inbox')} onClick={() => onTabChange('inbox')}>
            {activeTab === 'inbox' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 rounded-r-full"></div>}
            <Inbox size={18} className={activeTab === 'inbox' ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} />
            Action Inbox
          </div>
          <div className={getTabClass('fleet')} onClick={() => onTabChange('fleet')}>
            {activeTab === 'fleet' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 rounded-r-full"></div>}
            <LineChart size={18} className={activeTab === 'fleet' ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} />
            All Portfolios
          </div>
          <div className={getTabClass('models')} onClick={() => onTabChange('models')}>
            {activeTab === 'models' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 rounded-r-full"></div>}
            <FileText size={18} className={activeTab === 'models' ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} />
            Model Mandates
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
