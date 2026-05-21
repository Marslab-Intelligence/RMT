import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { History, User, Calendar, Edit, ArrowRight, Shield, RefreshCw, PlusCircle, CheckCircle, X, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

export default function EditsHistory() {
  const { token, user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

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
        toast.error('Failed to load record history');
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

  // Fallback helper to fetch details of the record (even if deleted)
  const getRecordDetails = (log) => {
    if (!log) return { client_name: '—', service: '—' };
    if (log.client_name && log.service) {
      return { client_name: log.client_name, service: log.service };
    }
    try {
      const next = typeof log.new_data === 'string' ? JSON.parse(log.new_data) : log.new_data;
      const prev = typeof log.previous_data === 'string' ? JSON.parse(log.previous_data) : log.previous_data;
      return {
        client_name: next?.client_name || prev?.client_name || 'Deleted Record',
        service: next?.service || prev?.service || '—'
      };
    } catch (e) {
      return { client_name: 'Deleted Record', service: '—' };
    }
  };

  // Fallback helper to fetch unique ID
  const getUniqueId = (log) => {
    if (!log) return '—';
    if (log.unique_id) return log.unique_id;
    try {
      const next = typeof log.new_data === 'string' ? JSON.parse(log.new_data) : log.new_data;
      const prev = typeof log.previous_data === 'string' ? JSON.parse(log.previous_data) : log.previous_data;
      return next?.unique_id || prev?.unique_id || '—';
    } catch (e) {
      return '—';
    }
  };

  // Dynamically compare previous and new data to find edited fields
  const getChanges = (log) => {
    if (!log || log.action === 'created') return [];
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
        reason: 'Reason for Edit',
        renewal_confirmation: 'Renewal Status'
      };

      keys.forEach(key => {
        if (key === 'reason' || key === 'edit_status' || key === 'updated_at' || key === 'imported') return;

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
    if (!log) return 'No reason provided';
    try {
      const next = typeof log.new_data === 'string' ? JSON.parse(log.new_data) : log.new_data;
      return next?.reason || 'No reason provided';
    } catch (e) {
      return 'No reason provided';
    }
  };

  const downloadTextLog = (log) => {
    if (!log) return;
    try {
      const details = getRecordDetails(log);
      const uniqueId = getUniqueId(log);
      const changes = getChanges(log);
      const reason = getReason(log);
      const actorRole = log.performed_by_role === 'sales' ? 'CST' : log.performed_by_role;

      let changesText = '';
      if (log.action === 'created') {
        changesText = 'Initial record created.';
      } else if (log.action === 'renewed' && changes.length === 0) {
        changesText = 'Record renewed successfully.';
      } else {
        changesText = changes.map(c => `- ${c.field}: ${c.old} -> ${c.new}`).join('\n');
      }

      const fileContent = `==================================================
AUDIT LOG REPORT: RECORD MODIFICATION
==================================================
Record ID:       ${uniqueId}
Client Name:     ${details.client_name}
Service:         ${details.service}
Action Type:     ${log.action}
Performed By:    ${log.performed_by_name} (${actorRole?.toUpperCase()})
Timestamp:       ${formatDateTime(log.performed_at)}
Reason/Remarks:  ${reason}

CHANGES DESCRIPTION:
--------------------------------------------------
${changesText}
==================================================
Generated on ${new Date().toLocaleString('en-IN')}
`;

      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_log_${uniqueId}_${new Date(log.performed_at).toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Audit log downloaded successfully');
    } catch (e) {
      toast.error('Failed to generate text file');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-brand-500" /> Record Details
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Complete audit logs of all changes, creations, and renewals across all records. Click any record to view details & download report.
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
                <th className="px-4 py-3 font-medium w-[18%]">Performed By</th>
                <th className="px-4 py-3 font-medium w-[14%]">Action At</th>
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
                    Loading audit history...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-surface-500">
                    No history logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const changes = getChanges(log);
                  const reason = getReason(log);
                  const { client_name, service } = getRecordDetails(log);
                  const unique_id = getUniqueId(log);

                  return (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className="cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-700/30 transition-colors"
                    >
                      {/* Unique ID */}
                      <td className="px-4 py-3 font-mono text-xs text-brand-600 dark:text-brand-400 font-medium truncate" title={unique_id}>
                        {unique_id}
                      </td>

                      {/* Current Record Details */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-surface-900 dark:text-white truncate" title={client_name}>
                          {client_name}
                        </div>
                        <div className="text-xs text-surface-500 truncate mt-0.5" title={service}>
                          {service}
                        </div>
                      </td>

                      {/* Performed By Role Badge */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                                  : log.performed_by_role === 'finance'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
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
                        {log.action === 'created' ? (
                          <div className="flex items-center gap-1.5 text-xs text-brand-700 dark:text-brand-400 font-semibold bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded w-fit">
                            <PlusCircle className="w-3.5 h-3.5" /> Initial Record Created
                          </div>
                        ) : log.action === 'renewed' && changes.length === 0 ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded w-fit">
                            <CheckCircle className="w-3.5 h-3.5" /> Record Renewed
                          </div>
                        ) : (
                          <>
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
                          </>
                        )}
                        
                        {/* Reason / Remarks block */}
                        {log.action === 'edited' && (
                          <div className="text-xs bg-surface-100 dark:bg-surface-700/50 p-2 rounded-lg text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700 italic">
                            <span className="font-bold not-italic text-[10px] text-surface-500 mr-1.5 uppercase">Reason:</span>
                            {reason}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Popup */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-surface-200 dark:border-surface-700">
              <h3 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-brand-500" /> Audit Log Details
              </h3>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
              {/* Record Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 bg-surface-50 dark:bg-surface-900/40 p-4 rounded-xl border border-surface-100 dark:border-surface-700/50">
                <div>
                  <span className="block text-[10px] text-surface-400 uppercase font-semibold">Record ID</span>
                  <span className="text-sm font-mono font-bold text-brand-600 dark:text-brand-400">{getUniqueId(selectedLog)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-surface-400 uppercase font-semibold">Action Type</span>
                  <span className="inline-block text-xs font-semibold capitalize px-2 py-0.5 rounded bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 border border-brand-200/30">
                    {selectedLog.action}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[10px] text-surface-400 uppercase font-semibold">Client Name</span>
                  <span className="text-sm font-semibold text-surface-900 dark:text-white">{getRecordDetails(selectedLog).client_name}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[10px] text-surface-400 uppercase font-semibold">Service</span>
                  <span className="text-sm text-surface-600 dark:text-surface-300">{getRecordDetails(selectedLog).service}</span>
                </div>
              </div>

              {/* Audit Details */}
              <div className="space-y-3">
                <div>
                  <span className="block text-[10px] text-surface-400 uppercase font-semibold mb-1">Performed By</span>
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 flex items-center justify-center text-xs font-semibold">
                      {selectedLog.performed_by_name?.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-surface-900 dark:text-white">{selectedLog.performed_by_name}</p>
                      <p className="text-[10px] text-surface-400 capitalize">{selectedLog.performed_by_role === 'sales' ? 'CST Team' : selectedLog.performed_by_role + ' Team'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] text-surface-400 uppercase font-semibold">Performed At</span>
                  <span className="text-sm text-surface-700 dark:text-surface-300">{formatDateTime(selectedLog.performed_at)}</span>
                </div>

                {selectedLog.action === 'edited' && (
                  <div>
                    <span className="block text-[10px] text-surface-400 uppercase font-semibold mb-1">Reason for Edit</span>
                    <p className="text-sm bg-surface-50 dark:bg-surface-900/40 p-3 rounded-lg border border-surface-150 dark:border-surface-800 text-surface-700 dark:text-surface-300 italic">
                      "{getReason(selectedLog)}"
                    </p>
                  </div>
                )}

                <div>
                  <span className="block text-[10px] text-surface-400 uppercase font-semibold mb-2">Changes Description</span>
                  {selectedLog.action === 'created' ? (
                    <div className="text-sm text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-900/10 p-3 rounded-lg border border-brand-150 dark:border-brand-900/30 flex items-center gap-2">
                      <PlusCircle className="w-4 h-4" /> Initial creation of the record with pre-populated fields.
                    </div>
                  ) : selectedLog.action === 'renewed' && getChanges(selectedLog).length === 0 ? (
                    <div className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-150 dark:border-emerald-900/30 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Record renewed successfully with updated dates.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar bg-surface-50 dark:bg-surface-900/30 p-4 rounded-xl border border-surface-100 dark:border-surface-800">
                      {getChanges(selectedLog).map((c, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 py-1.5 border-b border-surface-200/50 dark:border-surface-750/30 last:border-0 text-sm">
                          <span className="font-semibold text-surface-600 dark:text-surface-400">{c.field}</span>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded line-through text-xs font-mono">{c.old}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-surface-400" />
                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded font-medium text-xs font-mono">{c.new}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 bg-surface-50 dark:bg-surface-900/50 border-t border-surface-200 dark:border-surface-700">
              <button 
                onClick={() => setSelectedLog(null)}
                className="btn-secondary px-4 py-2 text-sm font-semibold"
              >
                Close
              </button>
              <button 
                onClick={() => downloadTextLog(selectedLog)}
                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold"
              >
                <Download className="w-4 h-4" /> Download Text
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
