import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Save, User, Shield, Bell, Settings as SettingsIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, token } = useAuth();
  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passData.currentPassword, newPassword: passData.newPassword })
      });
      if (res.ok) {
        toast.success('Password updated successfully');
        setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const err = await res.json();
        toast.error(err.error);
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const triggerScheduler = async () => {
    try {
      await fetch('/api/dashboard/trigger-scheduler', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Scheduler triggered. Emails will process in background.');
    } catch (err) {
      toast.error('Failed to trigger scheduler');
    }
  };

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Settings</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Manage your account preferences and system configuration.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 rounded-lg font-medium text-sm transition-colors text-left">
            <User className="w-5 h-5" /> Profile & Security
          </button>
          {user?.role === 'admin' && (
            <button className="w-full flex items-center gap-3 px-4 py-3 text-surface-600 hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-surface-800 rounded-lg font-medium text-sm transition-colors text-left">
              <SettingsIcon className="w-5 h-5" /> System Config
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Profile Card */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-brand-500" /> Account Details
            </h2>
            <div className="flex items-center gap-6 mb-8">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                style={{ backgroundColor: user?.avatarColor || '#6366f1' }}
              >
                {user?.fullName?.split(' ').map(n=>n[0]).join('').substring(0,2)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-surface-900 dark:text-white">{user?.fullName}</h3>
                <p className="text-surface-500 dark:text-surface-400">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Security Card */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-500" /> Change Password
            </h2>
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div>
                <label className="label">Current Password</label>
                <input type="password" required value={passData.currentPassword} onChange={e=>setPassData({...passData, currentPassword: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="label">New Password</label>
                <input type="password" required minLength="6" value={passData.newPassword} onChange={e=>setPassData({...passData, newPassword: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input type="password" required minLength="6" value={passData.confirmPassword} onChange={e=>setPassData({...passData, confirmPassword: e.target.value})} className="input-field" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary mt-2">
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Admin System Tools */}
          {user?.role === 'admin' && (
            <div className="card p-6 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">
              <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-2 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-red-500" /> System Utilities
              </h2>
              <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
                Manual overrides and system tools for administrators.
              </p>
              <div className="flex gap-4">
                <button onClick={triggerScheduler} className="btn-secondary text-surface-900 border-surface-300">
                  Force Run Email Scheduler
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
