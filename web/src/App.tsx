import { useEffect, useState } from 'react';
import './App.css';

interface Target {
  instrumentId: string;
  weight: number;
}

interface Position {
  instrumentId: string;
  quantity: number;
}

interface StatePayload {
  portfolioState: {
    cash: number;
    positions: Position[];
  };
  priceSnapshot: {
    prices: Record<string, number>;
  };
  targetAllocation: {
    targets: Target[];
  };
  policy: {
    type: string;
    thresholds?: {
      absolute?: number;
      relative?: number;
    }
  };
}

function App() {
  const [state, setState] = useState<StatePayload | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          setState(data);
        }
      } catch (e) {
        console.error('Failed to fetch state', e);
      }
    };

    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/logs');
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (e) {
        console.error('Failed to fetch logs', e);
      }
    };

    fetchState();
    fetchLogs();
    const interval = setInterval(() => {
      fetchState();
      fetchLogs();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const calculateHoldings = () => {
    if (!state) return [];
    
    const { portfolioState, priceSnapshot, targetAllocation } = state;
    
    // Calculate total equity
    let totalEquity = portfolioState.cash;
    const currentValues: Record<string, number> = {};
    
    portfolioState.positions.forEach(p => {
      const price = priceSnapshot.prices[p.instrumentId] || 0;
      const value = p.quantity * price;
      currentValues[p.instrumentId] = value;
      totalEquity += value;
    });

    return targetAllocation.targets.map(t => {
      const targetWeight = t.weight;
      const currentValue = currentValues[t.instrumentId] || 0;
      const currentWeight = totalEquity > 0 ? currentValue / totalEquity : 0;
      const drift = currentWeight - targetWeight;
      
      const absoluteThreshold = state.policy.thresholds?.absolute || 0.05; // default 5%
      const driftPercent = (drift * 100).toFixed(2);
      
      // Calculate bar width for visualization
      const maxDriftDisplay = absoluteThreshold * 2; // Show up to 2x threshold
      const normalizedDrift = Math.min(Math.max(drift / maxDriftDisplay, -1), 1);
      
      const barStyle = {
        left: normalizedDrift < 0 ? `${50 + normalizedDrift * 50}%` : '50%',
        width: `${Math.abs(normalizedDrift) * 50}%`,
      };

      return {
        symbol: t.instrumentId,
        targetWeight: (targetWeight * 100).toFixed(1),
        currentWeight: (currentWeight * 100).toFixed(1),
        drift: driftPercent,
        value: currentValue.toFixed(2),
        isPositive: drift > 0,
        barStyle,
        isBreached: Math.abs(drift) > absoluteThreshold
      };
    });
  };

  const holdings = calculateHoldings();

  return (
    <div className="appContainer">
      <header className="header">
        <div className="headerTitle">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          Command Center (Live Agent v3)
        </div>
        <div className="statusIndicator">
          <div className="statusDot"></div>
          {state ? 'Connected to Engine' : 'Reconnecting...'}
        </div>
      </header>

      <main className="mainContent">
        <div className="panel">
          <div className="panelHeader">Live Portfolio Drift</div>
          <div className="panelBody holdingsGrid">
            {holdings.length === 0 && <div className="metricLabel">Waiting for state...</div>}
            {holdings.map(h => (
              <div className="holdingRow" key={h.symbol} style={{ borderColor: h.isBreached ? 'var(--status-red)' : '' }}>
                <div className="holdingSymbol">{h.symbol}</div>
                <div className="holdingMetrics">
                  <div className="metricGroup">
                    <span className="metricLabel">Target vs Current</span>
                    <span className="metricValue">{h.targetWeight}% → {h.currentWeight}%</span>
                  </div>
                  
                  <div className="driftBarContainer">
                    <div className="driftBarCenter"></div>
                    <div 
                      className={`driftBarFill ${h.isPositive ? 'driftPositive' : 'driftNegative'}`}
                      style={h.barStyle}
                    ></div>
                  </div>
                  
                  <div className="metricGroup">
                    <span className="metricLabel">Absolute Drift</span>
                    <span className="metricValue" style={{ color: h.isPositive ? 'var(--status-green)' : 'var(--status-red)' }}>
                      {h.isPositive ? '+' : ''}{h.drift}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">JSONL Audit Tail (Live)</div>
          <div className="panelBody logContainer">
            {logs.length === 0 && <div>Waiting for logs...</div>}
            {logs.slice().reverse().map((log, i) => (
              <div className="logEntry" key={i}>
                <span className="logTime">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="logEvent">[{log.type}]</span>
                <span className="logData">
                  {log.proposal ? `Proposed ${log.proposal.trades.length} trades` : JSON.stringify(log.context || {})}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
