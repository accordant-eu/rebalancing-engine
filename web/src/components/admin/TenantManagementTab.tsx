import React, { useState, useEffect } from 'react';
import './Admin.css';

interface Tenant {
  tenantId: string;
  name: string;
  brokerType: string;
}

interface User {
  userId: string;
  email: string;
  role: string;
  status: string;
}

export const TenantManagementTab: React.FC<{ token: string }> = ({ token }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  
  const [form, setForm] = useState({ tenantId: '', name: '', brokerType: 'MOCK', brokerApiKey: '', brokerApiSecret: '', brokerBaseUrl: '' });
  const [userForm, setUserForm] = useState({ userId: '', email: '', password: '', role: 'Viewer' });

  const fetchTenants = async () => {
    const res = await fetch('/api/admin/tenants', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setTenants(await res.json());
  };

  const fetchUsers = async (tenantId: string) => {
    const res = await fetch(`/api/admin/users?tenantId=${tenantId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setUsers(await res.json());
  };

  useEffect(() => { fetchTenants(); }, []);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form)
    });
    fetchTenants();
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

  return (
    <div className="admin-container">
      <section className="admin-section">
        <h2 className="admin-section-title">Provision New Tenant</h2>
        <form onSubmit={handleCreateTenant} className="admin-form-grid">
          <input className="admin-input" placeholder="Tenant ID (e.g. firm-xyz)" value={form.tenantId} onChange={e => setForm({...form, tenantId: e.target.value})} required />
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
          <button className="admin-button" type="submit">Provision Tenant</button>
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
                      <button 
                        className="admin-link-button"
                        onClick={() => { setSelectedTenant(t.tenantId); fetchUsers(t.tenantId); }}
                      >
                        Manage Users
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selectedTenant && (
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
        )}
      </div>
    </div>
  );
};
