import React, { useState, useEffect } from 'react';
import './Admin.css';

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
    <div className="admin-container">
      <section className="admin-section admin-ops-queue">
        <h2 className="admin-section-title">Live Evaluation Queue Depth</h2>
        <div className="admin-ops-number">{queueDepth}</div>
        <p className="admin-section-subtitle">Number of portfolios currently awaiting execution by the Orchestrator loop.</p>
      </section>

      <section className="admin-section admin-pause-box">
        <h2 className="admin-section-title" style={{ color: 'var(--status-red)' }}>Emergency Circuit Breaker</h2>
        <p className="admin-section-subtitle" style={{ maxWidth: '600px', margin: '0 auto' }}>
          Toggling this switch will immediately pause the orchestrator. The queue will continue to fill with price/drift triggers, but no evaluations or trade executions will occur until resumed.
        </p>
        <button 
          onClick={togglePause}
          className={`admin-pause-btn ${isPaused ? 'paused' : ''}`}
        >
          {isPaused ? 'RESUME ORCHESTRATOR' : 'PAUSE ORCHESTRATOR'}
        </button>
      </section>
    </div>
  );
};
