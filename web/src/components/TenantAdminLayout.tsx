import React from 'react';

interface TenantAdminLayoutProps {
  children: React.ReactNode;
  identityDisplay: string;
  onSignOut: () => void;
  activeTab: 'overview' | 'users' | 'models' | 'assets';
  onTabChange: (tab: 'overview' | 'users' | 'models' | 'assets') => void;
}

export const TenantAdminLayout: React.FC<TenantAdminLayoutProps> = ({ 
  children, 
  identityDisplay, 
  onSignOut,
  activeTab,
  onTabChange
}) => {
  const getTabClass = (tabId: string) => {
    const baseClass = "px-4 py-3 rounded-md text-sm font-semibold cursor-pointer transition-colors flex items-center gap-2";
    if (activeTab === tabId) {
      return `${baseClass} bg-indigo-500/10 text-indigo-400 border border-indigo-500/20`;
    }
    return `${baseClass} hover:bg-gray-800 text-gray-400`;
  };

  return (
    <div className="flex h-screen bg-[#0f1115] text-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1d24] border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center gap-3 text-indigo-400 font-bold text-lg">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          Firm Dashboard
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <div className={getTabClass('overview')} onClick={() => onTabChange('overview')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            Firm Overview
          </div>
          <div className={getTabClass('users')} onClick={() => onTabChange('users')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            User Management
          </div>
          
          <div className="pt-4 pb-2 text-xs font-bold text-gray-600 uppercase tracking-wider">
            Firm Configuration
          </div>
          
          <div className={getTabClass('models')} onClick={() => onTabChange('models')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            Rebalancing Models
          </div>
          <div className={getTabClass('assets')} onClick={() => onTabChange('assets')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Asset Universe
          </div>
        </nav>
        
        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-gray-500 mb-3 truncate">
            Logged in as:<br/>
            <strong className="text-gray-300 mt-1 block">{identityDisplay}</strong>
          </div>
          <button 
            onClick={onSignOut} 
            className="w-full px-4 py-2 text-sm text-red-400 border border-red-500/50 rounded-md hover:bg-red-500 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};
