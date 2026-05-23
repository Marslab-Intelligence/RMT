import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Save, Edit3, Calendar } from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

export default function RenewalForm({ onClose, onSuccess, editData = null }) {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [loading, setLoading] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const datePickerRef = useRef(null);

  const handleNativeDateSelect = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [year, month, day] = val.split('-');
    setFormData({ ...formData, renewal_date: `${day}/${month}/${year}` });
  };

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return '';
    }
  };

  const [formData, setFormData] = useState({
    client_name: editData?.client_name || '',
    service: editData?.service || '',
    renewal_date: editData?.renewal_date ? formatDateForInput(editData.renewal_date) : '',
    value: editData?.value || '',
    owner: editData?.owner || '',
    client_email: editData?.client_email || '',
    sales_email: editData?.sales_email || '',
    contact_number: editData?.contact_number || '',
    reference_id: editData?.reference_id || '',
    status: editData?.status || 'Active',
    plan_period: editData?.plan_period || 'yearly_plan',
    reason: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!acknowledged) {
      toast.error('Please acknowledge that the information is correct.');
      return;
    }
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

      const url = editData ? `/api/renewals/${editData.id}` : '/api/renewals';
      const method = editData ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submissionData)
      });
      
      if (res.ok) {
        toast.success(editData ? 'Record updated successfully.' : 'Renewal record created and locked.');
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save record');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-surface-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-surface-200 dark:border-surface-700 flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center bg-surface-50 dark:bg-surface-900/50">
          <div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">
              {editData ? 'Edit Renewal Record' : 'Add New Renewal'}
            </h2>
            {(!editData && !isAdmin) && (
              <p className="text-xs text-surface-500 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-500" /> Record will be locked upon creation
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-surface-400 hover:text-surface-600 rounded-full hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="renewal-form" onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Client Name <span className="text-red-500">*</span></label>
                <input type="text" name="client_name" required value={formData.client_name} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="label">Service Name <span className="text-red-500">*</span></label>
                <input type="text" name="service" required value={formData.service} onChange={handleChange} className="input-field" />
              </div>
              
              <div>
                <label className="label">Renewal Date {formData.status !== '-' && <span className="text-red-500">*</span>}</label>
                <div className="relative">
                  <input 
                    type="text" 
                    name="renewal_date" 
                    placeholder="DD/MM/YYYY" 
                    required={formData.status !== '-'} 
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
              <div>
                <label className="label">Contract Value (₹) {formData.status !== '-' && <span className="text-red-500">*</span>}</label>
                <input type="number" name="value" required={formData.status !== '-'} min="0" value={formData.value} onChange={handleChange} className="input-field" />
              </div>

              <div>
                <label className="label">Client Email <span className="text-red-500">*</span></label>
                <input type="email" name="client_email" required value={formData.client_email} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="label">Client secondary mail</label>
                <input type="email" name="sales_email" value={formData.sales_email} onChange={handleChange} className="input-field" />
              </div>

              <div>
                <label className="label">Contact person <span className="text-red-500">*</span></label>
                <input type="text" name="owner" required value={formData.owner} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="label">Contact number <span className="text-red-500">*</span></label>
                <input type="text" name="contact_number" required value={formData.contact_number} onChange={handleChange} className="input-field" />
              </div>

              <div>
                <label className="label">Reference ID (invoice NO) <span className="text-red-500">*</span></label>
                <input type="text" name="reference_id" required value={formData.reference_id} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="label">Initial Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="input-field bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">
                  <option value="Active" className="bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">Active</option>
                  <option value="Pending Renewal" className="bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">Pending Renewal</option>
                </select>
              </div>
              <div>
                <label className="label">Plan Period</label>
                <select name="plan_period" value={formData.plan_period} onChange={handleChange} className="input-field bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">
                  <option value="halfly_plan" className="bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">Halfly plan</option>
                  <option value="quarterly_plan" className="bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">Quarterly plan</option>
                  <option value="yearly_plan" className="bg-white dark:bg-surface-800 text-zinc-900 dark:text-white">Yearly plan</option>
                </select>
              </div>
            </div>
            
            {editData && (
              <div>
                <label className="label">Reason for Update <span className="text-red-500">*</span></label>
                <textarea 
                  required
                  rows="2"
                  className="input-field"
                  placeholder="Briefly describe why you are updating this record..."
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                ></textarea>
              </div>
            )}

            {!isAdmin && (
              <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 p-4 rounded-lg mt-6">
                <h4 className="text-sm font-semibold text-brand-800 dark:text-brand-300 mb-1">Note</h4>
                <p className="text-xs text-brand-600 dark:text-brand-400">
                  Once saved, this data cannot be edited directly to ensure data integrity. The system will automatically calculate dates and schedule reminder emails based on the Renewal Date provided.
                </p>
              </div>
            )}
             <div className="flex items-center gap-2.5 mt-4">
              <input 
                type="checkbox" 
                id="acknowledgement" 
                required 
                className="w-4 h-4 rounded text-brand-600 border-surface-300 focus:ring-brand-500 dark:border-surface-650 cursor-pointer"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <label htmlFor="acknowledgement" className="text-xs text-surface-600 dark:text-surface-300 font-medium select-none cursor-pointer flex items-center">
                I acknowledge that the information provided above is correct and verified. <span className="text-red-500">*</span>
              </label>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" form="renewal-form" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : (editData ? <Edit3 className="w-4 h-4" /> : <Save className="w-4 h-4" />)}
            {editData ? 'Save Changes' : 'Save & Lock Record'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
