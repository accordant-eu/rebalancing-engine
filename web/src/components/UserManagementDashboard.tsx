import React, { useState, useEffect } from 'react';
import { UserPlus, User } from 'lucide-react';

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
    } catch (_e) {
      console.error(_e);
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
    } catch (_e) {
      setError('Network error');
    }
  };

  return (
    <div className="p-8 h-full flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Create User Form */}
        <div className="w-full lg:w-1/3 bg-white border border-slate-200/60 rounded-2xl p-6 shadow-soft transition-all duration-300 hover:shadow-soft-hover relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] transform translate-x-4 -translate-y-4 text-sky-500 transition-transform duration-500 group-hover:scale-110"><UserPlus size={160} /></div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-lg shadow-glow-sky">
              <UserPlus size={18} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Provision User</h2>
          </div>
          
          {error && <div className="p-4 mb-5 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl relative z-10 font-medium">{error}</div>}
          {success && <div className="p-4 mb-5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl relative z-10 font-medium">{success}</div>}
          
          <form onSubmit={handleCreate} className="space-y-5 relative z-10">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm" 
                placeholder="user@accordant.eu"
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Temporary Password</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm" 
                placeholder="••••••••"
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Platform Role</label>
              <select 
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm cursor-pointer"
              >
                <option value="Advisor">Advisor</option>
                <option value="Viewer">Viewer (Compliance)</option>
                <option value="Admin">Tenant Admin</option>
              </select>
            </div>
            <button 
              type="submit"
              className="mt-4 w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold tracking-wide hover:bg-indigo-700 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center justify-center gap-2"
            >
              Create Account
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="flex-1 w-full bg-white border border-slate-200/60 rounded-2xl overflow-hidden flex flex-col shadow-soft transition-all duration-300 hover:shadow-soft-hover">
          <div className="p-5 border-b border-slate-200/60 bg-slate-50/50 backdrop-blur-md flex items-center gap-3">
             <User size={18} className="text-slate-400" />
             <h3 className="font-bold text-slate-700">Active Users</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-slate-500 border-b border-slate-200/60">
                <tr>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px]">User ID</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px]">Email</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px]">Role</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={4} className="p-12 text-center text-slate-500">
                    <div className="animate-pulse flex items-center justify-center gap-2 font-medium">
                      <div className="h-4 w-4 bg-sky-300 rounded-full"></div>
                      Loading users...
                    </div>
                  </td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={4} className="p-12 text-center text-slate-500 font-medium">No users found.</td></tr>
                ) : (
                  users.map((u: any) => (
                    <tr key={u.userId} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-5 text-slate-500 font-mono text-xs">{u.userId}</td>
                      <td className="px-6 py-5 text-slate-900 font-medium">{u.email}</td>
                      <td className="px-6 py-5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm border ${
                          u.role === 'Admin' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                          u.role === 'Advisor' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-bold text-emerald-600 flex items-center gap-2">
                        <div className="h-2.5 w-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        {u.status}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
