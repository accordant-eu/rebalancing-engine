import React, { useState, useEffect } from 'react';

export const UserManagementDashboard: React.FC<{ token: string | null }> = ({ token }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Advisor');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, role })
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to create user');
        return;
      }
      setSuccess('User created successfully');
      setEmail('');
      setPassword('');
      fetchUsers();
    } catch (e) {
      setError('Network error');
    }
  };

  return (
    <div className="p-6 h-full flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-light text-white">User Management</h1>
      </div>
      
      <div className="flex gap-6 items-start">
        {/* Create User Form */}
        <div className="w-1/3 bg-[#1a1d24] border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Provision New User</h2>
          {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
          {success && <div className="text-emerald-400 text-sm mb-4">{success}</div>}
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#0f1115] border border-gray-700 rounded text-sm text-gray-200 outline-none focus:border-indigo-500" 
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#0f1115] border border-gray-700 rounded text-sm text-gray-200 outline-none focus:border-indigo-500" 
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Role</label>
              <select 
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-[#0f1115] border border-gray-700 rounded text-sm text-gray-200 outline-none focus:border-indigo-500"
              >
                <option value="Advisor">Advisor</option>
                <option value="Viewer">Viewer (Compliance)</option>
                <option value="Admin">Tenant Admin</option>
              </select>
            </div>
            <button 
              type="submit"
              className="w-full px-4 py-2 bg-indigo-500 text-white rounded font-semibold hover:bg-indigo-600 transition-colors"
            >
              Create User
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="flex-1 bg-[#1a1d24] border border-gray-800 rounded-xl overflow-hidden flex flex-col">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f1115] text-gray-400">
              <tr>
                <th className="px-5 py-3 font-semibold">User ID</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={4} className="p-6 text-center text-gray-500">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-gray-500">No users found.</td></tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u.userId} className="hover:bg-[#252830] transition-colors">
                    <td className="px-5 py-3 text-gray-300 font-mono text-xs">{u.userId}</td>
                    <td className="px-5 py-3 text-white font-medium">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        u.role === 'Admin' ? 'bg-indigo-500/20 text-indigo-400' :
                        u.role === 'Advisor' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-emerald-400">{u.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
