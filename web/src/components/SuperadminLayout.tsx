import React from 'react';

interface SuperadminLayoutProps {
  children: React.ReactNode;
  identityDisplay: string;
  onSignOut: () => void;
  activeTab: 'tenants' | 'broker' | 'sysops';
  onTabChange: (tab: 'tenants' | 'broker' | 'sysops') => void;
}

export const SuperadminLayout: React.FC<SuperadminLayoutProps> = ({ 
  children, 
  identityDisplay, 
  onSignOut,
  activeTab,
  onTabChange
}) => {
  const getTabClass = (tabId: string) => {
    const baseClass = "px-4 py-3 rounded-md text-sm font-semibold cursor-pointer transition-colors flex items-center gap-2";
    if (activeTab === tabId) {
      return `${baseClass} bg-rose-500/10 text-rose-400 border border-rose-500/20`;
    }
    return `${baseClass} hover:bg-gray-800 text-gray-400`;
  };

  return (
    <div className="flex h-screen bg-[#0f1115] text-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1d24] border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center gap-3 text-rose-400 font-bold text-lg">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Platform Pulse
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <div className="pt-2 pb-2 text-xs font-bold text-gray-600 uppercase tracking-wider">
            Global Settings
          </div>
          
          <div className={getTabClass('tenants')} onClick={() => onTabChange('tenants')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            Tenant Management
          </div>
          <div className={getTabClass('broker')} onClick={() => onTabChange('broker')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            Broker Integrations
          </div>
          
          <div className="pt-4 pb-2 text-xs font-bold text-gray-600 uppercase tracking-wider">
            System Operations
          </div>
          
          <div className={getTabClass('sysops')} onClick={() => onTabChange('sysops')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            Pulse & Telemetry
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
