import React from 'react';

export const AdvisorLayout: React.FC<{ children: React.ReactNode; identityDisplay: string; onSignOut: () => void }> = ({ children, identityDisplay, onSignOut }) => {
  return (
    <div className="flex h-screen bg-[#0f1115] text-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1d24] border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center gap-3 text-blue-400 font-bold text-lg">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          Advisor Workspace
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <div className="px-4 py-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md text-sm font-semibold cursor-pointer transition-colors">
            Action Inbox
          </div>
          <div className="px-4 py-3 hover:bg-gray-800 text-gray-400 rounded-md text-sm font-semibold cursor-pointer transition-colors">
            All Portfolios
          </div>
          <div className="px-4 py-3 hover:bg-gray-800 text-gray-400 rounded-md text-sm font-semibold cursor-pointer transition-colors">
            Model Mandates
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
