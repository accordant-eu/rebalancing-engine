import React, { useState } from 'react';
import { X, Building2, Check, Copy, ArrowRight, ShieldCheck, AlertCircle, Key, Palette } from 'lucide-react';

interface PartnerOnboardingModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccessLogin?: (email: string, password?: string) => void;
  brandPrimary?: string;
}

export const PartnerOnboardingModal: React.FC<PartnerOnboardingModalProps> = ({
  isOpen = true,
  onClose,
  onSuccessLogin,
  brandPrimary = '#0ea5e9',
}) => {
  const [form, setForm] = useState({
    firmName: '',
    tenantId: '',
    adminEmail: '',
    adminPassword: '',
    brokerType: 'MOCK',
    primaryColor: '#0ea5e9',
    accentColor: '#0284c7',
    portalTitle: '',
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [provisionedResult, setProvisionedResult] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFirmNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
    setForm(prev => ({
      ...prev,
      firmName: name,
      tenantId: prev.tenantId === '' || prev.tenantId === prev.firmName.toLowerCase().replace(/[^a-z0-9]/g, '-') ? slug : prev.tenantId,
      portalTitle: prev.portalTitle === '' ? `${name} Rebalancer` : prev.portalTitle,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/public/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: form.tenantId,
          firmName: form.firmName,
          adminEmail: form.adminEmail,
          adminPassword: form.adminPassword,
          brokerType: form.brokerType,
          branding: {
            brandName: form.firmName,
            primaryColor: form.primaryColor,
            accentColor: form.accentColor,
            portalTitle: form.portalTitle,
            supportEmail: form.adminEmail,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Partner provisioning failed');
      }

      setProvisionedResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to onboard partner firm');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-8 py-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-emerald-400">
              <Building2 size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Self-Serve Partner Onboarding
                <span className="text-xs uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold">
                  Zero-Touch
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Instantly provision an isolated tenant partition, issue initial M2M keys, and configure white-label branding.
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
              <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!provisionedResult ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Advisory Firm Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.firmName}
                    onChange={(e) => handleFirmNameChange(e.target.value)}
                    placeholder="e.g. Apex Wealth Management"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Tenant ID (Slug) *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.tenantId}
                    onChange={(e) => setForm({ ...form, tenantId: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                    placeholder="e.g. apex-wealth"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Admin Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                    placeholder="admin@apexwealth.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Initial Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={form.adminPassword}
                    onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                    placeholder="Min 8 characters"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Custodian Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Execution Custodian / Broker
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'MOCK', name: 'Mock Engine', desc: 'Simulated Sandbox' },
                    { id: 'ALPACA', name: 'Alpaca', desc: 'US Equities & Crypto' },
                    { id: 'IBKR', name: 'Interactive Brokers', desc: 'Multi-Asset Institutional' },
                  ].map((b) => (
                    <button
                      type="button"
                      key={b.id}
                      onClick={() => setForm({ ...form, brokerType: b.id })}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        form.brokerType === b.id
                          ? 'border-sky-500 bg-sky-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-800">{b.name}</div>
                      <div className="text-[11px] text-slate-500">{b.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* White-Label Branding Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette size={14} className="text-purple-600" />
                  White-Label Theme Customization
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Brand Portal Title</label>
                    <input
                      type="text"
                      value={form.portalTitle}
                      onChange={(e) => setForm({ ...form, portalTitle: e.target.value })}
                      placeholder="e.g. Apex Rebalancing Portal"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Primary Brand Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.primaryColor}
                        onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                        className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={form.primaryColor}
                        onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-700 uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ backgroundColor: brandPrimary }}
                  className="px-6 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-md hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? 'Provisioning Partition...' : 'Provision Tenant Workspace'}
                </button>
              </div>
            </form>
          ) : (
            /* Success State */
            <div className="space-y-6 text-center py-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-4 border-emerald-50">
                <ShieldCheck size={36} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-800">Tenant Provisioned Successfully!</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Your isolated tenant database partition is live with a default 60/40 model mandate and seeded portfolio.
                </p>
              </div>

              {/* M2M API Key Box */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl text-left border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Key size={14} className="text-amber-400" />
                    Machine-to-Machine API Secret Key
                  </span>
                  <span className="text-[10px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
                    Copy now (hidden later)
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl font-mono text-xs text-emerald-400 break-all border border-white/5">
                  <span>{provisionedResult.apiKey.secret}</span>
                  <button
                    onClick={() => copyToClipboard(provisionedResult.apiKey.secret)}
                    className="ml-3 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1 flex-shrink-0"
                    title="Copy API Key"
                  >
                    {copiedKey ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="text-slate-400 block font-semibold">Tenant Identifier</span>
                  <strong className="text-slate-800">{provisionedResult.tenant.tenantId}</strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="text-slate-400 block font-semibold">Admin Account</span>
                  <strong className="text-slate-800">{provisionedResult.user.email}</strong>
                </div>
              </div>

              {/* Proceed to Sign In */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (onSuccessLogin) {
                      onSuccessLogin(provisionedResult.user.email, form.adminPassword);
                    }
                    onClose();
                  }}
                  style={{ backgroundColor: brandPrimary }}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 hover:opacity-90 transition-all cursor-pointer"
                >
                  <span>Sign In to Your Workspace</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
