import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, FileText, ClipboardList, CheckCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import IndianDateInput from './IndianDateInput';

export default function InvoiceDetailsModal({ isOpen, renewal, onClose, onSuccess }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState('Invoice');
  
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_value: '',
    invoice_sent_date: ''
  });

  useEffect(() => {
    if (renewal) {
      const today = new Date().toISOString().split('T')[0];
      setDocType(renewal.invoice_type || 'Invoice');
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
      toast.error(`${docType} Number is required.`);
      return;
    }
    if (formData.invoice_value === '' || parseFloat(formData.invoice_value) < 0) {
      toast.error(`Please enter a valid ${docType} Value.`);
      return;
    }
    if (!formData.invoice_sent_date) {
      toast.error(`${docType} Sent Date is required.`);
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
          invoice_type: docType,
          invoice_number: formData.invoice_number,
          invoice_value: parseFloat(formData.invoice_value),
          invoice_sent_date: formData.invoice_sent_date
        })
      });

      if (res.ok) {
        toast.success(`${docType} details updated successfully`);
        onSuccess();
      } else {
        const data = await res.json();
        toast.error(data.error || `Failed to update ${docType.toLowerCase()} details`);
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
              {docType === 'Sales Order' ? (
                <ClipboardList className="w-5 h-5 text-brand-500" />
              ) : (
                <FileText className="w-5 h-5 text-brand-500" />
              )}
              {docType === 'Sales Order' ? 'Sales Order Details' : 'Invoice Sent Details'}
            </h2>
            <p className="text-xs text-surface-500 mt-1">{renewal.client_name} - {renewal.unique_id}</p>
          </div>
          <button onClick={onClose} className="p-2 text-surface-400 hover:text-surface-600 rounded-full hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
            
            {/* Multiple Choice Selection: Invoice vs Sales Order */}
            <div>
              <label className="label text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1.5 block">
                Document Type <span className="text-red-500">*</span>
              </label>
              <div className="bg-surface-100 dark:bg-surface-900 p-1 rounded-xl flex gap-1 border border-surface-200/60 dark:border-surface-700/60">
                <button
                  type="button"
                  onClick={() => setDocType('Invoice')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    docType === 'Invoice'
                      ? 'bg-white dark:bg-surface-800 text-brand-600 dark:text-brand-400 shadow-sm border border-surface-200 dark:border-surface-700'
                      : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setDocType('Sales Order')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    docType === 'Sales Order'
                      ? 'bg-white dark:bg-surface-800 text-brand-600 dark:text-brand-400 shadow-sm border border-surface-200 dark:border-surface-700'
                      : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  Sales Order
                </button>
              </div>
            </div>

            <div>
              <label className="label text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1 block">
                {docType.toUpperCase()} NUMBER <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                required
                placeholder={`Enter ${docType} Number`}
                value={formData.invoice_number} 
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} 
                className="input-field" 
              />
            </div>

            <div>
              <label className="label text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1 block">
                {docType.toUpperCase()} VALUE (₹) <span className="text-red-500">*</span>
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
                {docType.toUpperCase()} SENT DATE <span className="text-red-500">*</span>
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
