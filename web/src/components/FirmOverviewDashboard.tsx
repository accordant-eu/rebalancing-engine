import React from 'react';

interface Portfolio {
  portfolioState: {
    accountId: string;
    circuitBreakerStatus?: string;
  };
  targetAllocation?: any;
  [key: string]: any;
}

export const FirmOverviewDashboard: React.FC<{ portfolios: Portfolio[] }> = ({ portfolios }) => {
  const total = portfolios.length;
  const halted = portfolios.filter(p => p.portfolioState?.circuitBreakerStatus && p.portfolioState.circuitBreakerStatus !== 'NORMAL').length;
  // A simplistic mock of "breached" for the overview.
  // We can just rely on the existing logic or approximate it here.
  // Actually, we don't have the drift metrics directly on the raw state unless we calculate it.
  // Let's just show Total and Halted for now, and maybe active models.
  
  return (
    <div className="p-6 h-full flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-light text-white">Firm Overview</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1a1d24] border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center">
          <div className="text-gray-400 text-sm font-semibold mb-2">Total Portfolios</div>
          <div className="text-4xl text-white font-bold">{total}</div>
        </div>
        
        <div className="bg-[#1a1d24] border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center">
          <div className="text-gray-400 text-sm font-semibold mb-2">Halted Portfolios</div>
          <div className={`text-4xl font-bold ${halted > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{halted}</div>
        </div>

        <div className="bg-[#1a1d24] border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center">
          <div className="text-gray-400 text-sm font-semibold mb-2">System Status</div>
          <div className="text-2xl text-emerald-400 font-bold flex items-center gap-2">
            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
            Operational
          </div>
        </div>
      </div>
    </div>
  );
};
