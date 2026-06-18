import React, { useState } from 'react';
import { MandateBuilderForm } from '../MandateBuilderForm';

export const RebalancingModelsTab: React.FC<{ token: string }> = ({ token }) => {
  const [archetype, setArchetype] = useState('StaticWeights');

  return (
    <div className="space-y-8">
      <section className="bg-[#1C1F26] p-6 rounded">
        <h2 className="text-xl font-bold mb-4 text-purple-400">Archetype Configuration Engine</h2>
        <p className="text-gray-400 mb-4 text-sm">
          Select the underlying mathematical archetype for this model. Some advanced archetypes (like MPT) require asynchronous optimizer execution.
        </p>
        
        <select 
          value={archetype}
          onChange={(e) => setArchetype(e.target.value)}
          className="p-3 bg-[#0F1115] border border-purple-500/50 rounded w-full text-lg mb-6"
        >
          <option value="StaticWeights">Static Weights (Threshold Rebalancing)</option>
          <option value="EfficientFrontier">Efficient Frontier / MPT (Optimizer Driven)</option>
          <option value="VaR">Value at Risk (VaR) Targeting</option>
          <option value="BlackLitterman">Black-Litterman Model</option>
        </select>

        {archetype !== 'StaticWeights' && (
          <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded text-purple-200">
            <strong>Note:</strong> You have selected an advanced archetype. Target allocations will be generated asynchronously by the Optimizer Engine rather than defined statically.
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Global Mandate Library</h2>
        <p className="text-gray-400 mb-6 text-sm">
          Define baseline models that any provisioned advisory firm can subscribe to, or inspect bespoke overrides.
        </p>
        {/* We reuse the existing MandateBuilderForm to allow creating a model */}
        {/* We pass a special prop or just use it as is for MVP */}
        <MandateBuilderForm 
          accountId="baseline-system-model" 
          onSave={() => alert('Baseline model saved globally.')} 
        />
      </section>
    </div>
  );
};
