import React, { useState } from 'react';
import { MandateBuilderForm } from '../MandateBuilderForm';
import { Cpu, Library, AlertCircle } from 'lucide-react';

export const RebalancingModelsTab: React.FC<{ token: string }> = ({ token }) => {
  const [archetype, setArchetype] = useState('StaticWeights');

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-12">
      
      {/* Archetype Config Engine */}
      <section className="bg-white border border-purple-200/60 rounded-2xl p-8 shadow-soft transition-all duration-300 hover:shadow-soft-hover relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-purple-600 transform translate-x-4 -translate-y-4">
          <Cpu size={120} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl shadow-sm border border-purple-100">
              <Cpu size={22} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Archetype Configuration Engine</h2>
          </div>
          <p className="text-slate-500 font-medium max-w-2xl mb-8 leading-relaxed">
            Select the underlying mathematical archetype for this model. Some advanced archetypes (like MPT) require asynchronous optimizer execution via our quantitative backend.
          </p>
          
          <div className="max-w-md">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Mathematical Archetype</label>
            <select 
              value={archetype}
              onChange={(e) => setArchetype(e.target.value)}
              className="w-full px-4 py-3 bg-purple-50/30 border border-purple-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-sm cursor-pointer mb-4"
            >
              <option value="StaticWeights">Static Weights (Threshold Rebalancing)</option>
              <option value="EfficientFrontier">Efficient Frontier / MPT (Optimizer Driven)</option>
              <option value="VaR">Value at Risk (VaR) Targeting</option>
              <option value="BlackLitterman">Black-Litterman Model</option>
            </select>

            {archetype !== 'StaticWeights' && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start gap-3 shadow-sm">
                <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium leading-relaxed">
                  <strong>Advanced Archetype Selected.</strong> Target allocations will be generated asynchronously by the Optimizer Engine rather than defined statically.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Global Mandate Library */}
      <section className="bg-white border border-slate-200/60 rounded-2xl shadow-soft overflow-hidden transition-all duration-300 hover:shadow-soft-hover">
        <div className="px-8 py-6 border-b border-slate-200/60 bg-slate-50/50 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-2">
            <Library size={20} className="text-sky-500" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Global Mandate Library</h2>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Define baseline models that any provisioned advisory firm can subscribe to, or inspect bespoke overrides.
          </p>
        </div>
        
        <div className="p-8">
          <MandateBuilderForm 
            token={token}
            onSubmit={async (data) => {
              const modelPayload = {
                ...data,
                modelId: `model-${Date.now()}`
              };
              try {
                const res = await fetch('/api/models', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(modelPayload)
                });
                if (!res.ok) {
                  const err = await res.json();
                  alert(`Error: ${err.error}`);
                } else {
                  alert('Model saved successfully!');
                }
              } catch (err: any) {
                alert(`Error: ${err.message}`);
              }
            }}
          />
        </div>
      </section>
    </div>
  );
};
