import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { Trash2, RotateCcw, ShieldAlert, ArrowLeft, RefreshCw, X, AlertTriangle, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';

export default function Trash() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [trashData, setTrashData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeletingPermanently, setIsDeletingPermanently] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Bulk operations states
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkRestoreModal, setShowBulkRestoreModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const fetchTrash = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/renewals/trash', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTrashData(data.data || []);
        setSelectedIds([]); // Reset selection on fresh fetch
      } else {
        toast.error('Failed to load trash data.');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTrash();
    }
  }, [token]);

  const handleRestore = async (id) => {
    try {
      const res = await fetch(`/api/renewals/${id}/restore`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Record restored successfully.');
        fetchTrash();
      } else {
        toast.error('Failed to restore record.');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedRecord) return;
    setIsDeletingPermanently(true);
    try {
      const res = await fetch(`/api/renewals/${selectedRecord.id}/permanent`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Record permanently deleted.');
        setSelectedRecord(null);
        fetchTrash();
      } else {
        toast.error('Failed to permanently delete record.');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setIsDeletingPermanently(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      const res = await fetch('/api/renewals/trash/restore-batch', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        toast.success(`Successfully restored ${selectedIds.length} records.`);
        setSelectedIds([]);
        fetchTrash();
      } else {
        toast.error('Failed to restore selected records.');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setIsBatchProcessing(false);
      setShowBulkRestoreModal(false);
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      const res = await fetch('/api/renewals/trash/delete-batch', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        toast.success(`Successfully deleted ${selectedIds.length} records.`);
        setSelectedIds([]);
        fetchTrash();
      } else {
        toast.error('Failed to permanently delete selected records.');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setIsBatchProcessing(false);
      setShowBulkDeleteModal(false);
    }
  };

  const isDarkMode = document.documentElement.classList.contains('dark');

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/renewals')}
              className="p-1.5 hover:bg-white/40 dark:hover:bg-white/5 rounded-lg transition-colors text-surface-500 hover:text-surface-700 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-rose-600 dark:from-amber-400 dark:to-rose-400">
              Trash Bin (Admin Only)
            </h1>
          </div>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            View, restore, or permanently delete records that have been deleted.
          </p>
        </div>

        <button
          onClick={fetchTrash}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-surface-700 dark:text-surface-300 hover:bg-white/40 dark:hover:bg-white/5 rounded-xl border border-surface-200 dark:border-surface-800 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Trash
        </button>
      </div>

      {/* Bulk action selection bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/30 rounded-2xl gap-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
              {selectedIds.length} {selectedIds.length === 1 ? 'record' : 'records'} selected
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBulkRestoreModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Selected
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Forever
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 text-xs text-surface-600 dark:text-surface-400 hover:bg-white/40 dark:hover:bg-white/5 rounded-xl border border-surface-200 dark:border-surface-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main content table card */}
      <div className="rounded-2xl border transition-all duration-300 shadow-xl overflow-hidden"
        style={{
          background: isDarkMode ? 'rgba(28, 25, 23, 0.45)' : 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.5)',
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
            <p className="text-sm text-surface-500 dark:text-surface-400">Loading deleted records...</p>
          </div>
        ) : trashData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center mb-4">
              <Trash2 className="w-8 h-8 text-brand-500 dark:text-brand-400" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-1">Trash is empty</h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 max-w-sm">
              Any records deleted by admin or finance team members will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.3)'}}>
                  <th className="px-6 py-4 w-12 text-center">
                    <div
                      onClick={() => {
                        if (trashData.length > 0 && selectedIds.length === trashData.length) {
                          setSelectedIds([]);
                        } else {
                          setSelectedIds(trashData.map(r => r.id));
                        }
                      }}
                      className="inline-flex items-center justify-center w-5 h-5 rounded-md cursor-pointer transition-all duration-200 select-none"
                      style={{
                        background: (trashData.length > 0 && selectedIds.length === trashData.length)
                          ? 'rgba(217, 119, 6, 0.55)'
                          : 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: (trashData.length > 0 && selectedIds.length === trashData.length)
                          ? '1.5px solid rgba(217, 119, 6, 0.7)'
                          : '1.5px dashed rgba(180, 120, 40, 0.45)',
                        boxShadow: (trashData.length > 0 && selectedIds.length === trashData.length)
                          ? '0 0 8px rgba(217, 119, 6, 0.25)'
                          : 'inset 0 1px 3px rgba(200, 140, 40, 0.08)',
                      }}
                    >
                      {(trashData.length > 0 && selectedIds.length === trashData.length) && (
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">Unique ID</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">Client</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">Service</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">Renewal Date</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">Value</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{divideColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.3)'}}>
                {trashData.map((row) => (
                  <tr 
                    key={row.id} 
                    className="hover:bg-white/20 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 w-12 text-center">
                      <div
                        onClick={() => {
                          if (selectedIds.includes(row.id)) {
                            setSelectedIds(prev => prev.filter(id => id !== row.id));
                          } else {
                            setSelectedIds(prev => [...prev, row.id]);
                          }
                        }}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-md cursor-pointer transition-all duration-200 select-none"
                        style={{
                          background: selectedIds.includes(row.id)
                            ? 'rgba(217, 119, 6, 0.55)'
                            : 'rgba(255, 255, 255, 0.08)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          border: selectedIds.includes(row.id)
                            ? '1.5px solid rgba(217, 119, 6, 0.7)'
                            : '1.5px dashed rgba(180, 120, 40, 0.45)',
                          boxShadow: selectedIds.includes(row.id)
                            ? '0 0 8px rgba(217, 119, 6, 0.25)'
                            : 'inset 0 1px 3px rgba(200, 140, 40, 0.08)',
                        }}
                      >
                        {selectedIds.includes(row.id) && (
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-brand-600 dark:text-brand-400 font-semibold">
                      {row.unique_id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-surface-900 dark:text-white">
                        {row.client_name}
                      </div>
                      <div className="text-xs text-surface-500 dark:text-surface-400">
                        {row.client_email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-700 dark:text-surface-300">
                      {row.service}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-700 dark:text-surface-300">
                      {formatDate(row.renewal_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-surface-900 dark:text-white">
                      {formatCurrency(row.value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRestore(row.id)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
                          title="Restore Record"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore
                        </button>
                        <button
                          onClick={() => setSelectedRecord(row)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
                          title="Delete Permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal (Single record delete forever) */}
      {selectedRecord && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md rounded-2xl border shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200"
            style={{
              background: isDarkMode ? 'rgba(28, 25, 23, 0.98)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-lg font-bold">Permanent Deletion</h3>
              </div>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-surface-600 dark:text-surface-300">
                Are you absolutely sure you want to permanently delete <strong>{selectedRecord.client_name}</strong>'s renewal for <strong>{selectedRecord.service}</strong>?
              </p>
              <div className="p-3 bg-red-50/50 dark:bg-red-950/10 rounded-xl border border-red-100 dark:border-red-900/30 text-xs text-red-700 dark:text-red-400">
                Warning: This action is irreversible. All related email logs and renewal history details will be permanently erased.
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedRecord(null)}
                disabled={isDeletingPermanently}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handlePermanentDelete}
                disabled={isDeletingPermanently}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all flex items-center gap-1.5"
              >
                {isDeletingPermanently ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete Forever'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Restore Confirmation Modal */}
      {showBulkRestoreModal && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md rounded-2xl border shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200"
            style={{
              background: isDarkMode ? 'rgba(28, 25, 23, 0.98)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <RotateCcw className="w-6 h-6" />
                <h3 className="text-lg font-bold">Bulk Restore</h3>
              </div>
              <button 
                onClick={() => setShowBulkRestoreModal(false)}
                className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-surface-600 dark:text-surface-300">
                Are you sure you want to restore the <strong>{selectedIds.length}</strong> selected renewals? They will move back to the active renewals list.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBulkRestoreModal(false)}
                disabled={isBatchProcessing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkRestore}
                disabled={isBatchProcessing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
              >
                {isBatchProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  'Yes, Restore All'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md rounded-2xl border shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200"
            style={{
              background: isDarkMode ? 'rgba(28, 25, 23, 0.98)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-lg font-bold">Bulk Permanent Deletion</h3>
              </div>
              <button 
                onClick={() => setShowBulkDeleteModal(false)}
                className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-surface-600 dark:text-surface-300">
                Are you absolutely sure you want to permanently delete the <strong>{selectedIds.length}</strong> selected renewals?
              </p>
              <div className="p-3 bg-red-50/50 dark:bg-red-950/10 rounded-xl border border-red-100 dark:border-red-900/30 text-xs text-red-700 dark:text-red-400">
                Warning: This action is irreversible. All selected logs and histories will be permanently deleted.
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isBatchProcessing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkPermanentDelete}
                disabled={isBatchProcessing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all flex items-center gap-1.5"
              >
                {isBatchProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete All Forever'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
