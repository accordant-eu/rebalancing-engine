import React, { useState, useEffect } from 'react';
import { Building2, Users, Key, Plus, Settings } from 'lucide-react';

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

  const inputClasses = "w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm";

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-12">
      
      {/* Top Section: Provision Tenant */}
      <section className="bg-white border border-slate-200/60 rounded-2xl p-8 shadow-soft transition-all duration-300 hover:shadow-soft-hover">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm text-white">
            <Building2 size={20} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{isEditing ? 'Edit Tenant Settings' : 'Provision New Tenant'}</h2>
        </div>
        
        <form onSubmit={handleCreateTenant} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <input className={inputClasses} placeholder="Tenant ID (e.g. firm-xyz)" value={form.tenantId} onChange={e => setForm({...form, tenantId: e.target.value})} disabled={isEditing} required />
          <input className={inputClasses} placeholder="Firm Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <select className={`${inputClasses} cursor-pointer`} value={form.brokerType} onChange={e => setForm({...form, brokerType: e.target.value})}>
            <option value="MOCK">MOCK (Paper Trading)</option>
            <option value="ALPACA">ALPACA</option>
          </select>
          <input className={inputClasses} placeholder="Broker Base URL (Optional)" value={form.brokerBaseUrl} onChange={e => setForm({...form, brokerBaseUrl: e.target.value})} />
          {form.brokerType === 'ALPACA' && (
            <>
              <input className={inputClasses} placeholder="API Key" value={form.brokerApiKey} onChange={e => setForm({...form, brokerApiKey: e.target.value})} />
              <input className={inputClasses} type="password" placeholder="API Secret" value={form.brokerApiSecret} onChange={e => setForm({...form, brokerApiSecret: e.target.value})} />
            </>
          )}
          <div className="md:col-span-2 flex gap-4 mt-2">
            <button className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold tracking-wide hover:bg-slate-800 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5" type="submit">
              {isEditing ? 'Save Changes' : 'Provision Tenant'}
            </button>
            {isEditing && (
              <button 
                type="button" 
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold tracking-wide hover:bg-slate-50 transition-all shadow-sm"
                onClick={() => { setIsEditing(false); setForm({ tenantId: '', name: '', brokerType: 'MOCK', brokerApiKey: '', brokerApiSecret: '', brokerBaseUrl: '' }); }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Main Grid: Tenants & Management */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Left Column: Active Tenants */}
        <section className="bg-white border border-slate-200/60 rounded-2xl shadow-soft overflow-hidden flex flex-col h-[600px] transition-all duration-300 hover:shadow-soft-hover">
          <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50/50 backdrop-blur-md flex items-center gap-3">
            <Building2 size={18} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Active Tenants</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-slate-500 border-b border-slate-200/60 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px]">Tenant</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px]">Broker</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map(t => (
                  <tr key={t.tenantId} className={`hover:bg-slate-50/80 transition-colors group ${selectedTenant === t.tenantId ? 'bg-sky-50/50' : ''}`}>
                    <td className="px-6 py-4 text-slate-900 font-medium">{t.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                        {t.brokerType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-slate-500 hover:text-sky-600 font-semibold text-xs transition-colors" onClick={() => handleEditClick(t)}>Edit</button>
                        <button 
                          className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
                          onClick={() => { setSelectedTenant(t.tenantId); fetchUsers(t.tenantId); fetchApiKeys(t.tenantId); }}
                        >
                          Manage
                        </button>
                      </div>
                      <div className={`text-sky-600 font-bold text-xs ${selectedTenant === t.tenantId ? 'block' : 'hidden'} group-hover:hidden`}>
                        Selected
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right Column: Users & Keys */}
        {selectedTenant ? (
          <div className="flex flex-col gap-8">
            
            {/* Users Section */}
            <section className="bg-white border border-sky-200/60 rounded-2xl shadow-soft overflow-hidden transition-all duration-300 hover:shadow-soft-hover">
              <div className="px-6 py-5 border-b border-sky-100 bg-sky-50/50 flex items-center gap-3">
                <Users size={18} className="text-sky-500" />
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Users for {selectedTenant}</h2>
              </div>
              
              <div className="p-6 border-b border-slate-100">
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input className={inputClasses} placeholder="User ID (e.g. u-123)" value={userForm.userId} onChange={e => setUserForm({...userForm, userId: e.target.value})} required />
                  <input className={inputClasses} placeholder="Email" type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} required />
                  <input className={inputClasses} placeholder="Password" type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} required />
                  <div className="flex gap-4">
                    <select className={`${inputClasses} flex-1 cursor-pointer`} value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
                      <option value="Viewer">Viewer</option>
                      <option value="Admin">Admin</option>
                    </select>
                    <button className="px-6 bg-emerald-600 text-white rounded-xl font-bold tracking-wide hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md whitespace-nowrap" type="submit">
                      Add User
                    </button>
                  </div>
                </form>
              </div>

              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200/60">
                    <tr>
                      <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Email</th>
                      <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Role</th>
                      <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400 font-medium">No users provisioned.</td></tr>
                    ) : users.map(u => (
                      <tr key={u.userId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-900 font-medium">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'Admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-emerald-600 font-semibold text-xs flex items-center gap-1.5 mt-2">
                          <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                          {u.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* API Keys Section */}
            <section className="bg-white border border-purple-200/60 rounded-2xl shadow-soft overflow-hidden transition-all duration-300 hover:shadow-soft-hover">
              <div className="px-6 py-5 border-b border-purple-100 bg-purple-50/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Key size={18} className="text-purple-500" />
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">API Credentials (B2B)</h2>
                </div>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold text-xs shadow-sm hover:bg-purple-700 transition-all hover:shadow-md flex items-center gap-1.5" onClick={handleGenerateApiKey}>
                  <Plus size={14} /> Generate Key
                </button>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200/60">
                    <tr>
                      <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Prefix</th>
                      <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Created</th>
                      <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Status</th>
                      <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px] text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {apiKeys.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-medium">No API keys generated.</td></tr>
                    ) : apiKeys.map(k => (
                      <tr key={k.keyId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-900 font-mono text-xs font-semibold">{k.keyPrefix}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{new Date(k.createdAt).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${k.status === 'Revoked' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {k.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {k.status === 'Active' && (
                            <button className="text-rose-600 hover:text-rose-800 font-semibold text-xs transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-50" onClick={() => handleRevokeApiKey(k.keyId)}>Revoke</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl border-dashed flex flex-col items-center justify-center text-slate-400 p-12 min-h-[600px]">
            <Settings size={48} className="mb-4 opacity-20" />
            <p className="font-medium text-lg">Select a tenant to manage</p>
            <p className="text-sm">Manage users and API credentials</p>
          </div>
        )}
      </div>
    </div>
  );
};
