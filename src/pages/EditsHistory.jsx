import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { History, User, Calendar, Edit, ArrowRight, Shield, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

export default function EditsHistory() {
  const { token, user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/renewals/edits-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      } else {
        toast.error('Failed to load edit history');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  // Dynamically compare previous and new data to find edited fields
  const getChanges = (log) => {
    try {
      const prev = typeof log.previous_data === 'string' ? JSON.parse(log.previous_data) : log.previous_data;
      const next = typeof log.new_data === 'string' ? JSON.parse(log.new_data) : log.new_data;
      
      if (!prev || !next) return [];

      const changes = [];
      const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
      
      const friendlyNames = {
        client_name: 'Client Name',
        client_email: 'Client Email',
        service: 'Service Name',
        value: 'Contract Value',
        renewal_date: 'Renewal Date',
        owner: 'Account Owner',
        sales_email: 'CST Email',
        contact_number: 'Contact Number',
        reference_id: 'Reference ID',
        status: 'Status',
        reason: 'Reason for Edit'
      };

      keys.forEach(key => {
        if (key === 'reason' || key === 'edit_status' || key === 'updated_at') return;

        let prevVal = prev[key];
        let nextVal = next[key];

        // Normalise date values for comparison
        if (key === 'renewal_date') {
          if (prevVal) prevVal = new Date(prevVal).toISOString().split('T')[0];
          if (nextVal) nextVal = new Date(nextVal).toISOString().split('T')[0];
        }

        if (prevVal !== nextVal) {
          // Format values for human-readable display
          let formattedPrev = prevVal === null || prevVal === undefined ? '—' : String(prevVal);
          let formattedNext = nextVal === null || nextVal === undefined ? '—' : String(nextVal);

          if (key === 'value') {
            formattedPrev = formatCurrency(prevVal || 0);
            formattedNext = formatCurrency(nextVal || 0);
          } else if (key === 'renewal_date') {
            formattedPrev = prevVal ? formatDate(prevVal) : '—';
            formattedNext = nextVal ? formatDate(nextVal) : '—';
          }

          changes.push({
            field: friendlyNames[key] || key,
            old: formattedPrev,
            new: formattedNext
          });
        }
      });

      return changes;
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const getReason = (log) => {
    try {
      const next = typeof log.new_data === 'string' ? JSON.parse(log.new_data) : log.new_data;
      return next?.reason || 'No reason provided';
    } catch (e) {
      return 'No reason provided';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-brand-500" /> Record Edits History
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Audit logs of all renewal records edited by the CST (Sales) Team and Administrators.
          </p>
        </div>
        <button 
          onClick={fetchLogs} 
          disabled={loading}
          className="btn-secondary p-2 flex items-center gap-2 text-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="card overflow-hidden dark:bg-surface-800 dark:border-surface-700">
        <div className="max-h-[700px] overflow-y-auto custom-scrollbar relative">
          <table className="w-full text-left text-sm table-fixed">
            <thead className="bg-surface-50 dark:bg-surface-900 text-surface-500 dark:text-surface-400 border-b border-surface-200 dark:border-surface-700 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-medium w-[12%]">Unique ID</th>
                <th className="px-4 py-3 font-medium w-[22%]">Record Details</th>
                <th className="px-4 py-3 font-medium w-[18%]">Edited By</th>
                <th className="px-4 py-3 font-medium w-[14%]">Edited At</th>
                <th className="px-4 py-3 font-medium w-[34%]">Changes Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-surface-500">
                    <div className="flex justify-center mb-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
                    </div>
                    Loading edit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-surface-500">
                    No edited records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const changes = getChanges(log);
                  const reason = getReason(log);
                  return (
                    <tr key={log.id} className="hover:bg-surface-50 dark:hover:bg-surface-700/30 transition-colors">
                      {/* Unique ID */}
                      <td className="px-4 py-3 font-mono text-xs text-brand-600 dark:text-brand-400 font-medium truncate" title={log.unique_id}>
                        {log.unique_id || '—'}
                      </td>

                      {/* Current Record Details */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-surface-900 dark:text-white truncate">
                          {log.client_name || '—'}
                        </div>
                        <div className="text-xs text-surface-500 truncate mt-0.5">
                          {log.service || '—'}
                        </div>
                      </td>

                      {/* Edited By Role Badge */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 flex items-center justify-center text-xs font-semibold"
                          >
                            {log.performed_by_name?.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-surface-900 dark:text-white">{log.performed_by_name}</p>
                            <span 
                              className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-medium border mt-0.5 capitalize ${
                                log.performed_by_role === 'admin' 
                                  ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' 
                                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                              }`}
                            >
                              {log.performed_by_role === 'sales' ? 'CST' : log.performed_by_role}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Edited At Date/Time */}
                      <td className="px-4 py-3 text-xs text-surface-600 dark:text-surface-400">
                        {formatDateTime(log.performed_at)}
                      </td>

                      {/* Changes Details */}
                      <td className="px-4 py-3 space-y-2">
                        {changes.length === 0 ? (
                          <span className="text-xs text-surface-400 italic">No field differences logged</span>
                        ) : (
                          <div className="space-y-1">
                            {changes.map((c, i) => (
                              <div key={i} className="flex flex-wrap items-center gap-1.5 text-xs text-surface-700 dark:text-surface-300">
                                <span className="font-semibold text-surface-500 dark:text-surface-400">{c.field}:</span>
                                <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded line-through text-[10px] truncate max-w-[120px]">{c.old}</span>
                                <ArrowRight className="w-3 h-3 text-surface-400" />
                                <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded font-medium text-[10px] truncate max-w-[120px]">{c.new}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="text-xs bg-surface-100 dark:bg-surface-700/50 p-2 rounded-lg text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700 italic">
                          <span className="font-bold not-italic text-[10px] text-surface-500 mr-1.5 uppercase">Reason:</span>
                          {reason}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
