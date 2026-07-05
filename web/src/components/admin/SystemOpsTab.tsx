import React, { useState, useEffect } from 'react';
import { Activity, PauseCircle, PlayCircle, AlertTriangle } from 'lucide-react';

export const SystemOpsTab: React.FC<{ token: string }> = ({ token }) => {
  const [queueDepth, setQueueDepth] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const fetchQueue = async () => {
    const res = await fetch('/api/admin/queue', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setQueueDepth(data.depth);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 1000);
    return () => clearInterval(interval);
  }, []);

  const togglePause = async () => {
    const endpoint = isPaused ? '/api/admin/system/resume' : '/api/admin/system/pause';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setIsPaused(data.isPaused);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-12">
      
      {/* Queue Depth Section */}
      <section className="bg-white border border-slate-200/60 rounded-3xl p-10 shadow-soft text-center relative overflow-hidden transition-all duration-300 hover:shadow-soft-hover">
        <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-sky-500 transform translate-x-6 -translate-y-6">
          <Activity size={180} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Live Evaluation Queue Depth</h2>
          <div className="text-8xl font-black text-sky-600 mb-6 font-mono tracking-tighter tabular-nums drop-shadow-sm">
            {queueDepth}
          </div>
          <p className="text-slate-500 font-medium max-w-md">
            Number of portfolios currently awaiting execution by the Orchestrator loop.
          </p>
        </div>
      </section>

      {/* Emergency Circuit Breaker */}
      <section className={`rounded-3xl p-10 shadow-soft text-center transition-all duration-500 ${isPaused ? 'bg-amber-50 border-amber-200/60' : 'bg-white border-rose-200/60'}`}>
        <div className="flex justify-center mb-6">
          <div className={`p-4 rounded-full ${isPaused ? 'bg-amber-100 text-amber-600' : 'bg-rose-50 text-rose-600 shadow-glow-rose'}`}>
            <AlertTriangle size={32} />
          </div>
        </div>
        
        <h2 className={`text-2xl font-bold tracking-tight mb-4 ${isPaused ? 'text-amber-900' : 'text-rose-700'}`}>
          {isPaused ? 'System Paused' : 'Emergency Circuit Breaker'}
        </h2>
        
        <p className={`font-medium max-w-lg mx-auto mb-10 ${isPaused ? 'text-amber-700/80' : 'text-rose-600/80'}`}>
          Toggling this switch will immediately pause the orchestrator. The queue will continue to fill with price/drift triggers, but no evaluations or trade executions will occur until resumed.
        </p>
        
        <button 
          onClick={togglePause}
          className={`px-10 py-5 rounded-2xl font-black text-lg tracking-wider uppercase transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1 flex items-center justify-center gap-3 mx-auto ${
            isPaused 
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-glow-emerald' 
              : 'bg-rose-600 hover:bg-rose-700 text-white'
          }`}
        >
          {isPaused ? (
            <>
              <PlayCircle size={24} />
              Resume Orchestrator
            </>
          ) : (
            <>
              <PauseCircle size={24} />
              Pause Orchestrator
            </>
          )}
        </button>
      </section>
    </div>
  );
};
