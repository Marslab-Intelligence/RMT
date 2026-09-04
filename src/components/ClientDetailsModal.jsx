import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X, CalendarClock, User, Mail, Tag, Clock, FileCheck, AlertCircle, Copy, Check,
  FileText, Building2, IndianRupee, Package, Truck, History, Info, ShieldCheck,
  TrendingUp, Phone, Hash, Loader2, ArrowRight, Lock, Unlock, ClipboardList
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, formatDateTime, getStatusColor } from '../utils/formatters';

/* Fields we never want to show raw in the audit diff — either noise or internal. */
const AUDIT_HIDDEN_FIELDS = new Set([
  'id', 'created_at', 'updated_at', 'day_30_sent', 'day_20_sent', 'day_15_sent',
  'day_10_sent', 'day_5_sent', 'day_3_sent', 'day_0_sent',
]);

/* Human labels for the raw DB column names, so the audit trail reads like English. */
const FIELD_LABELS = {
  client_name: 'Client name', unique_id: 'RMT ID', service: 'Service', product: 'Product',
  description: 'Description', vendor: 'Vendor', entity: 'Entity', quantity: 'Quantity',
  renewal_date: 'Renewal date', value: 'Contract value', owner: 'Owner',
  client_email: 'Client email', sales_email: 'Sales email', contact_number: 'Contact number',
  reference_id: 'Reference ID', status: 'Status', locked: 'Locked',
  follow_up_status: 'Follow-up status', follow_up_remarks: 'Follow-up remarks',
  renewal_confirmation: 'Renewal confirmation', edit_status: 'Edit status',
  edit_reason: 'Edit reason', expiry_reason: 'Expiry reason',
  invoice_status: 'Invoice status', invoice_number: 'Invoice number',
  invoice_value: 'Invoice value', invoice_sent_date: 'Invoice sent date',
  quotation_number: 'Quotation number', plan_period: 'Plan period',
  plan_duration: 'Plan duration', purchase_cost: 'Purchase cost',
  total_purchase_cost: 'Total purchase cost', sales_cost: 'Sales cost',
  total_sales_cost: 'Total sales cost', profit: 'Profit',
  payment_status: 'Payment status', payment_amount: 'Payment amount',
  payment_received_date: 'Payment received date',
};

const labelFor = (k) => FIELD_LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const safeParse = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
};

const displayValue = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
};

const PLAN_LABELS = {
  monthly_plan: 'Monthly plan',
  quarterly_plan: 'Quarterly plan',
  halfly_plan: 'Half-yearly plan',
  yearly_plan: 'Yearly plan',
};

/* ── Small presentational helpers ───────────────────────────────────────── */

function Field({ label, value, mono = false, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-500 mb-1">
        {label}
      </p>
      <p className={`text-sm font-medium text-surface-900 dark:text-slate-100 break-words ${mono ? 'font-mono' : ''}`}>
        {value}
      </p>
    </div>
  );
}

/* Static map, not a template literal — Tailwind only emits classes it can see
   as complete strings in the source, so `md:grid-cols-${cols}` would be purged. */
const COL_CLASS = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
};

function Section({ icon: Icon, title, accent = 'text-brand-500', children, cols = 3 }) {
  return (
    <section className="rounded-2xl border border-surface-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] p-5">
      <h3 className="flex items-center gap-2 text-sm font-bold text-surface-900 dark:text-white mb-4">
        <Icon className={`w-4 h-4 ${accent}`} />
        {title}
      </h3>
      <div className={`grid grid-cols-2 ${COL_CLASS[cols] || COL_CLASS[3]} gap-x-6 gap-y-4`}>{children}</div>
    </section>
  );
}

/* ── Audit trail ─────────────────────────────────────────────────────────
   Renders one entry per history row, with a field-level before → after diff
   so you can see exactly what changed rather than two blobs of JSON. */
function AuditEntry({ entry }) {
  const prev = safeParse(entry.previous_data);
  const next = safeParse(entry.new_data);

  const changes = useMemo(() => {
    if (!prev && !next) return [];
    const keys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
    const out = [];
    for (const k of keys) {
      if (AUDIT_HIDDEN_FIELDS.has(k)) continue;
      const a = prev?.[k];
      const b = next?.[k];
      // Compare stringified so 100 and "100" don't register as a change.
      if (String(a ?? '') === String(b ?? '')) continue;
      out.push({ key: k, from: a, to: b });
    }
    return out;
  }, [prev, next]);

  return (
    <li className="relative pl-6 pb-5 last:pb-0">
      <span className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-brand-500 ring-4 ring-brand-500/15" />
      <span className="absolute left-[4.5px] top-5 bottom-0 w-px bg-surface-200 dark:bg-white/10 last:hidden" />

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-bold text-surface-900 dark:text-white capitalize">
          {String(entry.action || 'update').replace(/_/g, ' ')}
        </span>
        <span className="text-xs text-surface-500 dark:text-slate-400">
          by <strong className="text-surface-700 dark:text-slate-200">{entry.performed_by_name || 'System'}</strong>
        </span>
        <span className="text-[11px] text-surface-400 dark:text-slate-500 ml-auto font-mono">
          {formatDateTime(entry.performed_at)}
        </span>
      </div>

      {/* The reason the edit was requested/approved, when one was captured. */}
      {(next?.edit_reason || next?.expiry_reason) && (
        <div className="mt-2 rounded-lg border border-amber-300/60 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-0.5">
            {next?.edit_reason ? 'Reason for edit' : 'Expiry reason'}
          </p>
          <p className="text-xs text-amber-900 dark:text-amber-200">
            {next?.edit_reason || next?.expiry_reason}
          </p>
        </div>
      )}

      {changes.length > 0 ? (
        <div className="mt-2.5 space-y-1.5">
          {changes.map(({ key, from, to }) => (
            <div key={key} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-surface-600 dark:text-slate-400 min-w-[130px]">
                {labelFor(key)}
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 line-through font-mono max-w-[220px] truncate">
                {displayValue(from)}
              </span>
              <ArrowRight className="w-3 h-3 text-surface-400 dark:text-slate-500 flex-shrink-0" />
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono max-w-[220px] truncate">
                {displayValue(to)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-surface-400 dark:text-slate-500 italic">
          No field-level changes recorded for this entry.
        </p>
      )}
    </li>
  );
}

/* ── Main modal ──────────────────────────────────────────────────────────── */

export default function ClientDetailsModal({ client, onClose }) {
  const { token } = useAuth();
  const [tab, setTab] = useState('overview');
  const [full, setFull] = useState(client);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [copied, setCopied] = useState(null);

  const id = client?.id;

  /* Pull the complete record and its audit trail. The object handed in by the
     caller is often a partial row from a dashboard/report query, so we always
     refetch rather than trust it to hold every column. */
  useEffect(() => {
    let cancelled = false;
    if (!id || !token) { setLoading(false); return; }

    (async () => {
      setLoading(true);
      setHistoryError(null);
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [dRes, hRes] = await Promise.all([
          fetch(`/api/renewals/${id}`, { headers }),
          fetch(`/api/renewals/${id}/history`, { headers }),
        ]);
        if (cancelled) return;
        if (dRes.ok) setFull({ ...client, ...(await dRes.json()) });
        if (hRes.ok) setHistory(await hRes.json());
        else setHistoryError('Could not load the edit history.');
      } catch {
        if (!cancelled) setHistoryError('Could not load the edit history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id, token]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Escape to close, and lock background scroll while open. */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const copy = useCallback((text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  }, []);

  if (!client) return null;
  const c = full || client;

  const num = (v) => (v === null || v === undefined || v === '' ? null : parseFloat(v));
  const contractValue = num(c.value) || 0;
  const paidAmount = c.payment_status === 'Yes' ? (num(c.payment_amount) || 0) : 0;
  const balance = contractValue - paidAmount;
  const percentPaid = contractValue > 0 ? Math.round((paidAmount / contractValue) * 100) : 0;
  const profitVal = num(c.profit);
  const marginPct = contractValue > 0 && profitVal !== null
    ? ((profitVal / contractValue) * 100).toFixed(1)
    : null;

  const planLabel = c.plan_period === 'yearly_plan'
    ? `Yearly plan (${c.plan_duration || 1} ${(c.plan_duration || 1) > 1 ? 'years' : 'year'})`
    : (PLAN_LABELS[c.plan_period] || displayValue(c.plan_period));

  const TABS = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'commercials', label: 'Commercials', icon: IndianRupee },
    { id: 'billing', label: 'Invoice & Payment', icon: FileCheck },
    { id: 'lifecycle', label: 'Lifecycle', icon: ClipboardList },
    { id: 'audit', label: `Edit History${history.length ? ` (${history.length})` : ''}`, icon: History },
  ];

  const CopyBtn = ({ text, k }) => (
    <button
      onClick={() => copy(text, k)}
      className="p-1 rounded text-surface-400 hover:text-brand-500 hover:bg-surface-100 dark:hover:bg-white/10 transition-colors"
      title="Copy"
    >
      {copied === k ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );

  return createPortal(
    /* z-index sits above the report drilldown (z-100000), which is why the
       detail view used to open behind it. */
    <div
      className="fixed inset-0 z-[100010] flex flex-col bg-surface-50 dark:bg-[#0c0a12]"
      role="dialog"
      aria-modal="true"
      aria-label={`Full details for ${c.client_name}`}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-surface-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] backdrop-blur-xl">
        <div className="px-5 sm:px-8 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 flex-shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg sm:text-2xl font-black text-surface-900 dark:text-white truncate">
                  {c.client_name}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusColor(c.status)}`}>
                  {c.status || 'Active'}
                </span>
                {c.locked ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-100 dark:bg-white/10 text-surface-600 dark:text-slate-300 border border-surface-200 dark:border-white/10">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                    <Unlock className="w-3 h-3" /> Unlocked
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-surface-500 dark:text-slate-400">
                <span className="font-mono">{c.unique_id}</span>
                <CopyBtn text={c.unique_id} k="uid" />
                {c.service && <span>• {c.service}</span>}
                {c.vendor && <span>• Vendor: {c.vendor}</span>}
                {c.entity && <span>• Entity: {c.entity}</span>}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl text-surface-500 dark:text-slate-400 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Headline numbers — the four things people open this to check. */}
        <div className="px-5 sm:px-8 pb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-surface-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-500">Contract value</p>
            <p className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(contractValue)}</p>
          </div>
          <div className="rounded-xl border border-surface-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-500">Renewal date</p>
            <p className="text-base font-bold text-surface-900 dark:text-white">{c.renewal_date ? formatDate(c.renewal_date) : '—'}</p>
          </div>
          <div className="rounded-xl border border-surface-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-500">Days left</p>
            <p className="text-base font-bold text-surface-900 dark:text-white">
              {c.days_left === null || c.days_left === undefined ? '—'
                : c.days_left < 0 ? `Expired ${Math.abs(c.days_left)}d ago`
                : c.days_left === 0 ? 'Due today'
                : `${c.days_left} days`}
            </p>
          </div>
          <div className="rounded-xl border border-surface-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-500">Profit</p>
            <p className="text-base font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {profitVal !== null ? formatCurrency(profitVal) : '—'}
              {marginPct && <span className="text-[11px] text-surface-500 dark:text-slate-400 ml-1.5">({marginPct}%)</span>}
            </p>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <nav className="px-5 sm:px-8 flex gap-1 overflow-x-auto" role="tablist">
          {TABS.map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              role="tab"
              aria-selected={tab === tid}
              onClick={() => setTab(tid)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                tab === tid
                  ? 'border-brand-500 text-brand-600 dark:text-brand-300'
                  : 'border-transparent text-surface-500 dark:text-slate-400 hover:text-surface-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-8 py-6">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-surface-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading full record…
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-5">
          {tab === 'overview' && (
            <>
              <Section icon={Info} title="Identification">
                <Field label="Client name" value={displayValue(c.client_name)} />
                <Field label="RMT ID" value={displayValue(c.unique_id)} mono />
                <Field label="Reference ID / Invoice no." value={displayValue(c.reference_id)} mono />
                <Field label="Entity" value={displayValue(c.entity)} />
                <Field label="Status" value={displayValue(c.status)} />
                <Field label="Record locked" value={c.locked ? 'Yes' : 'No'} />
              </Section>

              <Section icon={Package} title="Service & plan">
                <Field label="Service" value={displayValue(c.service)} />
                <Field label="Product" value={displayValue(c.product)} />
                <Field label="Vendor" value={displayValue(c.vendor)} />
                <Field label="Quantity" value={displayValue(c.quantity)} />
                <Field label="Plan period" value={planLabel} />
                <Field label="Plan duration" value={displayValue(c.plan_duration)} />
                <Field label="Description" value={displayValue(c.description)} className="col-span-2 md:col-span-3" />
              </Section>

              <Section icon={User} title="Contacts">
                <Field label="Owner / contact person" value={displayValue(c.owner)} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-500 mb-1">Client email</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-surface-900 dark:text-slate-100 truncate">{displayValue(c.client_email)}</p>
                    {c.client_email && <CopyBtn text={c.client_email} k="cemail" />}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-500 mb-1">Sales email</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-surface-900 dark:text-slate-100 truncate">{displayValue(c.sales_email)}</p>
                    {c.sales_email && <CopyBtn text={c.sales_email} k="semail" />}
                  </div>
                </div>
                <Field label="Contact number" value={displayValue(c.contact_number)} mono />
              </Section>

              <Section icon={Clock} title="Record metadata">
                <Field label="Created at" value={c.created_at ? formatDateTime(c.created_at) : '—'} />
                <Field label="Last updated" value={c.updated_at ? formatDateTime(c.updated_at) : '—'} />
                <Field label="Created by (user ID)" value={displayValue(c.created_by)} mono />
              </Section>
            </>
          )}

          {tab === 'commercials' && (
            <>
              <Section icon={IndianRupee} title="Contract economics">
                <Field label="Contract value" value={formatCurrency(contractValue)} mono />
                <Field label="Profit" value={profitVal !== null ? formatCurrency(profitVal) : '—'} mono />
                <Field label="Margin" value={marginPct ? `${marginPct}%` : '—'} mono />
              </Section>

              <Section icon={Truck} title="Purchase side (cost to us)">
                <Field label="Purchase cost (unit)" value={num(c.purchase_cost) !== null ? formatCurrency(c.purchase_cost) : '—'} mono />
                <Field label="Total purchase cost" value={num(c.total_purchase_cost) !== null ? formatCurrency(c.total_purchase_cost) : '—'} mono />
                <Field label="Vendor" value={displayValue(c.vendor)} />
              </Section>

              <Section icon={TrendingUp} title="Sales side (price to client)">
                <Field label="Sales cost (unit)" value={num(c.sales_cost) !== null ? formatCurrency(c.sales_cost) : '—'} mono />
                <Field label="Total sales cost" value={num(c.total_sales_cost) !== null ? formatCurrency(c.total_sales_cost) : '—'} mono />
                <Field label="Quantity" value={displayValue(c.quantity)} mono />
              </Section>
            </>
          )}

          {tab === 'billing' && (
            <>
              <Section icon={FileText} title="Quotation & invoice">
                <Field label="Quotation number" value={c.quotation_number ? `#${c.quotation_number}` : 'Not added'} mono />
                <Field label="Invoice status" value={displayValue(c.invoice_status)} />
                <Field label="Invoice number" value={displayValue(c.invoice_number)} mono />
                <Field label="Invoice value" value={num(c.invoice_value) !== null ? formatCurrency(c.invoice_value) : '—'} mono />
                <Field label="Invoice sent date" value={c.invoice_sent_date ? formatDate(c.invoice_sent_date) : '—'} />
                <Field label="Reference ID" value={displayValue(c.reference_id)} mono />
              </Section>

              <Section icon={IndianRupee} title="Payment" cols={4}>
                <Field label="Payment status" value={displayValue(c.payment_status)} />
                <Field label="Amount received" value={num(c.payment_amount) !== null ? formatCurrency(c.payment_amount) : '—'} mono />
                <Field label="Received date" value={c.payment_received_date ? formatDate(c.payment_received_date) : '—'} />
                <Field label="Balance outstanding" value={formatCurrency(balance)} mono />
              </Section>

              {contractValue > 0 && (
                <section className="rounded-2xl border border-surface-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-surface-900 dark:text-white mb-3">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                    Payment progress
                  </h3>
                  <div className="flex justify-between text-xs font-bold text-surface-700 dark:text-slate-300 mb-1.5">
                    <span>{percentPaid}% paid</span>
                    <span>{100 - percentPaid}% outstanding</span>
                  </div>
                  <div className="w-full bg-surface-200 dark:bg-white/10 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, percentPaid))}%` }}
                    />
                  </div>
                </section>
              )}
            </>
          )}

          {tab === 'lifecycle' && (
            <>
              <Section icon={CalendarClock} title="Renewal state">
                <Field label="Renewal date" value={c.renewal_date ? formatDate(c.renewal_date) : '—'} />
                <Field
                  label="Days left"
                  value={c.days_left === null || c.days_left === undefined ? '—'
                    : c.days_left < 0 ? `Expired ${Math.abs(c.days_left)} days ago`
                    : c.days_left === 0 ? 'Due today' : `${c.days_left} days`}
                />
                <Field label="Renewal confirmation" value={displayValue(c.renewal_confirmation)} />
              </Section>

              <Section icon={Phone} title="Follow-up" cols={2}>
                <Field label="Follow-up status" value={displayValue(c.follow_up_status)} />
                <Field label="Follow-up remarks" value={displayValue(c.follow_up_remarks)} />
              </Section>

              {/* The edit-approval workflow and its reason, surfaced rather than buried. */}
              <Section icon={ShieldCheck} title="Edit approval workflow" cols={2}>
                <Field label="Edit status" value={displayValue(c.edit_status)} />
                <Field label="Reason given for edit" value={displayValue(c.edit_reason)} />
              </Section>

              {c.expiry_reason && (
                <section className="rounded-2xl border border-rose-300/60 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-rose-800 dark:text-rose-300 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Expiry reason
                  </h3>
                  <p className="text-sm text-rose-900 dark:text-rose-200">{c.expiry_reason}</p>
                </section>
              )}
            </>
          )}

          {tab === 'audit' && (
            <section className="rounded-2xl border border-surface-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-surface-900 dark:text-white mb-4">
                <History className="w-4 h-4 text-brand-500" />
                Every edit made to this record
              </h3>

              {historyError && (
                <p className="text-sm text-rose-600 dark:text-rose-400 mb-3">{historyError}</p>
              )}

              {!loading && history.length === 0 && !historyError ? (
                <div className="py-10 text-center">
                  <Hash className="w-7 h-7 mx-auto mb-2 text-surface-300 dark:text-slate-600" />
                  <p className="text-sm font-semibold text-surface-700 dark:text-slate-300">No edits recorded yet</p>
                  <p className="text-xs text-surface-500 dark:text-slate-500 mt-1">
                    Changes to this contract will appear here with who made them and why.
                  </p>
                </div>
              ) : (
                <ul className="relative">
                  {history.map((h, i) => <AuditEntry key={h.id || i} entry={h} />)}
                </ul>
              )}
            </section>
          )}
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="flex-shrink-0 border-t border-surface-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] backdrop-blur-xl px-5 sm:px-8 py-3 flex items-center justify-between gap-4">
        <p className="text-xs text-surface-500 dark:text-slate-400 truncate">
          <Tag className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
          <span className="font-mono">{c.unique_id}</span>
          {c.updated_at && <span className="ml-3">Last updated {formatDateTime(c.updated_at)}</span>}
        </p>
        <button onClick={onClose} className="btn-secondary flex-shrink-0">Close</button>
      </footer>
    </div>,
    document.body
  );
}
