import React, { useState } from 'react';
import { X, CalendarClock, User, Mail, DollarSign, Tag, Clock, FileCheck, AlertCircle, Copy, Check, FileText } from 'lucide-react';
import { createPortal } from 'react-dom';
import { formatCurrency, formatDate, getStatusColor, getDaysLeftColor } from '../utils/formatters';

export default function ClientDetailsModal({ client, onClose }) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedSecondaryEmail, setCopiedSecondaryEmail] = useState(false);

  if (!client) return null;

  const handleCopyEmail = (email, type) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    if (type === 'primary') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedSecondaryEmail(true);
      setTimeout(() => setCopiedSecondaryEmail(false), 2000);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-surface-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-surface-200 dark:border-surface-700 flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 flex justify-between items-start bg-surface-50 dark:bg-surface-900/50">
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">{client.client_name}</h2>
            <p className="text-sm text-surface-500 font-mono mt-0.5">{client.unique_id}</p>
          </div>
          <button onClick={onClose} className="p-2 text-surface-400 hover:text-surface-600 rounded-full hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-50 dark:bg-surface-900/50 p-4 rounded-xl border border-surface-100 dark:border-surface-700">
              <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Status</p>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border inline-block ${getStatusColor(client.status)}`}>
                {client.status}
              </span>
            </div>
            <div className="bg-surface-50 dark:bg-surface-900/50 p-4 rounded-xl border border-surface-100 dark:border-surface-700">
              <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Contract Value</p>
              <p className="font-semibold text-surface-900 dark:text-white flex items-center">
                {formatCurrency(client.value)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-lg">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Service Plan</p>
                <p className="text-sm font-medium text-surface-900 dark:text-white">{client.service}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-lg">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Renewal Date</p>
                <p className="text-sm font-medium text-surface-900 dark:text-white">{formatDate(client.renewal_date)}</p>
                <p className={`text-xs mt-0.5 font-medium ${getDaysLeftColor(client.days_left)}`}>
                  {client.days_left < 0 ? 'Expired' : client.days_left === 0 ? 'Due Today' : `${client.days_left} days left`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Contact person</p>
                <p className="text-sm font-medium text-surface-900 dark:text-white">{client.owner}</p>
                {client.contact_number && (
                  <p className="text-xs text-surface-500 flex items-center mt-0.5">
                    <span className="font-semibold mr-1">Phone:</span> {client.contact_number}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg animate-pulse-subtle">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Client email</p>
                <div className="flex items-center gap-2 group">
                  <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{client.client_email}</p>
                  <button 
                    onClick={() => handleCopyEmail(client.client_email, 'primary')}
                    className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700/50 rounded transition-colors text-surface-400 hover:text-brand-600 focus:outline-none"
                    title="Copy Email"
                  >
                    {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {client.sales_email && (
                  <div className="flex items-center gap-2 mt-1 group">
                    <p className="text-xs text-surface-500 truncate">
                      <span className="font-semibold mr-1">Secondary:</span> {client.sales_email}
                    </p>
                    <button 
                      onClick={() => handleCopyEmail(client.sales_email, 'secondary')}
                      className="p-0.5 hover:bg-surface-100 dark:hover:bg-surface-700/50 rounded transition-colors text-surface-400 hover:text-brand-600 focus:outline-none"
                      title="Copy Secondary Email"
                    >
                      {copiedSecondaryEmail ? <Check className="w-3 text-emerald-500" /> : <Copy className="w-3" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {client.invoice_number && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Invoice Number</p>
                  <p className="text-sm font-medium text-surface-900 dark:text-white">{client.invoice_number}</p>
                </div>
              </div>
            )}

            {client.quotation_number && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Quotation Number</p>
                  <p className="text-sm font-medium text-surface-900 dark:text-white">{client.quotation_number}</p>
                </div>
              </div>
            )}

            {client.reference_id && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Reference ID (Invoice NO)</p>
                  <p className="text-sm font-medium text-surface-900 dark:text-white">{client.reference_id}</p>
                </div>
              </div>
            )}

            {client.plan_period && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Plan Period</p>
                  <p className="text-sm font-medium text-surface-900 dark:text-white">
                    {client.plan_period === 'monthly_plan' ? 'Monthly plan' :
                     client.plan_period === 'quarterly_plan' ? 'Quarterly plan' :
                     client.plan_period === 'halfly_plan' ? 'Halfly plan' : 
                     client.plan_period === 'yearly_plan' ? `Yearly plan (${client.plan_duration || 1} ${client.plan_duration > 1 ? 'years' : 'year'})` : client.plan_period}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Payment Status</p>
                <p className="text-sm font-medium text-surface-900 dark:text-white capitalize">
                  {client.payment_status || 'No'}
                </p>
              </div>
            </div>
            
            {client.edit_status && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Edit Status</p>
                  <p className="text-sm font-medium text-surface-900 dark:text-white capitalize">{client.edit_status}</p>
                  {client.edit_reason && <p className="text-xs text-surface-500 mt-0.5">Reason: {client.edit_reason}</p>}
                </div>
              </div>
            )}

            {client.expiry_reason && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Expiry Reason</p>
                  <p className="text-sm font-medium text-surface-900 dark:text-white">{client.expiry_reason}</p>
                </div>
              </div>
            )}

            {client.invoice_status === 'Sent' && (
              <div className="border-t border-surface-200 dark:border-surface-700 pt-4 mt-4 space-y-4">
                <h3 className="text-sm font-bold text-surface-900 dark:text-white mb-2 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-500" />
                  Invoice Details
                </h3>
                <div className="grid grid-cols-3 gap-4 pl-7">
                  <div>
                    <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Invoice Value</p>
                    <p className="text-sm font-medium text-surface-900 dark:text-white">
                      {client.invoice_value !== null && client.invoice_value !== undefined ? formatCurrency(client.invoice_value) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Sent Date</p>
                    <p className="text-sm font-medium text-surface-900 dark:text-white">{client.invoice_sent_date ? formatDate(client.invoice_sent_date) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Balance Amount</p>
                    <p className="text-sm font-medium text-surface-900 dark:text-white">
                      {(() => {
                        const valueVal = parseFloat(client.value) || 0;
                        const paymentAmt = client.payment_status === 'Yes' ? (parseFloat(client.payment_amount) || 0) : 0;
                        return formatCurrency(valueVal - paymentAmt);
                      })()}
                    </p>
                  </div>
                  {(() => {
                    const valueVal = parseFloat(client.value) || 0;
                    const paymentAmt = client.payment_status === 'Yes' ? (parseFloat(client.payment_amount) || 0) : 0;
                    const percentPaid = valueVal > 0 ? Math.round((paymentAmt / valueVal) * 100) : 0;
                    const percentYetToPay = 100 - percentPaid;
                    return valueVal > 0 && (
                      <div className="col-span-2 mt-2">
                        <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Payment Progress</p>
                        <div className="space-y-1.5 max-w-xs">
                          <div className="flex justify-between text-xs font-semibold text-surface-700 dark:text-surface-300">
                            <span>{percentPaid}% Paid</span>
                            <span>{percentYetToPay}% Yet to pay</span>
                          </div>
                          <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, Math.max(0, percentPaid))}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {client.payment_status === 'Yes' && (
              <div className="border-t border-surface-200 dark:border-surface-700 pt-4 mt-4 space-y-4">
                <h3 className="text-sm font-bold text-surface-900 dark:text-white mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  Payment Details
                </h3>
                <div className="grid grid-cols-2 gap-4 pl-7">
                  <div>
                    <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Payment Received Amount</p>
                    <p className="text-sm font-medium text-surface-900 dark:text-white">
                      {client.payment_amount !== null && client.payment_amount !== undefined ? formatCurrency(client.payment_amount) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Received Date</p>
                    <p className="text-sm font-medium text-surface-900 dark:text-white">{client.payment_received_date ? formatDate(client.payment_received_date) : '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 flex justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
