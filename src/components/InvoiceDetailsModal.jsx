import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, FileText, Calendar, CheckCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import IndianDateInput from './IndianDateInput';

export default function InvoiceDetailsModal({ isOpen, renewal, onClose, onSuccess }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_value: '',
    invoice_sent_date: ''
  });

  useEffect(() => {
    if (renewal) {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        invoice_number: renewal.invoice_number || '',
        invoice_value: renewal.invoice_value !== null && renewal.invoice_value !== undefined ? renewal.invoice_value : renewal.value || '',
        invoice_sent_date: renewal.invoice_sent_date ? new Date(renewal.invoice_sent_date).toISOString().split('T')[0] : today
      });
    }
  }, [renewal]);

  if (!isOpen || !renewal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.invoice_number.trim()) {
      toast.error('Invoice Number is required.');
      return;
    }
    if (formData.invoice_value === '' || parseFloat(formData.invoice_value) < 0) {
      toast.error('Please enter a valid Invoice Value.');
      return;
    }
    if (!formData.invoice_sent_date) {
      toast.error('Invoice Sent Date is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/renewals/${renewal.id}/invoice`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          invoice_status: 'Sent',
          invoice_number: formData.invoice_number,
          invoice_value: parseFloat(formData.invoice_value),
          invoice_sent_date: formData.invoice_sent_date
        })
      });

      if (res.ok) {
        toast.success('Invoice details updated successfully');
        onSuccess();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update invoice details');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/90 dark:bg-surface-800/90 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-surface-200/50 dark:border-surface-700/50 flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-surface-200/50 dark:border-surface-700/50 flex justify-between items-center bg-surface-50/50 dark:bg-surface-900/50">
          <div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-500" />
              Invoice Sent Details
            </h2>
            <p className="text-xs text-surface-500 mt-1">{renewal.client_name} - {renewal.unique_id}</p>
          </div>
          <button onClick={onClose} className="p-2 text-surface-400 hover:text-surface-600 rounded-full hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
            <div>
              <label className="label text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1 block">
                Invoice Number <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                required
                placeholder="Enter Invoice Number"
                value={formData.invoice_number} 
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} 
                className="input-field" 
              />
            </div>

            <div>
              <label className="label text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1 block">
                Invoice Value (₹) <span className="text-red-500">*</span>
              </label>
              <input 
                type="number" 
                required
                step="0.01"
                placeholder="e.g. 15000"
                value={formData.invoice_value} 
                onChange={(e) => setFormData({ ...formData, invoice_value: e.target.value })} 
                className="input-field" 
              />
            </div>

            <div>
              <label className="label text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1 block">
                Invoice Sent Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IndianDateInput 
                  required
                  value={formData.invoice_sent_date} 
                  onChange={(e) => setFormData({ ...formData, invoice_sent_date: e.target.value })} 
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-surface-200/50 dark:border-surface-700/50 bg-surface-50/50 dark:bg-surface-900/50 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Save Details
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
}
