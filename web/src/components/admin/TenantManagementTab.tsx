import React, { useState, useEffect } from 'react';
import './Admin.css';

interface Tenant {
  tenantId: string;
  name: string;
  brokerType: string;
  brokerApiKey?: string;
  brokerApiSecret?: string;
  brokerBaseUrl?: string;
}

interface User {
  userId: string;
  email: string;
  role: string;
  status: string;
}

interface ApiKey {
  keyId: string;
  keyPrefix: string;
  createdAt: string;
  status: string;
}

export const TenantManagementTab: React.FC<{ token: string }> = ({ token }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  
  const [form, setForm] = useState({ tenantId: '', name: '', brokerType: 'MOCK', brokerApiKey: '', brokerApiSecret: '', brokerBaseUrl: '' });
  const [userForm, setUserForm] = useState({ userId: '', email: '', password: '', role: 'Viewer' });

  const [isEditing, setIsEditing] = useState(false);

  const fetchTenants = async () => {
    const res = await fetch('/api/admin/tenants', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setTenants(await res.json());
  };

  const fetchUsers = async (tenantId: string) => {
    const res = await fetch(`/api/admin/users?tenantId=${tenantId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setUsers(await res.json());
  };

  const fetchApiKeys = async (tenantId: string) => {
    const res = await fetch(`/api/admin/tenants/${tenantId}/keys`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setApiKeys(await res.json());
  };

  useEffect(() => { fetchTenants(); }, []);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      await fetch(`/api/admin/tenants/${form.tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      setIsEditing(false);
    } else {
      await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
    }
    setForm({ tenantId: '', name: '', brokerType: 'MOCK', brokerApiKey: '', brokerApiSecret: '', brokerBaseUrl: '' });
    fetchTenants();
  };

  const handleEditClick = (t: Tenant) => {
    setIsEditing(true);
    setForm({ 
      tenantId: t.tenantId, 
      name: t.name, 
      brokerType: t.brokerType, 
      brokerApiKey: t.brokerApiKey || '', 
      brokerApiSecret: t.brokerApiSecret || '', 
      brokerBaseUrl: t.brokerBaseUrl || '' 
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tenantId: selectedTenant, ...userForm })
    });
    fetchUsers(selectedTenant);
  };

  const handleGenerateApiKey = async () => {
    if (!selectedTenant) return;
    const res = await fetch(`/api/admin/tenants/${selectedTenant}/keys`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      alert(`API Key Generated!\n\nSecret: ${data.secret}\n\nPlease copy this now, you will not be able to see it again.`);
      fetchApiKeys(selectedTenant);
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    if (!selectedTenant || !confirm('Are you sure you want to revoke this API key?')) return;
    await fetch(`/api/admin/tenants/${selectedTenant}/keys/${keyId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchApiKeys(selectedTenant);
  };

  return (
    <div className="admin-container">
      <section className="admin-section">
        <h2 className="admin-section-title">{isEditing ? 'Edit Tenant Settings' : 'Provision New Tenant'}</h2>
        <form onSubmit={handleCreateTenant} className="admin-form-grid">
          <input className="admin-input" placeholder="Tenant ID (e.g. firm-xyz)" value={form.tenantId} onChange={e => setForm({...form, tenantId: e.target.value})} disabled={isEditing} required />
          <input className="admin-input" placeholder="Firm Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <select className="admin-input" value={form.brokerType} onChange={e => setForm({...form, brokerType: e.target.value})}>
            <option value="MOCK">MOCK (Paper Trading)</option>
            <option value="ALPACA">ALPACA</option>
          </select>
          <input className="admin-input" placeholder="Broker Base URL (Optional)" value={form.brokerBaseUrl} onChange={e => setForm({...form, brokerBaseUrl: e.target.value})} />
          {form.brokerType === 'ALPACA' && (
            <>
              <input className="admin-input" placeholder="API Key" value={form.brokerApiKey} onChange={e => setForm({...form, brokerApiKey: e.target.value})} />
              <input className="admin-input" type="password" placeholder="API Secret" value={form.brokerApiSecret} onChange={e => setForm({...form, brokerApiSecret: e.target.value})} />
            </>
          )}
          <button className="admin-button" type="submit">{isEditing ? 'Save Changes' : 'Provision Tenant'}</button>
          {isEditing && <button type="button" className="admin-button" style={{ backgroundColor: 'transparent', border: '1px solid var(--border-subtle)' }} onClick={() => { setIsEditing(false); setForm({ tenantId: '', name: '', brokerType: 'MOCK', brokerApiKey: '', brokerApiSecret: '', brokerBaseUrl: '' }); }}>Cancel</button>}
        </form>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        <section className="admin-section">
          <h2 className="admin-section-title">Active Tenants</h2>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead><tr><th>Tenant</th><th>Broker</th><th>Action</th></tr></thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.tenantId}>
                    <td>{t.name}</td>
                    <td>{t.brokerType}</td>
                    <td>
                      <button className="admin-link-button" style={{ marginRight: '12px' }} onClick={() => handleEditClick(t)}>Edit</button>
                      <button 
                        className="admin-link-button"
                        onClick={() => { setSelectedTenant(t.tenantId); fetchUsers(t.tenantId); fetchApiKeys(t.tenantId); }}
                      >
                        Manage Users & Keys
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selectedTenant && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <section className="admin-section" style={{ borderColor: 'var(--border-focus)' }}>
              <h2 className="admin-section-title">Users for {selectedTenant}</h2>
              <form onSubmit={handleCreateUser} className="admin-form-grid" style={{ marginBottom: '24px' }}>
                <input className="admin-input" placeholder="User ID (e.g. u-123)" value={userForm.userId} onChange={e => setUserForm({...userForm, userId: e.target.value})} required />
                <input className="admin-input" placeholder="Email" type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} required />
                <input className="admin-input" placeholder="Password" type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} required />
                <select className="admin-input" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
                  <option value="Viewer">Viewer</option>
                  <option value="Admin">Admin</option>
                </select>
                <button className="admin-button admin-button-green" type="submit">Provision User</button>
              </form>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead><tr><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.userId}>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>{u.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-section" style={{ borderColor: 'var(--status-blue)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 className="admin-section-title" style={{ margin: 0 }}>API Credentials (B2B)</h2>
                <button className="admin-button" style={{ padding: '6px 12px', fontSize: '0.875rem' }} onClick={handleGenerateApiKey}>Generate Key</button>
              </div>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead><tr><th>Prefix</th><th>Created</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {apiKeys.map(k => (
                      <tr key={k.keyId}>
                        <td>{k.keyPrefix}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(k.createdAt).toLocaleString()}</td>
                        <td style={{ color: k.status === 'Revoked' ? 'var(--status-red)' : 'var(--status-green)' }}>{k.status}</td>
                        <td>
                          {k.status === 'Active' && (
                            <button className="admin-link-button" style={{ color: 'var(--status-red)' }} onClick={() => handleRevokeApiKey(k.keyId)}>Revoke</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
