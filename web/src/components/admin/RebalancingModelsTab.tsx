import React, { useState } from 'react';
import { MandateBuilderForm } from '../MandateBuilderForm';
import './Admin.css';

export const RebalancingModelsTab: React.FC<{ token: string }> = ({ token }) => {
  const [archetype, setArchetype] = useState('StaticWeights');

  return (
    <div className="admin-container">
      <section className="admin-section">
        <h2 className="admin-section-title" style={{ color: '#c4b5fd' }}>Archetype Configuration Engine</h2>
        <p className="admin-section-subtitle">
          Select the underlying mathematical archetype for this model. Some advanced archetypes (like MPT) require asynchronous optimizer execution.
        </p>
        
        <select 
          value={archetype}
          onChange={(e) => setArchetype(e.target.value)}
          className="admin-input"
          style={{ marginBottom: '24px', borderColor: 'rgba(139, 92, 246, 0.5)' }}
        >
          <option value="StaticWeights">Static Weights (Threshold Rebalancing)</option>
          <option value="EfficientFrontier">Efficient Frontier / MPT (Optimizer Driven)</option>
          <option value="VaR">Value at Risk (VaR) Targeting</option>
          <option value="BlackLitterman">Black-Litterman Model</option>
        </select>

        {archetype !== 'StaticWeights' && (
          <div className="admin-highlight-box">
            <strong>Note:</strong> You have selected an advanced archetype. Target allocations will be generated asynchronously by the Optimizer Engine rather than defined statically.
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">Global Mandate Library</h2>
        <p className="admin-section-subtitle">
          Define baseline models that any provisioned advisory firm can subscribe to, or inspect bespoke overrides.
        </p>
        <MandateBuilderForm 
          accountId="baseline-system-model" 
          onSave={() => alert('Baseline model saved globally.')} 
        />
      </section>
    </div>
  );
};
