import React, { useState, useEffect } from 'react';

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
    <div className="space-y-8">
      <section className="bg-[#1C1F26] p-6 rounded text-center">
        <h2 className="text-xl font-bold mb-2">Live Evaluation Queue Depth</h2>
        <div className="text-6xl font-light text-blue-400 mb-4">{queueDepth}</div>
        <p className="text-sm text-gray-400">Number of portfolios currently awaiting execution by the Orchestrator loop.</p>
      </section>

      <section className="bg-[#1C1F26] p-6 rounded flex flex-col items-center border border-red-500/30">
        <h2 className="text-xl font-bold mb-4 text-red-400">Emergency Circuit Breaker</h2>
        <p className="text-gray-400 mb-6 text-center max-w-lg">
          Toggling this switch will immediately pause the orchestrator. The queue will continue to fill with price/drift triggers, but no evaluations or trade executions will occur until resumed.
        </p>
        <button 
          onClick={togglePause}
          className={`px-8 py-4 rounded font-bold text-xl transition-colors ${
            isPaused 
              ? 'bg-green-600 hover:bg-green-500 text-white' 
              : 'bg-red-600 hover:bg-red-500 text-white'
          }`}
        >
          {isPaused ? 'RESUME ORCHESTRATOR' : 'PAUSE ORCHESTRATOR'}
        </button>
      </section>
    </div>
  );
};
