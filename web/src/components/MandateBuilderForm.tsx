import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { ModelMandate } from '../types';
import { AssetPicker } from './AssetPicker';
import { Settings, Target, Zap, Shield, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  const inputClasses = "w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm";
  const labelClasses = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2";

  return (
    <motion.form 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit(onFormSubmit)} 
      className="flex flex-col gap-6"
    >
      
      {/* 1. Core Mandate Identity */}
      <div className="p-6 rounded-2xl border border-slate-200/60 bg-white shadow-soft transition-all duration-300 hover:shadow-soft-hover">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <Settings size={20} className="text-sky-500" />
          <h3 className="text-lg font-bold text-slate-900 m-0 tracking-tight">1. Identity & Strategy</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <label className={labelClasses}>Mandate Name</label>
            <input required {...register('name')} placeholder="e.g. Aggressive Growth" className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>Strategy Archetype</label>
            <select {...register('archetype')} className={`${inputClasses} cursor-pointer`}>
              <option value="StaticWeights">Static Weights</option>
              <option value="EfficientFrontier" disabled>Efficient Frontier (Coming Soon)</option>
              <option value="MinimumVariance" disabled>Minimum Variance (Coming Soon)</option>
            </select>
          </div>
          <div>
            <label className={labelClasses}>Evaluation Frequency</label>
            <select {...register('evaluationFrequency')} className={`${inputClasses} cursor-pointer`}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="realtime">Real-time (Intraday)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Target Configuration */}
      <div className="p-6 rounded-2xl border border-slate-200/60 bg-white shadow-soft transition-all duration-300 hover:shadow-soft-hover">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <Target size={20} className="text-sky-500" />
          <h3 className="text-lg font-bold text-slate-900 m-0 tracking-tight">2. Target Configuration</h3>
        </div>
        {selectedArchetype === 'StaticWeights' && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[1fr_1fr_50px] gap-4 mb-2">
              <label className={labelClasses}>Asset Ticker</label>
              <label className={labelClasses}>Target Weight (e.g. 0.6)</label>
              <div></div>
            </div>
            <AnimatePresence>
              {targetFields.map((field, index) => (
                <motion.div 
                  key={field.id} 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  className="grid grid-cols-[1fr_1fr_50px] gap-4 items-center group"
                >
                  <AssetPicker required {...register(`targetAllocation.targets.${index}.instrumentId`)} token={token || ''} />
                  <input required type="number" step="0.01" max="1" min="0" {...register(`targetAllocation.targets.${index}.weight`)} placeholder="0.6" className={inputClasses} />
                  <button type="button" onClick={() => removeTarget(index)} className="h-10 w-10 flex items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50">
                    <X size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            <button type="button" onClick={() => appendTarget({ instrumentId: '', weight: 0 })} className="self-start mt-2 px-4 py-2 border-2 border-dashed border-sky-200 text-sky-600 hover:bg-sky-50 hover:border-sky-300 font-semibold rounded-xl transition-all flex items-center gap-2 text-sm">
              <Plus size={16} /> Add Target Asset
            </button>
            <div className="mt-6 pt-6 border-t border-slate-100 w-full sm:w-1/2">
              <label className={labelClasses}>Cash Buffer (e.g. 0.1 for 10%)</label>
              <input type="number" step="0.01" max="1" min="0" {...register('targetAllocation.cashBuffer')} placeholder="0.0" className={inputClasses} />
            </div>
          </div>
        )}
      </div>

      {/* 3. Execution Policy & Friction */}
      <div className="p-6 rounded-2xl border border-slate-200/60 bg-white shadow-soft transition-all duration-300 hover:shadow-soft-hover">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <Zap size={20} className="text-sky-500" />
          <h3 className="text-lg font-bold text-slate-900 m-0 tracking-tight">3. Execution Policy & Friction</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className={labelClasses}>Absolute Drift Tolerance</label>
            <input required type="number" step="0.01" {...register('policy.absoluteDriftTolerance')} placeholder="0.05" className={inputClasses} title="How far an asset can drift before triggering evaluation." />
          </div>
          <div>
            <label className={labelClasses}>Execution Target Mode</label>
            <select {...register('policy.executionTargetMode')} className={`${inputClasses} cursor-pointer`} title="Boundary limits TCO. Full Reset minimizes tracking error.">
              <option value="boundary">Boundary (Optimal TCO)</option>
              <option value="full_reset">Full Reset</option>
            </select>
          </div>
          <div>
            <label className={labelClasses}>Deposit Allocation Mode</label>
            <select {...register('policy.depositAllocationMode')} className={`${inputClasses} cursor-pointer`}>
              <option value="REBALANCING">Rebalancing (Default)</option>
              <option value="CURRENT_WEIGHT">Current Weight (Ride Momentum)</option>
              <option value="FIXED_TARGET">Fixed Target (Naive)</option>
            </select>
          </div>
          <div>
            <label className={labelClasses}>Min Trade Size ($)</label>
            <input required type="number" step="1" {...register('policy.minimumTradeSize')} placeholder="10" className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>Utility Conversion Rate <span title="How many bps of drift reduction justify 1 bps of TCO. Default 1.0.">ℹ️</span></label>
            <input type="number" step="0.1" {...register('policy.driftUtilityConversionRate')} placeholder="1.0" className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>Max Friction (bps) Optional</label>
            <input type="number" step="1" {...register('policy.maxFrictionBps')} placeholder="50" className={inputClasses} />
          </div>
        </div>
      </div>

      {/* 4. Constraints / Overlays */}
      <div className="p-6 rounded-2xl border border-slate-200/60 bg-white shadow-soft transition-all duration-300 hover:shadow-soft-hover">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <Shield size={20} className="text-sky-500" />
          <h3 className="text-lg font-bold text-slate-900 m-0 tracking-tight">4. Constraints & Overlays</h3>
        </div>
        <div className="flex flex-col gap-4">
          <AnimatePresence>
            {constraintFields.map((field: any, index) => (
              <motion.div 
                key={field.id} 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                className="flex flex-col sm:flex-row gap-4 items-center group"
              >
                <select {...register(`constraints.${index}.type`)} className={`${inputClasses} sm:w-[250px] cursor-pointer`}>
                  <option value="ConcentrationLimit">Concentration Limit</option>
                </select>
                <input type="number" step="0.01" {...register(`constraints.${index}.parameters.maxWeight`)} placeholder="Max Weight (e.g. 0.1 for 10%)" className={inputClasses} />
                <button type="button" onClick={() => removeConstraint(index)} className="h-10 px-4 flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-semibold whitespace-nowrap">
                  Remove
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          <button type="button" onClick={() => appendConstraint({ type: 'ConcentrationLimit', parameters: { maxWeight: 0.1 } })} className="self-start mt-2 px-4 py-2 border-2 border-dashed border-sky-200 text-sky-600 hover:bg-sky-50 hover:border-sky-300 font-semibold rounded-xl transition-all flex items-center gap-2 text-sm">
            <Plus size={16} /> Add Constraint
          </button>
        </div>
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-medium flex items-center gap-2"
          >
            <Shield size={18} />
            <strong>Validation Error:</strong> {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-4 justify-end mt-4">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-200">
            Cancel
          </button>
        )}
        <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold tracking-wide hover:bg-indigo-700 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
          Save Mandate
        </button>
      </div>
    </motion.form>
  );
};

