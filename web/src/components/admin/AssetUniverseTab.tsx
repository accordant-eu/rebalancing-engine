import React, { useState, useEffect } from 'react';
import { Database, Plus, Search } from 'lucide-react';

interface Asset {
  instrumentId: string;
  isin: string;
  ticker: string;
  exchangeMic: string;
  currency: string;
}

export const AssetUniverseTab: React.FC<{ token: string }> = ({ token }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [form, setForm] = useState({
    instrumentId: '',
    isin: '',
    ticker: '',
    exchangeMic: 'XNAS',
    currency: 'USD'
  });

  const fetchAssets = async () => {
    const res = await fetch('/api/admin/assets', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setAssets(await res.json());
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form)
    });
    setForm({ instrumentId: '', isin: '', ticker: '', exchangeMic: 'XNAS', currency: 'USD' });
    fetchAssets();
  };

  const inputClasses = "w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm";
  const labelClasses = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2";

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-12">
      
      {/* Add New Asset */}
      <section className="bg-white border border-slate-200/60 rounded-2xl p-8 shadow-soft transition-all duration-300 hover:shadow-soft-hover">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm border border-emerald-100">
            <Plus size={20} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Register New Asset</h2>
        </div>
        
        <form onSubmit={handleCreateAsset} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 items-end">
          <div className="lg:col-span-2">
            <label className={labelClasses}>Primary Key (e.g. US...05:XNAS:USD)</label>
            <input className={inputClasses} placeholder="Instrument ID" value={form.instrumentId} onChange={e => setForm({...form, instrumentId: e.target.value})} required />
          </div>
          <div>
            <label className={labelClasses}>ISIN</label>
            <input className={inputClasses} placeholder="US0378331005" value={form.isin} onChange={e => setForm({...form, isin: e.target.value})} required />
          </div>
          <div>
            <label className={labelClasses}>Ticker</label>
            <input className={inputClasses} placeholder="AAPL" value={form.ticker} onChange={e => setForm({...form, ticker: e.target.value})} required />
          </div>
          <div className="lg:col-span-1 hidden lg:block"></div> {/* Spacer */}
          
          <div>
            <label className={labelClasses}>Exchange MIC</label>
            <input className={inputClasses} placeholder="XNAS" value={form.exchangeMic} onChange={e => setForm({...form, exchangeMic: e.target.value})} required />
          </div>
          <div>
            <label className={labelClasses}>Currency</label>
            <input className={inputClasses} placeholder="USD" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} required />
          </div>
          
          <div className="md:col-span-2 lg:col-span-3 flex justify-end">
            <button className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold tracking-wide shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all w-full md:w-auto" type="submit">
              Add Asset to Universe
            </button>
          </div>
        </form>
      </section>

      {/* Global Asset Universe */}
      <section className="bg-white border border-slate-200/60 rounded-2xl shadow-soft overflow-hidden transition-all duration-300 hover:shadow-soft-hover flex flex-col h-[600px]">
        <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50/50 backdrop-blur-md flex items-center gap-3">
          <Database size={18} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Global Asset Universe</h2>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200/60 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px]">Instrument ID</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px]">ISIN</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px]">Ticker</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px]">Exchange MIC</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px]">Currency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.map(a => (
                <tr key={a.instrumentId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 text-sky-600 font-mono text-xs font-semibold">{a.instrumentId}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">{a.isin}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-xs font-bold tracking-wide text-slate-800">{a.ticker}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{a.exchangeMic}</td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{a.currency}</td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Search size={32} className="mx-auto mb-3 opacity-20" />
                    <span className="font-medium">No assets found in the universe</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
