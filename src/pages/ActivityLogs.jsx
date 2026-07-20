import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Search, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDateTime } from '../utils/formatters';

export default function ActivityLogs() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/activity-logs?limit=200', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data || []);
      } else {
        toast.error('Failed to load activity logs');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchLogs();
    }
  }, [token]);

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.details?.toLowerCase().includes(query) ||
      (log.full_name && log.full_name.toLowerCase().includes(query)) ||
      (log.role && log.role.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            Activity Logs
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            System activity and audit trail.
          </p>
        </div>
        <div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-surface-600 dark:text-surface-300 hover:text-brand-600 bg-white/40 dark:bg-white/5 border border-surface-200 dark:border-surface-700 rounded-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-surface-400" />
          <input
            type="text"
            placeholder="Search activity logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-surface-100 dark:divide-surface-800">
            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-surface-500 dark:text-surface-400">
                No activity logs found.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-surface-50/50 dark:hover:bg-surface-900/20 transition-all flex items-start gap-4"
                >
                  <div className="mt-1 flex-shrink-0 p-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-lg">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-surface-900 dark:text-white leading-relaxed">
                        {log.details}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-surface-400 dark:text-surface-500 flex-wrap">
                      {log.full_name && (
                        <>
                          <span className="font-semibold text-surface-600 dark:text-surface-400">{log.full_name}</span>
                          <span className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-800 rounded capitalize">{log.role === 'sales' ? 'CST / Sales' : log.role}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{formatDateTime(log.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
