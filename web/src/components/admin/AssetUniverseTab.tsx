import React, { useState, useEffect } from 'react';
import './Admin.css';

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

  return (
    <div className="admin-container">
      <section className="admin-section">
        <h2 className="admin-section-title">Add New Asset</h2>
        <form onSubmit={handleCreateAsset} className="admin-form-grid">
          <input className="admin-input" placeholder="Primary Key (e.g. US0378331005:XNAS:USD or UUID)" value={form.instrumentId} onChange={e => setForm({...form, instrumentId: e.target.value})} required />
          <input className="admin-input" placeholder="ISIN (e.g. US0378331005)" value={form.isin} onChange={e => setForm({...form, isin: e.target.value})} required />
          <input className="admin-input" placeholder="Ticker (e.g. AAPL)" value={form.ticker} onChange={e => setForm({...form, ticker: e.target.value})} required />
          <input className="admin-input" placeholder="Exchange MIC (e.g. XNAS)" value={form.exchangeMic} onChange={e => setForm({...form, exchangeMic: e.target.value})} required />
          <input className="admin-input" placeholder="Currency (e.g. USD)" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} required />
          <button className="admin-button" type="submit">Add Asset</button>
        </form>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">Global Asset Universe</h2>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Instrument ID</th>
                <th>ISIN</th>
                <th>Ticker</th>
                <th>Exchange MIC</th>
                <th>Currency</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr key={a.instrumentId}>
                  <td style={{ fontFamily: 'monospace' }}>{a.instrumentId}</td>
                  <td>{a.isin}</td>
                  <td>{a.ticker}</td>
                  <td>{a.exchangeMic}</td>
                  <td>{a.currency}</td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1rem' }}>No assets found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
