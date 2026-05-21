import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, RefreshCw, AlertTriangle, Calendar } from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function RenewActionModal({ renewal, onClose, onSuccess }) {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const datePickerRef = useRef(null);

  const handleNativeDateSelect = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [year, month, day] = val.split('-');
    setFormData({ ...formData, renewal_date: `${day}/${month}/${year}` });
  };
  const [formData, setFormData] = useState({
    renewal_date: '',
    service: renewal.service,
    value: renewal.value,
    status: 'Active'
  });

  const [followUpData, setFollowUpData] = useState({
    follow_up_status: renewal.follow_up_status || '',
    follow_up_remarks: renewal.follow_up_remarks || ''
  });

  const isFinance = user?.role === 'finance';
  const isSales = user?.role === 'sales';

  const handleDateChange = (e) => {
    let val = e.target.value;
    val = val.replace(/[^0-9/]/g, '');
    const oldVal = formData.renewal_date || '';
    if (val.length > oldVal.length) {
      if (val.length === 2) val = val + '/';
      else if (val.length === 5) val = val + '/';
    }
    if (val.length <= 10) {
      setFormData({ ...formData, renewal_date: val });
    }
  };

  const handleFinanceSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Parse renewal_date from DD/MM/YYYY to YYYY-MM-DD
      let submissionData = { ...formData };
      if (submissionData.renewal_date) {
        const parts = submissionData.renewal_date.split('/');
        if (parts.length === 3) {
          const day = parts[0];
          const month = parts[1];
          const year = parts[2];
          const d = parseInt(day, 10);
          const m = parseInt(month, 10);
          const y = parseInt(year, 10);
          if (isNaN(d) || isNaN(m) || isNaN(y) || m < 1 || m > 12 || d < 1 || d > 31 || y < 1000 || y > 9999) {
            toast.error('Please enter a valid date in DD/MM/YYYY format.');
            setLoading(false);
            return;
          }
          submissionData.renewal_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else {
          toast.error('Please enter the date in DD/MM/YYYY format.');
          setLoading(false);
          return;
        }
      }

      const res = await fetch(`/api/renewals/${renewal.id}/renew`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submissionData)
      });
      
      if (res.ok) {
        toast.success('Client successfully renewed. Automations reset.');
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to renew client');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSalesSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/renewals/${renewal.id}/follow-up`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(followUpData)
      });
      
      if (res.ok) {
        toast.success('Follow-up status updated');
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update follow-up');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-surface-200 dark:border-surface-700 flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center bg-surface-50 dark:bg-surface-900/50">
          <div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">
              {isFinance ? 'Process Client Renewal' : 'Update Follow-up Status'}
            </h2>
            <p className="text-xs text-surface-500 mt-1">{renewal.client_name} - {renewal.unique_id}</p>
          </div>
          <button onClick={onClose} className="p-2 text-surface-400 hover:text-surface-600 rounded-full hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {/* Current Info Summary */}
          <div className="bg-surface-50 dark:bg-surface-900/50 rounded-lg p-4 mb-6 border border-surface-200 dark:border-surface-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-surface-500">Current Service</p>
                <p className="font-medium text-surface-900 dark:text-white">{renewal.service}</p>
              </div>
              <div>
                <p className="text-surface-500">Current Value</p>
                <p className="font-medium text-surface-900 dark:text-white">{formatCurrency(renewal.value)}</p>
              </div>
              <div>
                <p className="text-surface-500">Previous Renewal Date</p>
                <p className="font-medium text-surface-900 dark:text-white">{formatDate(renewal.renewal_date)}</p>
              </div>
              <div>
                <p className="text-surface-500">Status</p>
                <p className="font-medium text-surface-900 dark:text-white">{renewal.status}</p>
              </div>
            </div>
          </div>

          {isFinance ? (
            <form id="renew-form" onSubmit={handleFinanceSubmit} className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg flex items-start gap-3 mb-6">
                <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Processing this renewal will reset all email automation flags to "No" and start a new reminder cycle based on the new date. The previous record will be archived in history.
                </p>
              </div>

              <div>
                <label className="label">New Renewal Date <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="DD/MM/YYYY" 
                    required 
                    value={formData.renewal_date} 
                    onChange={handleDateChange} 
                    className="input-field pr-10" 
                  />
                  <button
                    type="button"
                    onClick={() => datePickerRef.current?.showPicker()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-white"
                  >
                    <Calendar className="w-5 h-5" />
                  </button>
                  <input 
                    type="date"
                    ref={datePickerRef}
                    onChange={handleNativeDateSelect}
                    className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Updated Service (Optional)</label>
                  <input 
                    type="text" 
                    value={formData.service} 
                    onChange={(e) => setFormData({...formData, service: e.target.value})} 
                    className="input-field" 
                  />
                </div>
                <div>
                  <label className="label">Updated Value (₹)</label>
                  <input 
                    type="number" 
                    value={formData.value} 
                    onChange={(e) => setFormData({...formData, value: e.target.value})} 
                    className="input-field" 
                  />
                </div>
              </div>
              
              <div>
                <label className="label">New Status</label>
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({...formData, status: e.target.value})} 
                  className="input-field bg-white dark:bg-surface-800"
                >
                  <option value="Active">Active</option>
                  <option value="Renewed">Renewed</option>
                </select>
              </div>
            </form>
          ) : (
            <form id="sales-form" onSubmit={handleSalesSubmit} className="space-y-4">
              <div>
                <label className="label">Follow-up Status <span className="text-red-500">*</span></label>
                <select 
                  required
                  value={followUpData.follow_up_status} 
                  onChange={(e) => setFollowUpData({...followUpData, follow_up_status: e.target.value})} 
                  className="input-field bg-white dark:bg-surface-800"
                >
                  <option value="">Select Status...</option>
                  <option value="Meeting Scheduled">Meeting Scheduled</option>
                  <option value="Proposal Sent">Proposal Sent</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Verbal Agreement">Verbal Agreement</option>
                  <option value="At Risk">At Risk</option>
                  <option value="Completed">Completed (Pending Finance)</option>
                </select>
              </div>
              <div>
                <label className="label">Follow-up Remarks</label>
                <textarea 
                  rows="3"
                  value={followUpData.follow_up_remarks} 
                  onChange={(e) => setFollowUpData({...followUpData, follow_up_remarks: e.target.value})} 
                  className="input-field resize-none"
                  placeholder="Add notes about client discussions..."
                ></textarea>
              </div>
            </form>
          )}
        </div>

        <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button 
            type="submit" 
            form={isFinance ? "renew-form" : "sales-form"} 
            disabled={loading} 
            className="btn-primary flex items-center gap-2"
          >
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <RefreshCw className="w-4 h-4" />}
            {isFinance ? 'Complete Renewal Cycle' : 'Save Status'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
