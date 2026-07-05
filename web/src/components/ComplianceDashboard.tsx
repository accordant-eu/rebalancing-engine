import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

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
  }, [token]); 

  return (
    <div className="p-8 h-full flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Audit Explorer</h1>
        <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">Read-Only View</div>
      </div>
      
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
          <input 
            type="text" 
            placeholder="Filter by Account ID..." 
            value={accountIdFilter}
            onChange={(e) => setAccountIdFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-sm w-64" 
          />
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-sm"
          >
            <option value="">All Event Types</option>
            <option value="EVALUATION">Evaluation</option>
            <option value="THRESHOLD_BREACH">Threshold Breach</option>
            <option value="TRADE_EXECUTED">Trade Executed</option>
            <option value="CIRCUIT_BREAKER_HALT">Circuit Breaker Halt</option>
          </select>
          <button onClick={fetchLogs} className="px-5 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-sm font-semibold shadow-sm flex items-center gap-2">
            <Search size={16} />
            Search
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-0 flex flex-col">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Timestamp</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Event Type</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Account ID</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">
                  <div className="animate-pulse flex items-center justify-center gap-2">
                    <div className="h-4 w-4 bg-slate-200 rounded-full"></div>
                    Loading audit trails...
                  </div>
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">No audit events found.</td></tr>
              ) : (
                logs.map((log: any) => (
                  <React.Fragment key={log.eventId}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs">{new Date(log.timestampMs || log.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          log.type === 'CIRCUIT_BREAKER_HALT' ? 'bg-rose-100 text-rose-700' :
                          log.type === 'THRESHOLD_BREACH' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs">{log.accountId || 'System'}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedLog(selectedLog?.eventId === log.eventId ? null : log)}
                          className="text-sky-600 hover:text-sky-800 font-medium text-xs transition-colors"
                        >
                          {selectedLog?.eventId === log.eventId ? 'Hide JSON' : 'View JSON'}
                        </button>
                      </td>
                    </tr>
                    {selectedLog?.eventId === log.eventId && (
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <td colSpan={4} className="p-6">
                          <pre className="text-xs text-slate-600 bg-white p-4 rounded-lg border border-slate-200 overflow-x-auto shadow-inner">
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
