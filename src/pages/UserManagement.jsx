import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Users, Plus, X, Loader2, Trash2 } from 'lucide-react';

const GROUPS = [
  {
    role: 'sales',
    label: 'CST / Sales',
    description: 'Customer Success Team / Sales — creates & manages records',
    accent: '#3b82f6',
    lightBg: 'bg-blue-50 dark:bg-blue-900/10',
    border: 'border-blue-400 dark:border-blue-600',
    badgeBg: 'bg-blue-500',
    pillBg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    role: 'finance',
    label: 'Finance',
    description: 'Finance team — handles invoicing & payment details',
    accent: '#8b5cf6',
    lightBg: 'bg-purple-50 dark:bg-purple-900/10',
    border: 'border-purple-400 dark:border-purple-600',
    badgeBg: 'bg-purple-500',
    pillBg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  {
    role: 'admin',
    label: 'Admin',
    description: 'Administrators — full read/write access to all fields',
    accent: '#f59e0b',
    lightBg: 'bg-amber-50 dark:bg-amber-900/10',
    border: 'border-amber-400 dark:border-amber-600',
    badgeBg: 'bg-amber-500',
    pillBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
];

const ROLE_LABELS = { sales: 'CST / Sales', finance: 'Finance', admin: 'Admin' };

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '?';
}

export default function UserManagement() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(null); // role string or null
  const [form, setForm] = useState({ email: '', full_name: '', role: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name }
  const [changingRole, setChangingRole] = useState({});
  const [removing, setRemoving] = useState({});

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/', { replace: true });
  }, [user, navigate]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token, fetchUsers]);

  const openAddModal = (role) => {
    setForm({ email: '', full_name: '', role });
    setAddModal(role);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.full_name.trim()) {
      toast.error('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to add user'); return; }
      toast.success(`${data.full_name} added to ${ROLE_LABELS[data.role]}`);
      setAddModal(null);
      fetchUsers();
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleRoleChange = async (userId, newRole, userName) => {
    setChangingRole(p => ({ ...p, [userId]: true }));
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to update role'); return; }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(`${userName} moved to ${ROLE_LABELS[newRole]}`);
    } catch { toast.error('Network error'); }
    finally { setChangingRole(p => ({ ...p, [userId]: false })); }
  };

  const handleRemove = (userId, userName) => {
    setDeleteConfirm({ id: userId, name: userName });
  };

  const handlePermanentDelete = async () => {
    if (!deleteConfirm) return;
    const { id, name } = deleteConfirm;
    setDeleteConfirm(null);
    setRemoving(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to delete user'); return; }
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success(`${name} permanently deleted`);
    } catch { toast.error('Network error'); }
    finally { setRemoving(p => ({ ...p, [id]: false })); }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const activeByRole = (role) => users.filter(u => u.role === role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-3">
          <Users className="w-7 h-7 text-brand-500" />
          User Groups
        </h1>
        <p className="text-surface-500 dark:text-surface-400 mt-1 text-sm">
          Manage role-based access groups. Each user belongs to exactly one group.
        </p>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {GROUPS.map((group) => {
          const active = activeByRole(group.role);

          return (
            <div
              key={group.role}
              className={`rounded-2xl border-2 ${group.border} ${group.lightBg} overflow-hidden`}
            >
              {/* Group Header */}
              <div className="px-5 py-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-surface-900 dark:text-white" style={{ color: group.accent }}>
                    {group.label}
                  </h2>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{group.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white ${group.badgeBg}`}>
                    {active.length} active
                  </span>
                  <button
                    onClick={() => openAddModal(group.role)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white transition-opacity hover:opacity-80"
                    style={{ background: group.accent }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>

              {/* Active Users */}
              <div className="mx-4 mb-4 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 divide-y divide-surface-100 dark:divide-surface-700 overflow-hidden">
                {active.length === 0 ? (
                  <p className="text-center text-xs text-surface-400 py-6">No active users in this group</p>
                ) : (
                  active.map(u => (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                      {/* Avatar */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: u.avatar_color || '#6366f1' }}
                      >
                        {getInitials(u.full_name)}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">{u.full_name}</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{u.email}</p>
                      </div>
                      {/* Role Select */}
                      <div className="relative flex-shrink-0">
                        {changingRole[u.id] ? (
                          <Loader2 className="w-4 h-4 animate-spin text-surface-400" />
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value, u.full_name)}
                            disabled={u.id === user?.id}
                            className="text-xs font-medium px-2 py-1.5 pr-6 rounded-lg border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 text-surface-700 dark:text-surface-200 cursor-pointer outline-none appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="sales">CST / Sales</option>
                            <option value="finance">Finance</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </div>
                      {/* Remove */}
                      <button
                        onClick={() => handleRemove(u.id, u.full_name)}
                        disabled={removing[u.id] || u.id === user?.id}
                        className="flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {removing[u.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Remove'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Permanent Delete Confirmation Modal */}
      {deleteConfirm && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-surface-800 rounded-2xl shadow-2xl border border-red-200 dark:border-red-900 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-100 dark:border-surface-700">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-surface-900 dark:text-white">Permanently Delete User</h3>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">This action cannot be undone</p>
              </div>
              <button onClick={() => setDeleteConfirm(null)} className="ml-auto p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-surface-700 dark:text-surface-300">
                Are you sure you want to <span className="font-bold text-red-600 dark:text-red-400">permanently delete</span> <span className="font-semibold">{deleteConfirm.name}</span>?
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-2">
                This will remove the user completely from the database. They will not be able to log in and all their session data will be erased.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border border-surface-200 dark:border-surface-600 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePermanentDelete}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add User Modal */}
      {addModal && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAddModal(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-800 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-700">
              <div>
                <h3 className="text-base font-bold text-surface-900 dark:text-white">Add User</h3>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  Adding to <span className="font-semibold">{ROLE_LABELS[addModal]}</span> group
                </p>
              </div>
              <button onClick={() => setAddModal(null)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddUser} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Full Name"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 text-surface-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  Zoho Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="Zoho Email Address"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 text-surface-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  required
                />
                <p className="text-[11px] text-surface-400 mt-1.5">
                  The user will log in using Zoho SSO with this email.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  Role / Group
                </label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 text-surface-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  required
                >
                  <option value="sales">CST / Sales</option>
                  <option value="finance">Finance</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setAddModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-surface-200 dark:border-surface-600 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Adding…' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
