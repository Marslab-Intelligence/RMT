import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { X, Save, Lock, ShieldAlert, ShieldCheck, Send, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';

export default function SalesQuickEditModal({ client, onClose, onSuccess, onOpenFullEdit }) {
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // Already requested?
  const alreadyRequested = client?.edit_status === 'requested';

  const [quantity,        setQuantity]        = useState(client?.quantity ?? 1);
  const [purchaseCost,    setPurchaseCost]    = useState(client?.purchase_cost ?? '');
  const [salesCost,       setSalesCost]       = useState(client?.sales_cost ?? '');
  const [quotationNumber, setQuotationNumber] = useState(client?.quotation_number ?? '');

  // Auto-calculations
  const qty          = parseInt(quantity) || 0;
  const pCost        = parseFloat(purchaseCost) || 0;
  const sCost        = parseFloat(salesCost) || 0;
  const totalPurchase = qty * pCost;
  const totalSales    = qty * sCost;
  const profit        = totalSales - totalPurchase;

  // ── Save cost fields ─────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!acknowledged) {
      toast.error('Please confirm the values are correct before saving.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/renewals/${client.id}/product-costs`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          quantity:            qty,
          purchase_cost:       pCost,
          total_purchase_cost: totalPurchase,
          sales_cost:          sCost,
          total_sales_cost:    totalSales,
          profit,
          quotation_number:    quotationNumber,
        }),
      });
      if (res.ok) {
        toast.success('Cost details updated successfully.');
        onSuccess();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update.');
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setSaving(false);
    }
  };

  // ── Request full edit access ──────────────────────────────────
  const handleRequestAccess = async () => {
    setRequesting(true);
    try {
      const res = await fetch(`/api/renewals/${client.id}/request-edit`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Edit access request sent to admin.');
        onSuccess(); // refresh so edit_status updates to 'requested'
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to send request.');
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setRequesting(false);
    }
  };

  // Fields that are restricted (shown as locked read-only)
  const lockedFields = [
    { label: 'Client Name',        value: client?.client_name },
    { label: 'Service Plan',       value: client?.service },
    { label: 'Renewal Date',       value: client?.renewal_date ? new Date(client.renewal_date).toLocaleDateString('en-IN') : '-' },
    { label: 'Contract Value',     value: client?.value !== undefined ? formatCurrency(client.value) : '-' },
    { label: 'Contact Person',     value: client?.owner },
    { label: 'Client Email',       value: client?.client_email },
    { label: 'Contact Number',     value: client?.contact_number },
    { label: 'Reference ID',       value: client?.reference_id },
    { label: 'Invoice Number',     value: client?.invoice_number },
    { label: 'Plan Period',        value: client?.plan_period },
    { label: 'Product',            value: client?.product },
    { label: 'Vendor',             value: client?.vendor },
    { label: 'Description',        value: client?.description },
    { label: 'Entity',             value: client?.entity },
  ].filter(f => f.value);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-surface-800 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden border border-surface-200 dark:border-surface-700 flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center bg-surface-50 dark:bg-surface-900/50 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-surface-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" />
              Edit Record
            </h2>
            <p className="text-xs text-surface-500 mt-0.5 font-mono">{client?.unique_id} · {client?.client_name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-surface-400 hover:text-surface-600 rounded-full hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1">

          {/* ══ SECTION 1: Editable Fields ══ */}
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </div>
              <h3 className="text-sm font-bold text-surface-900 dark:text-white">Fields You Can Edit</h3>
              <span className="ml-auto text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">No approval needed</span>
            </div>

            <form id="sales-quick-edit-form" onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Quotation Number */}
                <div className="sm:col-span-2">
                  <label className="label">Quotation Number</label>
                  <input
                    type="text"
                    value={quotationNumber}
                    onChange={(e) => setQuotationNumber(e.target.value)}
                    className="input-field"
                    placeholder="Enter quotation number..."
                  />
                </div>
                {/* Quantity */}
                <div>
                  <label className="label">Quantity <span className="text-red-500">*</span></label>
                  <input
                    type="number" min="1" required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="input-field"
                  />
                </div>
                {/* Purchase Cost */}
                <div>
                  <label className="label">Purchase Cost (₹) <span className="text-red-500">*</span></label>
                  <input
                    type="number" min="0" step="any" required
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(e.target.value)}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
                {/* Sales Cost */}
                <div className="sm:col-span-2">
                  <label className="label">Sales Cost (₹) <span className="text-red-500">*</span></label>
                  <input
                    type="number" min="0" step="any" required
                    value={salesCost}
                    onChange={(e) => setSalesCost(e.target.value)}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Auto-calc summary */}
              <div className="bg-surface-50 dark:bg-surface-900/40 rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2">Auto-calculated</p>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-surface-400 text-[10px] font-bold uppercase tracking-wider">Total Purchase</p>
                    <p className="font-semibold text-surface-800 dark:text-surface-200 mt-0.5">{formatCurrency(totalPurchase)}</p>
                  </div>
                  <div>
                    <p className="text-surface-400 text-[10px] font-bold uppercase tracking-wider">Total Sales</p>
                    <p className="font-semibold text-surface-800 dark:text-surface-200 mt-0.5">{formatCurrency(totalSales)}</p>
                  </div>
                  <div>
                    <p className="text-surface-400 text-[10px] font-bold uppercase tracking-wider">Est. Profit</p>
                    <p className={`font-extrabold mt-0.5 ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(profit)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Acknowledgement */}
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox" id="sales-ack" required
                  className="w-4 h-4 mt-0.5 rounded text-brand-600 border-surface-300 focus:ring-brand-500 dark:border-surface-700 cursor-pointer"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                />
                <label htmlFor="sales-ack" className="text-xs text-surface-600 dark:text-surface-300 font-medium select-none cursor-pointer">
                  I confirm the values entered are correct. <span className="text-red-500">*</span>
                </label>
              </div>
            </form>
          </div>

          {/* ══ SECTION 2: Other Record Details ══ */}
          <div className="px-6 pb-5">
            <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden bg-surface-50/50 dark:bg-surface-900/30">
              {/* Header */}
              <div className="bg-surface-100/60 dark:bg-surface-900/60 px-4 py-3 flex items-center justify-between border-b border-surface-200 dark:border-surface-700">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-surface-800 dark:text-surface-200">Other Record Details</p>
                    <p className="text-xs text-surface-500 mt-0.5">Need to edit client name, dates, plan, vendor or emails? Use full edit.</p>
                  </div>
                </div>
              </div>

              {/* Field summary grid */}
              <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                {lockedFields.map((f) => (
                  <div key={f.label} className="flex items-center gap-2 min-w-0">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-surface-400">{f.label}</p>
                      <p className="text-xs font-semibold text-surface-700 dark:text-surface-300 truncate">{f.value || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Full edit button */}
              {onOpenFullEdit && (
                <div className="px-4 py-3 border-t border-surface-200 dark:border-surface-700 bg-brand-50/40 dark:bg-brand-950/20 flex items-center justify-between gap-4">
                  <p className="text-xs text-brand-700 dark:text-brand-300 font-medium">
                    Want to edit all details for this client?
                  </p>
                  <button
                    type="button"
                    onClick={onOpenFullEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors flex-shrink-0 cursor-pointer"
                  >
                    Full Edit Record
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 flex justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="sales-quick-edit-form"
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving
              ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              : <Save className="w-4 h-4" />
            }
            Save Changes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
