import React, { useState } from 'react';
import { X, Play, RotateCcw, Sparkles, ArrowRight, ShieldCheck, AlertTriangle, Layers, DollarSign } from 'lucide-react';

interface SandboxTarget {
  instrumentId: string;
  weight: number;
}

interface SandboxHolding {
  instrumentId: string;
  quantity: number;
}

interface MarketingSandboxModalProps {
  isOpen?: boolean;
  onClose: () => void;
  brandPrimary?: string;
}

const INSTRUMENT_METADATA: Record<string, { name: string; ticker: string }> = {
  'US0378331005:XNAS:USD': { name: 'Apple Inc.', ticker: 'AAPL' },
  'US5949181045:XNAS:USD': { name: 'Microsoft Corp.', ticker: 'MSFT' },
  'US38259P5089:XNAS:USD': { name: 'Alphabet Inc.', ticker: 'GOOG' },
};

export const formatInstrumentLabel = (id: string): string => {
  if (INSTRUMENT_METADATA[id]) {
    return `${INSTRUMENT_METADATA[id].name} (${INSTRUMENT_METADATA[id].ticker})`;
  }
  if (id.includes('US0378331005') || id.includes('AAPL')) return 'Apple Inc. (AAPL)';
  if (id.includes('US5949181045') || id.includes('MSFT')) return 'Microsoft Corp. (MSFT)';
  if (id.includes('US38259P5089') || id.includes('GOOG')) return 'Alphabet Inc. (GOOG)';
  return id;
};

export const MarketingSandboxModal: React.FC<MarketingSandboxModalProps> = ({
  isOpen = true,
  onClose,
  brandPrimary = '#0ea5e9',
}) => {
  const [cash, setCash] = useState<number>(25000);
  const [holdings, setHoldings] = useState<SandboxHolding[]>([
    { instrumentId: 'US0378331005:XNAS:USD', quantity: 150 }, // AAPL
    { instrumentId: 'US5949181045:XNAS:USD', quantity: 40 },  // MSFT
  ]);
  const [targets, setTargets] = useState<SandboxTarget[]>([
    { instrumentId: 'US0378331005:XNAS:USD', weight: 0.5 },
    { instrumentId: 'US5949181045:XNAS:USD', weight: 0.5 },
  ]);
  const [allowLeverage, setAllowLeverage] = useState<boolean>(false);
  const [driftTolerance, setDriftTolerance] = useState<number>(0.05);
  const [assumedSlippageBps, setAssumedSlippageBps] = useState<number>(5);

  const [loading, setLoading] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalTargetWeight = targets.reduce((sum, t) => sum + (Number(t.weight) || 0), 0);
  const isTargetValid = allowLeverage
    ? totalTargetWeight > 0 && totalTargetWeight <= 2.5
    : Math.abs(totalTargetWeight - 1.0) < 0.001;

  const handleRunSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/public/sandbox/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cash: Number(cash),
          holdings: holdings.filter(h => h.instrumentId.trim() !== '' && h.quantity > 0),
          targets: targets.filter(t => t.instrumentId.trim() !== '' && t.weight > 0),
          policy: {
            strategyType: 'manual',
            absoluteDriftTolerance: Number(driftTolerance),
            minimumTradeSize: 50,
            assumedSlippageBps: Number(assumedSlippageBps),
            allowLeverage,
            maxLeverageRatio: 2.0,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Simulation failed');
      }

      setSimulationResult(data);
    } catch (err: any) {
      setError(err.message || 'Error executing sandbox rebalance');
    } finally {
      setLoading(false);
    }
  };

  const resetToSample = () => {
    setCash(25000);
    setHoldings([
      { instrumentId: 'US0378331005:XNAS:USD', quantity: 150 },
      { instrumentId: 'US5949181045:XNAS:USD', quantity: 40 },
    ]);
    setTargets([
      { instrumentId: 'US0378331005:XNAS:USD', weight: 0.5 },
      { instrumentId: 'US5949181045:XNAS:USD', weight: 0.5 },
    ]);
    setSimulationResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-8 py-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-sky-400">
              <Sparkles size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Interactive Rebalancing Sandbox
                <span className="text-xs uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 font-semibold">
                  Ephemeral Engine
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Experience deterministic drift reduction, friction cost optimization, and trade proposals instantly without an account.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center gap-3">
              <AlertTriangle size={18} className="text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Initial Portfolio State */}
            <div className="p-6 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign size={14} className="text-teal-600" />
                  Initial Portfolio State
                </span>
                <button
                  onClick={resetToSample}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  Reset to Sample
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Uninvested Cash ($)</label>
                <input
                  type="number"
                  value={cash}
                  onChange={(e) => setCash(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Initial Holdings (Shares)</label>
                {holdings.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between min-w-0">
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        {formatInstrumentLabel(h.instrumentId)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                        {h.instrumentId.split(':')[0]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 w-28 shrink-0">
                      <input
                        type="number"
                        value={h.quantity}
                        onChange={(e) => {
                          const newH = [...holdings];
                          newH[i].quantity = Number(e.target.value);
                          setHoldings(newH);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 text-right"
                      />
                      <span className="text-xs text-slate-400 font-medium">shs</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Mandate Allocation */}
            <div className="p-6 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-sky-600" />
                  Target Allocation
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    isTargetValid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Sum: {(totalTargetWeight * 100).toFixed(0)}%
                </span>
              </div>

              <div className="space-y-2">
                {targets.map((t, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="flex-1 text-xs font-semibold text-slate-700 truncate">
                      {formatInstrumentLabel(t.instrumentId)}
                    </span>
                    <div className="flex items-center gap-1 w-28 shrink-0">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="200"
                        value={Math.round(t.weight * 100)}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const newT = [...targets];
                          newT[i].weight = val > 1 ? val / 100 : val;
                          setTargets(newT);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 text-right"
                      />
                      <span className="text-xs text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Drift Tolerance</label>
                  <select
                    value={driftTolerance}
                    onChange={(e) => setDriftTolerance(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <option value={0.02}>2% Strict Band</option>
                    <option value={0.05}>5% Standard Band</option>
                    <option value={0.10}>10% Relaxed Band</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Slippage Bps</label>
                  <input
                    type="number"
                    value={assumedSlippageBps}
                    onChange={(e) => setAssumedSlippageBps(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="sandbox-leverage"
                  type="checkbox"
                  checked={allowLeverage}
                  onChange={(e) => setAllowLeverage(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="sandbox-leverage" className="text-xs text-slate-600 font-medium cursor-pointer">
                  Enable Margin & Leveraged Targets (&gt;100%)
                </label>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={handleRunSimulation}
              disabled={loading || !isTargetValid}
              style={{ backgroundColor: brandPrimary }}
              className="px-6 py-3 rounded-2xl text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-sky-500/20 hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>Running Math Core...</>
              ) : (
                <>
                  <Play size={16} fill="currentColor" />
                  Run Rebalance Simulation
                </>
              )}
            </button>
          </div>

          {/* Results Display */}
          {simulationResult && (
            <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Deterministic Evaluation Metrics</h4>
                    <p className="text-xs text-slate-400">Validated against pure domain mathematical invariants</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-3 py-1 bg-white/10 rounded-full font-semibold text-emerald-300">
                    {simulationResult.summary.totalTrades} Trades Proposed
                  </span>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Initial Equity
                  </span>
                  <span className="text-xl font-extrabold text-white">
                    ${simulationResult.initialValuation.totalEquity.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Drift Reduction
                  </span>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-xl">
                    <span>{(simulationResult.summary.maxDriftBefore * 100).toFixed(1)}%</span>
                    <ArrowRight size={14} className="text-slate-400" />
                    <span>{(simulationResult.summary.maxDriftAfter * 100).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Turnover Rate
                  </span>
                  <span className="text-xl font-extrabold text-sky-400">
                    {(simulationResult.summary.turnoverRate * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Est. Friction Cost
                  </span>
                  <span className="text-xl font-extrabold text-amber-400">
                    ${simulationResult.summary.estimatedFrictionValue.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Proposed Trades Table */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Proposed Order Book
                </h5>
                <div className="space-y-2">
                  {simulationResult.proposal.trades.map((t: any, i: number) => (
                    <div
                      key={i}
                      className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-black px-2 py-0.5 rounded-md ${
                            t.direction === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {t.direction}
                        </span>
                        <span className="font-mono text-slate-300 font-semibold">{t.instrumentId}</span>
                      </div>
                      <div className="flex items-center gap-6 text-slate-200">
                        <span>Quantity: <strong>{t.quantity.toFixed(2)}</strong></span>
                        <span>Estimated Value: <strong>${t.estimatedValue.toFixed(2)}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendation Narrative */}
              {simulationResult.explanation?.narrative && (
                <div className="p-4 bg-sky-950/40 border border-sky-800/40 rounded-2xl text-xs text-sky-200">
                  <span className="font-bold block mb-1 text-sky-300">Deterministic Engine Recommendation:</span>
                  {simulationResult.explanation.narrative}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
