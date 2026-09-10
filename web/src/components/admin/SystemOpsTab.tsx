import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  PauseCircle, 
  PlayCircle, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Play, 
  RefreshCw, 
  Layers, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import type { SchedulerStatusResponse, MandateScanResult } from '../../types';

export const SystemOpsTab: React.FC<{ token: string }> = ({ token }) => {
  const [queueDepth, setQueueDepth] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatusResponse | null>(null);
  const [scanDate, setScanDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScanResult, setLastScanResult] = useState<MandateScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/admin/queue', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setQueueDepth(data.depth);
      }
    } catch (e) {
      console.error('Failed to fetch queue depth', e);
    }
  };

  const fetchSchedulerStatus = async () => {
    try {
      const res = await fetch('/api/admin/scheduler/status', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSchedulerStatus(data);
      }
    } catch (e) {
      console.error('Failed to fetch scheduler status', e);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchSchedulerStatus();
    const interval = setInterval(() => {
      fetchQueue();
      fetchSchedulerStatus();
    }, 2000);
    return () => clearInterval(interval);
  }, [token]);

  const togglePause = async () => {
    const endpoint = isPaused ? '/api/admin/system/resume' : '/api/admin/system/pause';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIsPaused(data.isPaused);
      }
    } catch (e) {
      console.error('Failed to toggle system pause', e);
    }
  };

  const triggerSchedulerScan = async () => {
    setIsScanning(true);
    setScanError(null);
    try {
      const res = await fetch('/api/admin/scheduler/scan', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ evaluationDate: scanDate }),
      });
      if (res.ok) {
        const data: MandateScanResult = await res.json();
        setLastScanResult(data);
        fetchQueue();
        fetchSchedulerStatus();
      } else {
        const err = await res.json();
        setScanError(err.message || 'Scan trigger failed');
      }
    } catch (e: any) {
      setScanError(e.message || 'Failed to connect to scheduler service');
    } finally {
      setIsScanning(false);
    }
  };

  const freq = schedulerStatus?.frequencyBreakdown || { monthly: 0, quarterly: 0, annually: 0, explicit: 0 };
  const upcoming = schedulerStatus?.upcomingAccounts || [];

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8 pb-12 font-sans">
      
      {/* 1. Header & Live Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Live Queue Depth Card */}
        <section className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-soft relative overflow-hidden transition-all duration-300 hover:shadow-soft-hover">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-sky-500 transform translate-x-4 -translate-y-4">
            <Activity size={140} />
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
              <Activity size={16} className="text-sky-500" />
              Evaluation Queue
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
              Live Polling
            </span>
          </div>
          <div className="text-6xl font-black text-sky-600 mb-2 font-mono tracking-tighter tabular-nums drop-shadow-sm relative z-10">
            {queueDepth}
          </div>
          <p className="text-xs text-slate-500 font-medium relative z-10">
            Portfolios awaiting batch evaluation by worker loop (25 accounts / 200ms throttle).
          </p>
        </section>

        {/* Mandate Scheduler Cron Status Card */}
        <section className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-soft relative overflow-hidden transition-all duration-300 hover:shadow-soft-hover">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-indigo-500 transform translate-x-4 -translate-y-4">
            <Calendar size={140} />
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
              <Calendar size={16} className="text-indigo-500" />
              Mandate Scheduler
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Cron Active
            </span>
          </div>
          <div className="text-6xl font-black text-indigo-600 mb-2 font-mono tracking-tighter tabular-nums drop-shadow-sm relative z-10">
            {schedulerStatus?.calendarAccountsCount ?? 0}
          </div>
          <p className="text-xs text-slate-500 font-medium relative z-10">
            Active calendar-mandated accounts registered across all advisory tenants.
          </p>
        </section>

        {/* Cron Schedule & Policy Card */}
        <section className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-soft relative overflow-hidden transition-all duration-300 hover:shadow-soft-hover flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-4 uppercase tracking-widest">
              <Clock size={16} className="text-amber-500" />
              Scheduler Cadence
            </div>
            <div className="font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold mb-3 flex items-center justify-between">
              <span>{schedulerStatus?.cronSchedule || '0 9 * * 1-5'}</span>
              <span className="text-xs text-slate-400 font-sans font-normal">Weekdays 09:00</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span>Auto-advance policy dates on trigger</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Deterministic UTC Clamping</span>
            <span className="font-mono">ADR-0064</span>
          </div>
        </section>

      </div>

      {/* 2. Frequency Breakdown & On-Demand Trigger Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Frequency Breakdown Cards */}
        <div className="lg:col-span-1 bg-white border border-slate-200/60 rounded-3xl p-6 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-4 uppercase tracking-widest">
              <Layers size={16} className="text-sky-500" />
              Recurring Cadence Breakdown
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl">
                <div className="text-xs text-slate-500 font-medium">Monthly</div>
                <div className="text-2xl font-bold font-mono text-slate-800">{freq.monthly}</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl">
                <div className="text-xs text-slate-500 font-medium">Quarterly</div>
                <div className="text-2xl font-bold font-mono text-slate-800">{freq.quarterly}</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl">
                <div className="text-xs text-slate-500 font-medium">Annually</div>
                <div className="text-2xl font-bold font-mono text-slate-800">{freq.annually}</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl">
                <div className="text-xs text-slate-500 font-medium">Explicit Date</div>
                <div className="text-2xl font-bold font-mono text-slate-800">{freq.explicit}</div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            Calculated across live tenant account policies.
          </div>
        </div>

        {/* On-Demand Scheduler Scan Tool */}
        <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-3xl p-6 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
                <Play size={16} className="text-emerald-500" />
                Trigger On-Demand Scheduler Scan
              </div>
              <span className="text-xs text-slate-400 font-mono">POST /api/admin/scheduler/scan</span>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Evaluate all registered tenant portfolios against a specific calendar date. Due portfolios (where <code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">evalDate &gt;= nextRebalanceDate</code>) will be dispatched to the <code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">EvaluationQueue</code>.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Calendar size={16} className="text-slate-400" />
                <label htmlFor="scan-date-input" className="text-xs font-medium text-slate-600">Evaluation Date:</label>
                <input 
                  id="scan-date-input"
                  type="date"
                  value={scanDate}
                  onChange={(e) => setScanDate(e.target.value)}
                  className="bg-transparent text-sm font-mono text-slate-800 font-semibold focus:outline-none"
                />
              </div>

              <button
                onClick={triggerSchedulerScan}
                disabled={isScanning}
                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm hover:shadow flex items-center gap-2 disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Scanning Accounts...
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Run Mandate Scan
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Real-Time Scan Feedback Banner */}
          {lastScanResult && (
            <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center justify-between text-xs text-emerald-900 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>Scan Completed:</strong> Scanned {lastScanResult.scanned} accounts &bull; Enqueued <strong>{lastScanResult.enqueued}</strong> due portfolios for date <code className="font-mono font-bold">{lastScanResult.evaluationDate}</code>
                </span>
              </div>
              {lastScanResult.accountIds.length > 0 && (
                <span className="font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md text-[11px]">
                  {lastScanResult.accountIds.join(', ')}
                </span>
              )}
            </div>
          )}

          {scanError && (
            <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-800">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
              <span>{scanError}</span>
            </div>
          )}
        </div>

      </div>

      {/* 3. Upcoming Calendar Rebalance Mandates Table */}
      <section className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
            <Calendar size={16} className="text-indigo-500" />
            Upcoming Scheduled Calendar Rebalances
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {upcoming.length} scheduled accounts
          </span>
        </div>

        {upcoming.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No calendar rebalancing mandates currently configured.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="pb-3 px-3">Account ID</th>
                  <th className="pb-3 px-3">Tenant ID</th>
                  <th className="pb-3 px-3">Frequency</th>
                  <th className="pb-3 px-3">Next Rebalance Date</th>
                  <th className="pb-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {upcoming.map((acc) => {
                  const isDue = acc.nextRebalanceDate <= scanDate;
                  return (
                    <tr key={acc.accountId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-slate-900">{acc.accountId}</td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-xs">{acc.tenantId || 'global'}</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex capitalize px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {acc.frequency}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-800 font-semibold">{acc.nextRebalanceDate}</td>
                      <td className="py-3 px-3 text-right">
                        {isDue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Due for scan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Scheduled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 4. Emergency Circuit Breaker Section */}
      <section className={`rounded-3xl p-8 shadow-soft text-center transition-all duration-500 ${isPaused ? 'bg-amber-50 border-amber-200/60' : 'bg-white border-rose-200/60 border'}`}>
        <div className="flex justify-center mb-4">
          <div className={`p-3.5 rounded-full ${isPaused ? 'bg-amber-100 text-amber-600' : 'bg-rose-50 text-rose-600 shadow-glow-rose'}`}>
            <AlertTriangle size={28} />
          </div>
        </div>
        
        <h2 className={`text-xl font-bold tracking-tight mb-2 ${isPaused ? 'text-amber-900' : 'text-rose-700'}`}>
          {isPaused ? 'Orchestrator System Paused' : 'Emergency System Pause Switch'}
        </h2>
        
        <p className={`text-xs font-medium max-w-md mx-auto mb-6 ${isPaused ? 'text-amber-700/80' : 'text-rose-600/80'}`}>
          Toggling this switch immediately halts the orchestrator loop. The queue will continue to accumulate incoming market price triggers, but no trade proposals or broker executions will proceed until resumed.
        </p>
        
        <button 
          onClick={togglePause}
          className={`px-8 py-3.5 rounded-2xl font-bold text-sm tracking-wider uppercase transition-all duration-300 shadow-sm hover:shadow-lg flex items-center justify-center gap-2 mx-auto ${
            isPaused 
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-glow-emerald' 
              : 'bg-rose-600 hover:bg-rose-700 text-white'
          }`}
        >
          {isPaused ? (
            <>
              <PlayCircle size={18} />
              Resume Orchestrator Loop
            </>
          ) : (
            <>
              <PauseCircle size={18} />
              Pause Orchestrator Loop
            </>
          )}
        </button>
      </section>
      
    </div>
  );
};
