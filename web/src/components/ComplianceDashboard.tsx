import React, { useState, useEffect } from 'react';

export const ComplianceDashboard: React.FC<{ token: string | null }> = ({ token }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountIdFilter, setAccountIdFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const fetchLogs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (accountIdFilter) query.append('accountId', accountIdFilter);
      if (typeFilter) query.append('type', typeFilter);
      
      const res = await fetch(`/api/logs?${query.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const payload = await res.json();
        setLogs(Array.isArray(payload) ? payload : payload.data || []);
      }
    } catch(e) {
      console.error('Failed to fetch audit trails', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]); // removed filters from dep array to require manual 'Search' click

  return (
    <div className="p-6 h-full flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-light text-white">Audit Explorer</h1>
        <div className="text-sm text-gray-400">Read-Only View</div>
      </div>
      
      <div className="rounded-xl border border-gray-800 bg-[#1a1d24] shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-[#252830] flex gap-4">
          <input 
            type="text" 
            placeholder="Filter by Account ID..." 
            value={accountIdFilter}
            onChange={(e) => setAccountIdFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#0f1115] border border-gray-700 rounded text-sm text-gray-200 outline-none focus:border-emerald-500" 
          />
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#0f1115] border border-gray-700 rounded text-sm text-gray-200 outline-none focus:border-emerald-500"
          >
            <option value="">All Event Types</option>
            <option value="EVALUATION">Evaluation</option>
            <option value="THRESHOLD_BREACH">Threshold Breach</option>
            <option value="TRADE_EXECUTED">Trade Executed</option>
            <option value="CIRCUIT_BREAKER_HALT">Circuit Breaker Halt</option>
          </select>
          <button onClick={fetchLogs} className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded hover:bg-emerald-500 hover:text-white transition-colors text-sm font-semibold">
            Search
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-0 flex flex-col">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f1115] text-gray-400 sticky top-0">
              <tr>
                <th className="px-5 py-3 font-semibold">Timestamp</th>
                <th className="px-5 py-3 font-semibold">Event Type</th>
                <th className="px-5 py-3 font-semibold">Account ID</th>
                <th className="px-5 py-3 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={4} className="p-6 text-center text-gray-500">Loading audit trails...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-gray-500">No audit events found.</td></tr>
              ) : (
                logs.map((log: any) => (
                  <React.Fragment key={log.eventId}>
                    <tr className="hover:bg-[#252830] transition-colors">
                      <td className="px-5 py-3 text-gray-300">{new Date(log.timestampMs || log.createdAt).toLocaleString()}</td>
                      <td className="px-5 py-3 text-emerald-400 font-medium">{log.type}</td>
                      <td className="px-5 py-3 text-blue-400">{log.accountId || 'System'}</td>
                      <td className="px-5 py-3 text-right">
                        <button 
                          onClick={() => setSelectedLog(selectedLog?.eventId === log.eventId ? null : log)}
                          className="text-gray-400 hover:text-white underline text-xs"
                        >
                          {selectedLog?.eventId === log.eventId ? 'Hide JSON' : 'View JSON'}
                        </button>
                      </td>
                    </tr>
                    {selectedLog?.eventId === log.eventId && (
                      <tr className="bg-[#0f1115]">
                        <td colSpan={4} className="p-4 border-b border-gray-800">
                          <pre className="text-xs text-gray-400 overflow-x-auto">
                            {JSON.stringify({ inputs: log.inputs, outputs: log.outputs }, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
