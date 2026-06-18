import React, { useState, useEffect } from 'react';

interface Tenant {
  tenantId: string;
  name: string;
  brokerType: string;
  brokerBaseUrl: string;
}

interface User {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  status: string;
}

export const TenantManagementTab: React.FC<{ token: string }> = ({ token }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');

  const fetchTenants = async () => {
    const res = await fetch('/api/admin/tenants', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setTenants(await res.json());
  };

  const fetchUsers = async (tenantId: string) => {
    const res = await fetch(`/api/admin/users?tenantId=${tenantId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setUsers(await res.json());
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenant) fetchUsers(selectedTenant);
    else setUsers([]);
  }, [selectedTenant]);

  const provisionTenant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());
    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) fetchTenants();
  };

  const provisionUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());
    body.tenantId = selectedTenant;
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) fetchUsers(selectedTenant);
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-bold mb-4">Provisioned Tenants</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left bg-[#1C1F26] rounded">
            <thead>
              <tr className="border-b border-[#2A2F3A]">
                <th className="p-3">Tenant ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Broker</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.tenantId} className="border-b border-[#2A2F3A]">
                  <td className="p-3">{t.tenantId}</td>
                  <td className="p-3">{t.name}</td>
                  <td className="p-3">{t.brokerType}</td>
                  <td className="p-3">
                    <button 
                      className="text-blue-400 text-sm"
                      onClick={() => setSelectedTenant(t.tenantId)}>
                      Manage Users
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-[#1C1F26] p-6 rounded">
        <h2 className="text-xl font-bold mb-4">Provision New Tenant</h2>
        <form onSubmit={provisionTenant} className="grid grid-cols-2 gap-4">
          <input name="tenantId" placeholder="Tenant ID (e.g. org-123)" className="p-2 bg-[#0F1115] rounded" required />
          <input name="name" placeholder="Organization Name" className="p-2 bg-[#0F1115] rounded" required />
          <select name="brokerType" className="p-2 bg-[#0F1115] rounded">
            <option value="MOCK">MOCK</option>
            <option value="ALPACA">ALPACA</option>
          </select>
          <input name="brokerBaseUrl" placeholder="Broker Base URL (Optional)" className="p-2 bg-[#0F1115] rounded" />
          <input name="brokerApiKey" placeholder="Broker API Key" className="p-2 bg-[#0F1115] rounded" type="password" />
          <input name="brokerApiSecret" placeholder="Broker API Secret" className="p-2 bg-[#0F1115] rounded" type="password" />
          <button type="submit" className="col-span-2 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded">Provision Tenant</button>
        </form>
      </section>

      {selectedTenant && (
        <section className="bg-[#1C1F26] p-6 rounded border border-blue-500/30">
          <h2 className="text-xl font-bold mb-4">Users for {selectedTenant}</h2>
          
          {users.length > 0 && (
            <table className="w-full text-left bg-[#0F1115] rounded mb-6">
              <thead>
                <tr className="border-b border-[#2A2F3A]">
                  <th className="p-3">User ID</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.userId} className="border-b border-[#2A2F3A]">
                    <td className="p-3">{u.userId}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{u.role}</td>
                    <td className="p-3">{u.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 className="font-bold mb-2">Provision User</h3>
          <form onSubmit={provisionUser} className="grid grid-cols-2 gap-4">
            <input name="userId" placeholder="User ID (e.g. u-123)" className="p-2 bg-[#0F1115] rounded" required />
            <input name="email" placeholder="Email" type="email" className="p-2 bg-[#0F1115] rounded" required />
            <input name="password" placeholder="Password" type="password" className="p-2 bg-[#0F1115] rounded" required />
            <select name="role" className="p-2 bg-[#0F1115] rounded">
              <option value="Viewer">Viewer</option>
              <option value="Admin">Admin</option>
            </select>
            <button type="submit" className="col-span-2 bg-green-600 hover:bg-green-500 text-white p-2 rounded">Provision User</button>
          </form>
        </section>
      )}
    </div>
  );
};
