import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { ModelMandate } from '../types';
import { AssetPicker } from './AssetPicker';

interface MandateBuilderFormProps {
  initialData?: Partial<ModelMandate>;
  token?: string;
  onSubmit: (data: Partial<ModelMandate>) => void;
  onCancel?: () => void;
}

export const MandateBuilderForm: React.FC<MandateBuilderFormProps> = ({ initialData, token, onSubmit, onCancel }) => {
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const { register, control, handleSubmit, watch } = useForm<Partial<ModelMandate>>({
    defaultValues: {
      name: initialData?.name || '',
      archetype: initialData?.archetype || 'StaticWeights',
      evaluationFrequency: initialData?.evaluationFrequency || 'daily',
      targetAllocation: initialData?.targetAllocation || { targets: [{ instrumentId: '', weight: 0 }], cashBuffer: 0 },
      policy: initialData?.policy || {
        absoluteDriftTolerance: 0.05,
        minimumTradeSize: 10,
        driftUtilityConversionRate: 1.0,
        executionTargetMode: 'boundary',
        depositAllocationMode: 'REBALANCING'
      },
      constraints: initialData?.constraints || []
    }
  });

  const { fields: targetFields, append: appendTarget, remove: removeTarget } = useFieldArray({
    control,
    name: "targetAllocation.targets" as const
  });

  const { fields: constraintFields, append: appendConstraint, remove: removeConstraint } = useFieldArray({
    control,
    name: "constraints" as const
  });

  const selectedArchetype = watch('archetype');

  const onFormSubmit = (data: any) => {
    // Clean up data
    if (data.targetAllocation) {
      if (data.targetAllocation.targets) {
        data.targetAllocation.targets = data.targetAllocation.targets.map((t: any) => ({
          ...t,
          weight: parseFloat(t.weight)
        }));
      }
      if (data.targetAllocation.cashBuffer) {
        data.targetAllocation.cashBuffer = parseFloat(data.targetAllocation.cashBuffer);
      }
      
      if (selectedArchetype === 'StaticWeights') {
        const assetSum = data.targetAllocation.targets?.reduce((acc: number, t: any) => acc + t.weight, 0) || 0;
        const totalSum = assetSum + (data.targetAllocation.cashBuffer || 0);
        if (Math.abs(totalSum - 1.0) > 0.0001) {
          setErrorMsg(`Target weights (assets + cash buffer) must sum exactly to 1.0 (100%). Current sum: ${totalSum.toFixed(4)}`);
          return;
        }
      }
    }
    setErrorMsg(null);
    if (data.policy) {
      data.policy.absoluteDriftTolerance = parseFloat(data.policy.absoluteDriftTolerance);
      data.policy.minimumTradeSize = parseFloat(data.policy.minimumTradeSize);
      if (data.policy.driftUtilityConversionRate) {
        data.policy.driftUtilityConversionRate = parseFloat(data.policy.driftUtilityConversionRate);
      }
      if (data.policy.maxFrictionBps) {
        data.policy.maxFrictionBps = parseFloat(data.policy.maxFrictionBps);
      }
    }
    if (data.constraints) {
      data.constraints = data.constraints.map((c: any) => {
        if (c.type === 'ConcentrationLimit' && c.parameters?.maxWeight) {
          c.parameters.maxWeight = parseFloat(c.parameters.maxWeight);
        }
        return c;
      });
    }
    onSubmit(data as Partial<ModelMandate>);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Core Mandate Identity */}
      <div className="panel" style={{ border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'white' }}>1. Identity & Strategy</h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <label className="metricLabel">Mandate Name</label>
            <input required {...register('name')} placeholder="e.g. Aggressive Growth" className="formInput" />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label className="metricLabel">Strategy Archetype</label>
            <select {...register('archetype')} className="formInput">
              <option value="StaticWeights">Static Weights</option>
              <option value="EfficientFrontier" disabled>Efficient Frontier (Coming Soon)</option>
              <option value="MinimumVariance" disabled>Minimum Variance (Coming Soon)</option>
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label className="metricLabel">Evaluation Frequency</label>
            <select {...register('evaluationFrequency')} className="formInput">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="realtime">Real-time (Intraday)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Target Configuration */}
      <div className="panel" style={{ border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'white' }}>2. Target Configuration</h3>
        {selectedArchetype === 'StaticWeights' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 50px', gap: '8px', marginBottom: '8px' }}>
              <label className="metricLabel">Asset Ticker</label>
              <label className="metricLabel">Target Weight (e.g. 0.6)</label>
              <div></div>
            </div>
            {targetFields.map((field, index) => (
              <div key={field.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 50px', gap: '8px', marginBottom: '8px' }}>
                <AssetPicker required {...register(`targetAllocation.targets.${index}.instrumentId`)} token={token || ''} />
                <input required type="number" step="0.01" max="1" min="0" {...register(`targetAllocation.targets.${index}.weight`)} placeholder="0.6" className="formInput" />
                <button type="button" onClick={() => removeTarget(index)} style={{ background: 'var(--status-red)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>X</button>
              </div>
            ))}
            <button type="button" onClick={() => appendTarget({ instrumentId: '', weight: 0 })} style={{ padding: '8px 16px', background: 'transparent', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)', borderRadius: '4px', cursor: 'pointer', marginTop: '8px' }}>
              + Add Target Asset
            </button>
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <label className="metricLabel">Cash Buffer (e.g. 0.1 for 10%)</label>
              <input type="number" step="0.01" max="1" min="0" {...register('targetAllocation.cashBuffer')} placeholder="0.0" className="formInput" style={{ maxWidth: '200px', display: 'block' }} />
            </div>
          </div>
        )}
      </div>

      {/* 3. Execution Policy & Friction */}
      <div className="panel" style={{ border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'white' }}>3. Execution Policy & Friction</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          <div>
            <label className="metricLabel">Absolute Drift Tolerance</label>
            <input required type="number" step="0.01" {...register('policy.absoluteDriftTolerance')} placeholder="0.05" className="formInput" title="How far an asset can drift before triggering evaluation." />
          </div>
          <div>
            <label className="metricLabel">Execution Target Mode</label>
            <select {...register('policy.executionTargetMode')} className="formInput" title="Boundary limits TCO. Full Reset minimizes tracking error.">
              <option value="boundary">Boundary (Optimal TCO)</option>
              <option value="full_reset">Full Reset</option>
            </select>
          </div>
          <div>
            <label className="metricLabel">Deposit Allocation Mode</label>
            <select {...register('policy.depositAllocationMode')} className="formInput">
              <option value="REBALANCING">Rebalancing (Default)</option>
              <option value="CURRENT_WEIGHT">Current Weight (Ride Momentum)</option>
              <option value="FIXED_TARGET">Fixed Target (Naive)</option>
            </select>
          </div>
          <div>
            <label className="metricLabel">Min Trade Size ($)</label>
            <input required type="number" step="1" {...register('policy.minimumTradeSize')} placeholder="10" className="formInput" />
          </div>
          <div>
            <label className="metricLabel">Utility Conversion Rate <span title="How many bps of drift reduction justify 1 bps of TCO. Default 1.0.">ℹ️</span></label>
            <input type="number" step="0.1" {...register('policy.driftUtilityConversionRate')} placeholder="1.0" className="formInput" />
          </div>
          <div>
            <label className="metricLabel">Max Friction (bps) Optional</label>
            <input type="number" step="1" {...register('policy.maxFrictionBps')} placeholder="50" className="formInput" />
          </div>
        </div>
      </div>

      {/* 4. Constraints / Overlays */}
      <div className="panel" style={{ border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'white' }}>4. Constraints & Overlays</h3>
        {constraintFields.map((field: any, index) => (
          <div key={field.id} style={{ display: 'flex', gap: '16px', marginBottom: '8px', alignItems: 'center' }}>
            <select {...register(`constraints.${index}.type`)} className="formInput" style={{ width: '200px' }}>
              <option value="ConcentrationLimit">Concentration Limit</option>
            </select>
            <input type="number" step="0.01" {...register(`constraints.${index}.parameters.maxWeight`)} placeholder="Max Weight (e.g. 0.1 for 10%)" className="formInput" style={{ flex: 1 }} />
            <button type="button" onClick={() => removeConstraint(index)} style={{ background: 'var(--status-red)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '8px 12px' }}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => appendConstraint({ type: 'ConcentrationLimit', parameters: { maxWeight: 0.1 } })} style={{ padding: '8px 16px', background: 'transparent', color: 'var(--status-yellow)', border: '1px solid var(--status-yellow)', borderRadius: '4px', cursor: 'pointer', marginTop: '8px' }}>
          + Add Constraint
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: '12px', background: 'var(--status-red)', color: 'white', borderRadius: '4px', marginTop: '16px' }}>
          <strong>Validation Error:</strong> {errorMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '16px' }}>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{ padding: '12px 24px', background: 'transparent', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Cancel
          </button>
        )}
        <button type="submit" style={{ padding: '12px 24px', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Save Mandate
        </button>
      </div>

      <style>{`
        .formInput {
          width: 100%;
          padding: 10px;
          background: rgba(0,0,0,0.2);
          color: white;
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          margin-top: 4px;
          box-sizing: border-box;
        }
        .formInput:focus {
          outline: none;
          border-color: var(--accent-blue);
        }
      `}</style>
    </form>
  );
};
