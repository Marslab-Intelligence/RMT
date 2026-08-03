import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, CalendarClock, User, Mail, DollarSign, Tag, Clock, 
  FileCheck, AlertCircle, Copy, Check, FileText, Phone, Edit3, MailX, MailCheck
} from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor, getDaysLeftColor } from '../utils/formatters';
import toast from 'react-hot-toast';
import RenewalForm from '../components/RenewalForm';
import SalesQuickEditModal from '../components/SalesQuickEditModal';

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedSecondaryEmail, setCopiedSecondaryEmail] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSalesQuickEditOpen, setIsSalesQuickEditOpen] = useState(false);

  // Sales can open full form only if admin approved; otherwise limited 3-field modal
  const handleSalesEdit = () => {
    if (client?.edit_status === 'approved') {
      setIsFormOpen(true);
    } else {
      setIsSalesQuickEditOpen(true);
    }
  };

  const fetchClient = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/renewals/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClient(data);
      } else {
        toast.error('Client details not found');
      }
    } catch (err) {
      console.error('Failed to fetch client details', err);
      toast.error('Error fetching client details');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

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
    toast.success('Email copied to clipboard');
  };

  const handleToggleStopEmail = async () => {
    if (!client) return;
    try {
      const nextState = !client.stop_email;
      const res = await fetch(`/api/renewals/${client.id}/stop-email`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stop_email: nextState })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update email setting.');
      
      toast.success(data.message || `Email reminders ${nextState ? 'stopped' : 'resumed'}.`);
      setClient(prev => ({ ...prev, stop_email: nextState }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/renewals');
    }
  };

  if (!client) {
    return (
      <div className="text-center py-12 card max-w-lg mx-auto mt-8">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-2">Client Not Found</h2>
        <p className="text-surface-500 dark:text-surface-400 mb-6">The requested renewal record could not be loaded.</p>
        <button onClick={handleBack} className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Renewals
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header / Navigation */}
      <div className="flex items-center justify-between">
        <button 
          onClick={handleBack} 
          className="btn-secondary flex items-center gap-2 py-1.5 px-3 text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Renewals
        </button>
        <div className="flex items-center gap-2">
          {user?.role === 'sales' && (
            <button 
              onClick={() => setIsSalesQuickEditOpen(true)} 
              className="btn-secondary flex items-center gap-2 py-1.5 px-3 text-xs"
            >
              <Edit3 className="w-4 h-4 text-brand-600 dark:text-brand-400" /> Quick Edit (Costs & Quotation)
            </button>
          )}
          {(user?.role === 'admin' || client.edit_status === 'approved') && (
            <button 
              onClick={() => setIsFormOpen(true)} 
              className="btn-primary flex items-center gap-2 py-1.5 px-3 text-xs"
            >
              <Edit3 className="w-4 h-4" /> Edit Info
            </button>
          )}
        </div>
      </div>

      {/* Hero Overview Card */}
      <div className="card p-6 md:p-8 bg-gradient-to-r from-brand-600/10 via-transparent to-transparent border-l-4 border-brand-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-surface-900 dark:text-white tracking-tight">
              {client.client_name}
            </h1>
            <p className="text-sm font-mono text-brand-600 dark:text-brand-400 mt-1 font-semibold">
              {client.unique_id}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Quotation No: {client.quotation_number ? `#${client.quotation_number}` : '-'}
            </span>
            {client.invoice_number && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {client.invoice_type === 'Sales Order' ? 'Sales Order' : 'Invoice'} No: #{client.invoice_number}
              </span>
            )}
            <button
              onClick={handleToggleStopEmail}
              className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                client.stop_email 
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-200' 
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
              }`}
              title={client.stop_email ? "Click to resume automated reminder emails for this client" : "Click to stop automated reminder emails for this client"}
            >
              {client.stop_email ? <MailX className="w-3.5 h-3.5" /> : <MailCheck className="w-3.5 h-3.5" />}
              <span>{client.stop_email ? 'Reminders Stopped' : 'Reminders Active'}</span>
            </button>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(client.status)}`}>
              {client.status}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700">
              Contract Value: {formatCurrency(client.value)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card: Service & Expiry Info */}
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-bold text-surface-900 dark:text-white border-b border-surface-150 dark:border-surface-700 pb-2">
            Service & Renewal Details
          </h2>

          <div className="space-y-4">
            {client.invoice_number && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg mt-0.5">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">{client.invoice_type || 'Invoice'} Number</p>
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">#{client.invoice_number}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="p-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-lg mt-0.5">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Service Plan</p>
                <p className="text-sm font-semibold text-surface-900 dark:text-white">{client.service}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Quotation Number</p>
                <p className="text-sm font-semibold text-surface-900 dark:text-white">
                  {client.quotation_number ? `#${client.quotation_number}` : 'Not Added'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-lg mt-0.5">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Renewal Date</p>
                <p className="text-sm font-semibold text-surface-900 dark:text-white">{formatDate(client.renewal_date)}</p>
                {client.days_left !== null && (
                  <p className={`text-xs mt-0.5 font-semibold ${getDaysLeftColor(client.days_left)}`}>
                    {client.days_left < 0 ? 'Expired' : client.days_left === 0 ? 'Due Today' : `${client.days_left} days left`}
                  </p>
                )}
              </div>
            </div>

            {client.plan_period && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Plan Period</p>
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">
                    {client.plan_period === 'monthly_plan' ? 'Monthly plan' :
                     client.plan_period === 'quarterly_plan' ? 'Quarterly plan' :
                     client.plan_period === 'halfly_plan' ? 'Halfly plan' : 
                     client.plan_period === 'yearly_plan' ? `Yearly plan (${client.plan_duration || 1} ${client.plan_duration > 1 ? 'years' : 'year'})` : client.plan_period}
                  </p>
                </div>
              </div>
            )}

            {client.expiry_reason && (
              <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-rose-600 dark:text-rose-450 font-bold uppercase tracking-wider mb-0.5">Expiry Reason</p>
                  <p className="text-xs font-medium text-rose-700 dark:text-rose-350">{client.expiry_reason}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Client Contact Info */}
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-bold text-surface-900 dark:text-white border-b border-surface-150 dark:border-surface-700 pb-2">
            Contact Information
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg mt-0.5">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Contact Person</p>
                <p className="text-sm font-semibold text-surface-900 dark:text-white">{client.owner}</p>
                {client.contact_number && (
                  <p className="text-xs text-surface-500 flex items-center mt-1">
                    <span className="font-semibold mr-1">Phone:</span> {client.contact_number}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg mt-0.5">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Client Email</p>
                <div className="flex items-center gap-2 group">
                  <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">{client.client_email}</p>
                  <button 
                    onClick={() => handleCopyEmail(client.client_email, 'primary')}
                    className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700/50 rounded transition-colors text-surface-400 hover:text-brand-600"
                    title="Copy Email"
                  >
                    {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {client.sales_email && (
                  <div className="flex items-center gap-2 mt-1.5 bg-surface-50 dark:bg-surface-900/40 p-2 rounded border border-surface-200/50 dark:border-surface-700/50">
                    <p className="text-xs text-surface-500 truncate flex-1">
                      <span className="font-semibold mr-1">Secondary:</span> {client.sales_email}
                    </p>
                    <button 
                      onClick={() => handleCopyEmail(client.sales_email, 'secondary')}
                      className="p-0.5 hover:bg-surface-100 dark:hover:bg-surface-700/50 rounded transition-colors text-surface-400 hover:text-brand-600"
                      title="Copy Secondary Email"
                    >
                      {copiedSecondaryEmail ? <Check className="w-3 text-emerald-500" /> : <Copy className="w-3" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {client.reference_id && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg mt-0.5">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Reference ID (Invoice NO)</p>
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">{client.reference_id}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Details Card */}
      {(client.invoice_status === 'Sent' || client.invoice_number) && (
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-bold text-surface-900 dark:text-white border-b border-surface-150 dark:border-surface-700 pb-2 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-500" /> {client.invoice_type || 'Invoice'} Information
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-surface-50 dark:bg-surface-900/50 p-4 rounded-xl border border-surface-100 dark:border-surface-700">
              <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">{client.invoice_type || 'Invoice'} Number</p>
              <p className="text-base font-bold text-surface-900 dark:text-white">{client.invoice_number || '-'}</p>
            </div>
            <div className="bg-surface-50 dark:bg-surface-900/50 p-4 rounded-xl border border-surface-100 dark:border-surface-700">
              <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">{client.invoice_type || 'Invoice'} Value</p>
              <p className="text-base font-bold text-surface-900 dark:text-white">
                {client.invoice_value !== null && client.invoice_value !== undefined ? formatCurrency(client.invoice_value) : '-'}
              </p>
            </div>
            <div className="bg-surface-50 dark:bg-surface-900/50 p-4 rounded-xl border border-surface-100 dark:border-surface-700">
              <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Sent Date</p>
              <p className="text-base font-bold text-surface-900 dark:text-white">
                {client.invoice_sent_date ? formatDate(client.invoice_sent_date) : '-'}
              </p>
            </div>
          </div>

          {/* Payment Progress Bar */}
          {(() => {
            const valueVal = parseFloat(client.value) || 0;
            const paymentAmt = client.payment_status === 'Yes' ? (parseFloat(client.payment_amount) || 0) : 0;
            const balanceAmt = valueVal - paymentAmt;
            const percentPaid = valueVal > 0 ? Math.round((paymentAmt / valueVal) * 100) : 0;
            const percentYetToPay = 100 - percentPaid;

            return (
              <div className="pt-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-3 rounded-lg border border-emerald-100/50 dark:border-emerald-900/30">
                    <p className="text-xs text-emerald-600 dark:text-emerald-450 font-bold uppercase tracking-wider mb-0.5">Amount Paid</p>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-350">{formatCurrency(paymentAmt)}</p>
                  </div>
                  <div className="bg-amber-50/50 dark:bg-amber-950/10 p-3 rounded-lg border border-amber-100/50 dark:border-amber-900/30">
                    <p className="text-xs text-amber-600 dark:text-amber-450 font-bold uppercase tracking-wider mb-0.5">Outstanding Balance</p>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-350">{formatCurrency(balanceAmt)}</p>
                  </div>
                </div>

                {valueVal > 0 && (
                  <div className="space-y-1.5 max-w-md">
                    <div className="flex justify-between text-xs font-semibold text-surface-700 dark:text-surface-300">
                      <span>{percentPaid}% Paid</span>
                      <span>{percentYetToPay}% Remaining</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(0, percentPaid))}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Payment Details Card */}
      {client.payment_status === 'Yes' && (
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-bold text-surface-900 dark:text-white border-b border-surface-150 dark:border-surface-700 pb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" /> Payment Confirmation
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-surface-50 dark:bg-surface-900/50 p-4 rounded-xl border border-surface-100 dark:border-surface-700">
              <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Received Amount</p>
              <p className="text-base font-bold text-surface-900 dark:text-white">
                {client.payment_amount !== null && client.payment_amount !== undefined ? formatCurrency(client.payment_amount) : '-'}
              </p>
            </div>
            <div className="bg-surface-50 dark:bg-surface-900/50 p-4 rounded-xl border border-surface-100 dark:border-surface-700">
              <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Received Date</p>
              <p className="text-base font-bold text-surface-900 dark:text-white">
                {client.payment_received_date ? formatDate(client.payment_received_date) : '-'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Quotation & Commercial Details Card */}
      <div className="card p-6 space-y-4 bg-gradient-to-br from-indigo-50/30 via-transparent to-transparent dark:from-indigo-950/10 border-l-4 border-indigo-500">
        <div className="flex items-center justify-between border-b border-surface-150 dark:border-surface-700 pb-2">
          <h2 className="text-base font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Quotation & Commercial Information
          </h2>
          <button
            onClick={() => setIsSalesQuickEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Quotation No. & Costs
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-surface-900/50 p-4 rounded-xl border border-surface-200/60 dark:border-surface-700">
            <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Quotation Number</p>
            <p className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
              {client.quotation_number ? `#${client.quotation_number}` : 'Not Added'}
            </p>
          </div>
          <div className="bg-white dark:bg-surface-900/50 p-4 rounded-xl border border-surface-200/60 dark:border-surface-700">
            <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Renewal Confirmation</p>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border inline-block mt-0.5 ${
              (client.renewal_confirmation === 'reminder_sent' || client.renewal_confirmation === 'awaiting_with_vendor') ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800' :
              (client.renewal_confirmation === 'quote_sent' || client.renewal_confirmation === 'quotation_confirmation') ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800' :
              client.renewal_confirmation === 'awaiting_client_approval' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' :
              client.renewal_confirmation === 'renewed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' :
              client.renewal_confirmation === 'lost' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800' :
              (client.renewal_confirmation === 'cancelled' || client.renewal_confirmation === 'service_discontinued') ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
              'bg-surface-100 text-surface-600 border-surface-200 dark:bg-surface-700 dark:text-surface-300 dark:border-surface-600'
            }`}>
              {
                (client.renewal_confirmation === 'reminder_sent' || client.renewal_confirmation === 'awaiting_with_vendor') ? 'Reminder Sent' :
                (client.renewal_confirmation === 'quote_sent' || client.renewal_confirmation === 'quotation_confirmation') ? 'Quote Sent' :
                client.renewal_confirmation === 'awaiting_client_approval' ? 'Awaiting Client Approval' :
                client.renewal_confirmation === 'renewed' ? 'Renewed' :
                client.renewal_confirmation === 'lost' ? 'Lost' :
                (client.renewal_confirmation === 'cancelled' || client.renewal_confirmation === 'service_discontinued') ? 'Cancelled' :
                'Pending'
              }
            </span>
          </div>
          <div className="bg-white dark:bg-surface-900/50 p-4 rounded-xl border border-surface-200/60 dark:border-surface-700">
            <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Quotation / Sales Value</p>
            <p className="text-base font-bold text-surface-900 dark:text-white">
              {formatCurrency(client.total_sales_cost || client.value)}
            </p>
          </div>
          <div className="bg-white dark:bg-surface-900/50 p-4 rounded-xl border border-surface-200/60 dark:border-surface-700">
            <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Unit Sales Price & Qty</p>
            <p className="text-sm font-semibold text-surface-900 dark:text-white">
              {formatCurrency(client.sales_cost || 0)} × {client.quantity || 1}
            </p>
          </div>
        </div>
      </div>

      {/* Product & Financial Information Card */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-surface-150 dark:border-surface-700 pb-2">
          <h2 className="text-base font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-500" /> Product & Financial Details
          </h2>
          {user?.role === 'sales' && (
            <button
              id="edit-product-financial-btn"
              onClick={handleSalesEdit}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-700 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              {client?.edit_status === 'approved' ? 'Edit (Full Access)' : 'Edit'}
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Product</p>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">{client.product || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Description</p>
              <p className="text-sm font-semibold text-surface-900 dark:text-white whitespace-pre-wrap">{client.description || '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Quantity</p>
                <p className="text-sm font-semibold text-surface-900 dark:text-white">{client.quantity !== null && client.quantity !== undefined ? client.quantity : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Entity</p>
                <p className="text-sm font-semibold text-surface-900 dark:text-white">{client.entity || '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5">Vendor</p>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">{client.vendor || '-'}</p>
            </div>
          </div>

          <div className="bg-surface-50 dark:bg-surface-900/40 p-4 rounded-xl border border-surface-200/50 dark:border-surface-700/50 space-y-4">
            <h3 className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase tracking-wider">Cost breakdown</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-surface-500 font-bold uppercase tracking-wider">Purchase Cost</p>
                <p className="text-sm font-bold text-surface-900 dark:text-white">
                  {client.purchase_cost !== null && client.purchase_cost !== undefined ? formatCurrency(client.purchase_cost) : '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-surface-500 font-bold uppercase tracking-wider">Total Purchase Cost</p>
                <p className="text-sm font-bold text-surface-900 dark:text-white">
                  {client.total_purchase_cost !== null && client.total_purchase_cost !== undefined ? formatCurrency(client.total_purchase_cost) : '-'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-surface-200/60 dark:border-surface-700/60">
              <div>
                <p className="text-[10px] text-surface-500 font-bold uppercase tracking-wider">Sales Cost</p>
                <p className="text-sm font-bold text-surface-900 dark:text-white">
                  {client.sales_cost !== null && client.sales_cost !== undefined ? formatCurrency(client.sales_cost) : '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-surface-500 font-bold uppercase tracking-wider">Total Sales Cost</p>
                <p className="text-sm font-bold text-surface-900 dark:text-white">
                  {client.total_sales_cost !== null && client.total_sales_cost !== undefined ? formatCurrency(client.total_sales_cost) : '-'}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-surface-200/60 dark:border-surface-700/60 flex justify-between items-center">
              <span className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wider">Estimated Profit</span>
              <span className={`text-base font-extrabold ${client.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {client.profit !== null && client.profit !== undefined ? formatCurrency(client.profit) : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Status Banner */}
      {client.edit_status && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4 rounded-xl flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 capitalize">
              Edit Status: {client.edit_status}
            </h3>
            {client.edit_reason && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Reason: {client.edit_reason}
              </p>
            )}
          </div>
        </div>
      )}

      {isFormOpen && (
        <RenewalForm 
          onClose={() => setIsFormOpen(false)} 
          onSuccess={() => { 
            setIsFormOpen(false); 
            fetchClient(); 
          }} 
          editData={client}
        />
      )}

      {isSalesQuickEditOpen && (
        <SalesQuickEditModal
          client={client}
          onClose={() => setIsSalesQuickEditOpen(false)}
          onSuccess={() => {
            setIsSalesQuickEditOpen(false);
            fetchClient();
          }}
        />
      )}
    </div>
  );
}
