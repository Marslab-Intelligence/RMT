import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Mail, Play, Square, AlertCircle, Calendar, Filter, Search, 
  ChevronDown, ChevronRight, CheckCircle2, XCircle, Layers, RefreshCw, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTime } from '../utils/formatters';

export default function EmailAutomation() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('start');
  const [actionLogs, setActionLogs] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('email-logs'); // 'email-logs' or 'action-logs'

  // Filter & Grouping States
  const [groupView, setGroupView] = useState('date'); // 'date', 'month', or 'flat'
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState(null); // 'start' or 'stop'
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [autoRes, emailRes] = await Promise.all([
        fetch('/api/automation/status', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/dashboard/email-logs?limit=all', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (autoRes.ok) {
        const data = await autoRes.json();
        setStatus(data.status);
        setActionLogs(data.logs || []);
      }
      if (emailRes.ok) {
        setEmailLogs(await emailRes.json());
      }
    } catch (err) {
      console.error('Failed to load automation data:', err);
      toast.error('Failed to fetch automation logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }

    const handleToggledEvent = (e) => {
      setStatus(e.detail.status);
      setActionLogs(e.detail.logs);
      fetch('/api/dashboard/email-logs?limit=all', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => { if (res.ok) return res.json(); })
      .then(logs => { if (logs) setEmailLogs(logs); })
      .catch(console.error);
    };

    window.addEventListener('rmt_automation_toggled', handleToggledEvent);
    return () => {
      window.removeEventListener('rmt_automation_toggled', handleToggledEvent);
    };
  }, [token]);

  const handleToggleClick = (action) => {
    setModalAction(action);
    setNote('');
    setIsModalOpen(true);
  };

  const handleConfirmToggle = async (e) => {
    e.preventDefault();
    if (!note.trim()) {
      toast.error('Please provide a reason / note');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/automation/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: modalAction, note })
      });

      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        setActionLogs(data.logs);
        toast.success(`Email automation successfully ${modalAction === 'start' ? 'started' : 'stopped'}`);
        setIsModalOpen(false);
        // Refresh email logs too
        const emailRes = await fetch('/api/dashboard/email-logs?limit=all', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (emailRes.ok) {
          setEmailLogs(await emailRes.json());
        }
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update email automation status');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleGroupCollapse = (key) => {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Unique Months for Filter Dropdown
  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    emailLogs.forEach(log => {
      if (log.sent_at) {
        const d = new Date(log.sent_at);
        const yyyymm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthsSet.add(yyyymm);
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [emailLogs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return emailLogs.filter(log => {
      const sentDate = log.sent_at ? new Date(log.sent_at) : null;

      // Month Filter
      if (selectedMonth !== 'all' && sentDate) {
        const yyyymm = `${sentDate.getFullYear()}-${String(sentDate.getMonth() + 1).padStart(2, '0')}`;
        if (yyyymm !== selectedMonth) return false;
      }

      // Date Filter
      if (selectedDate && sentDate) {
        const yyyymmdd = sentDate.toISOString().split('T')[0];
        if (yyyymmdd !== selectedDate) return false;
      }

      // Search Filter
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const client = (log.client_name || '').toLowerCase();
        const recipient = (log.recipient_email || '').toLowerCase();
        const type = (log.email_type || '').toLowerCase();
        const subject = (log.subject || '').toLowerCase();
        const service = (log.service || '').toLowerCase();
        if (
          !client.includes(term) &&
          !recipient.includes(term) &&
          !type.includes(term) &&
          !subject.includes(term) &&
          !service.includes(term)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [emailLogs, selectedMonth, selectedDate, searchTerm]);

  // Date-wise Grouped Logs
  const dateGroupedLogs = useMemo(() => {
    const groups = {};
    filteredLogs.forEach(log => {
      if (!log.sent_at) return;
      const d = new Date(log.sent_at);
      const dateKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const displayDate = d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey,
          displayDate,
          logs: [],
          sentCount: 0,
          failedCount: 0
        };
      }
      groups[dateKey].logs.push(log);
      if (log.status === 'sent') groups[dateKey].sentCount++;
      else groups[dateKey].failedCount++;
    });

    return Object.values(groups).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [filteredLogs]);

  // Month-wise Grouped Logs
  const monthGroupedLogs = useMemo(() => {
    const groups = {};
    filteredLogs.forEach(log => {
      if (!log.sent_at) return;
      const d = new Date(log.sent_at);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const displayMonth = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!groups[monthKey]) {
        groups[monthKey] = {
          monthKey,
          displayMonth,
          logs: [],
          sentCount: 0,
          failedCount: 0
        };
      }
      groups[monthKey].logs.push(log);
      if (log.status === 'sent') groups[monthKey].sentCount++;
      else groups[monthKey].failedCount++;
    });

    return Object.values(groups).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [filteredLogs]);

  const formatEmailTypeBadge = (type) => {
    const normalized = (type || '').toLowerCase().trim();

    if (normalized.includes('payment_received') || normalized.includes('payment received')) {
      return {
        label: '💳 Payment Received',
        color: 'bg-emerald-200 text-[#013220] border-emerald-600 font-black',
        style: { backgroundColor: '#dcfce7', color: '#013220', borderColor: '#16a34a', fontWeight: '900' }
      };
    }

    if (normalized.includes('renewal_status') || normalized.includes('status_update') || normalized.includes('status update') || normalized.includes('renewal status update')) {
      return {
        label: '🔄 Renewal Status Update',
        color: 'bg-slate-200 text-[#000000] border-slate-600 font-black',
        style: { backgroundColor: '#e2e8f0', color: '#000000', borderColor: '#475569', fontWeight: '900' }
      };
    }

    switch (normalized) {
      case '30_day_reminder': return { label: '📧 30-Day Reminder', color: 'bg-blue-200 text-[#000000] border-blue-500 font-black', style: { backgroundColor: '#dbeafe', color: '#000000', borderColor: '#2563eb', fontWeight: '900' } };
      case '20_day_reminder': return { label: '📧 20-Day Reminder', color: 'bg-indigo-200 text-[#000000] border-indigo-500 font-black', style: { backgroundColor: '#e0e7ff', color: '#000000', borderColor: '#4f46e5', fontWeight: '900' } };
      case '15_day_reminder': return { label: '📧 15-Day Reminder', color: 'bg-amber-200 text-[#000000] border-amber-500 font-black', style: { backgroundColor: '#fef3c7', color: '#000000', borderColor: '#d97706', fontWeight: '900' } };
      case '10_day_reminder': return { label: '📧 10-Day Reminder', color: 'bg-orange-200 text-[#000000] border-orange-500 font-black', style: { backgroundColor: '#ffedd5', color: '#000000', borderColor: '#ea580c', fontWeight: '900' } };
      case '5_day_reminder':  return { label: '📧 5-Day Reminder',  color: 'bg-rose-200 text-[#000000] border-rose-500 font-black', style: { backgroundColor: '#ffe4e6', color: '#000000', borderColor: '#e11d48', fontWeight: '900' } };
      case '3_day_reminder':  return { label: '📧 3-Day Reminder',  color: 'bg-red-200 text-[#000000] border-red-500 font-black', style: { backgroundColor: '#fee2e2', color: '#000000', borderColor: '#ef4444', fontWeight: '900' } };
      case 'sales_special_15_day': return { label: '🚨 CST 15-Day Followup', color: 'bg-purple-200 text-[#000000] border-purple-500 font-black', style: { backgroundColor: '#f3e8ff', color: '#000000', borderColor: '#9333ea', fontWeight: '900' } };
      case 'sales_special_5_day':  return { label: '🚨 CST 5-Day Followup',  color: 'bg-pink-200 text-[#000000] border-pink-500 font-black', style: { backgroundColor: '#fce7f3', color: '#000000', borderColor: '#ec4899', fontWeight: '900' } };
      case 'sales_special_3_day':  return { label: '🚨 CST 3-Day Followup',  color: 'bg-rose-200 text-[#000000] border-rose-500 font-black', style: { backgroundColor: '#ffe4e6', color: '#000000', borderColor: '#e11d48', fontWeight: '900' } };
      case 'renewal_expired': return { label: '⚠️ Expiry Alert', color: 'bg-red-200 text-[#000000] border-red-500 font-black', style: { backgroundColor: '#fee2e2', color: '#000000', borderColor: '#ef4444', fontWeight: '900' } };
      case 'automation_toggle': return { label: '⚙️ Automation Toggle', color: 'bg-slate-200 text-[#000000] border-slate-500 font-black', style: { backgroundColor: '#e2e8f0', color: '#000000', borderColor: '#64748b', fontWeight: '900' } };
      case 'manual_email': return { label: '✉️ Manual Email', color: 'bg-teal-200 text-[#013220] border-teal-500 font-black', style: { backgroundColor: '#ccfbf1', color: '#013220', borderColor: '#14b8a6', fontWeight: '900' } };
      default: return { label: type ? type.replace(/_/g, ' ') : 'General', color: 'bg-slate-200 text-[#000000] border-slate-500 font-black', style: { backgroundColor: '#e2e8f0', color: '#000000', borderColor: '#64748b', fontWeight: '900' } };
    }
  };

  const formatMonthLabel = (yyyymm) => {
    const [y, m] = yyyymm.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Header / Intro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <Mail className="w-7 h-7 text-brand-500" />
            Email Automation Settings
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Monitor outbound client renewal notifications and control the automation scheduler.
          </p>
        </div>

        {/* Current Status Badge & Controls */}
        <div className="flex items-center gap-4 bg-white/40 dark:bg-stone-900/30 p-3 rounded-2xl border border-surface-200/50 dark:border-surface-700/40 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              {status === 'start' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${status === 'start' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] text-surface-400 uppercase tracking-wider font-semibold">Scheduler Status</span>
              <span className="text-sm font-bold text-surface-900 dark:text-white">
                {status === 'start' ? 'Active & Sending' : 'Stopped / Paused'}
              </span>
            </div>
          </div>

          {/* Start/Stop Buttons */}
          {user?.role === 'admin' && (
            <div className="flex items-center gap-2 border-l border-surface-200 dark:border-surface-700/60 pl-4 ml-1">
              <button
                onClick={() => handleToggleClick('start')}
                disabled={status === 'start'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  status === 'start'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 cursor-default border border-emerald-500/30'
                    : 'bg-surface-100 hover:bg-emerald-50 text-surface-700 hover:text-emerald-600 border border-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-emerald-950/20 dark:border-surface-700'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Start
              </button>
              <button
                onClick={() => handleToggleClick('stop')}
                disabled={status === 'stop'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  status === 'stop'
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-default border border-rose-500/30'
                    : 'bg-surface-100 hover:bg-rose-50 text-surface-700 hover:text-rose-600 border border-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-rose-950/20 dark:border-surface-700'
                }`}
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-200 dark:border-surface-700 gap-2">
        <button
          onClick={() => setActiveTab('email-logs')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'email-logs'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'
          }`}
        >
          <Mail className="w-4 h-4" />
          Email Logs
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400">
            {emailLogs.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('action-logs')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'action-logs'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Scheduler Actions Log
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-surface-500/10 text-surface-600 dark:text-surface-400">
            {actionLogs.length}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'email-logs' ? (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
          <div className="card p-4 bg-white/50 dark:bg-stone-900/40 border border-surface-200/60 dark:border-surface-700/40 backdrop-blur-xl rounded-2xl space-y-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Grouping Toggle Buttons */}
              <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800/60 p-1 rounded-xl border border-surface-200/50 dark:border-surface-700/40">
                <button
                  onClick={() => setGroupView('date')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    groupView === 'date'
                      ? 'bg-white dark:bg-stone-800 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Date-wise (Daily)
                </button>
                <button
                  onClick={() => setGroupView('month')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    groupView === 'month'
                      ? 'bg-white dark:bg-stone-800 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Month-wise
                </button>
                <button
                  onClick={() => setGroupView('flat')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    groupView === 'flat'
                      ? 'bg-white dark:bg-stone-800 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Flat List
                </button>
              </div>

              {/* Filters: Month, Date, Search, Refresh */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Month Dropdown */}
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="appearance-none bg-surface-50 dark:bg-surface-800/70 border border-surface-200 dark:border-surface-700 text-surface-800 dark:text-surface-200 text-xs font-semibold rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="all">🗓️ All Months</option>
                    {availableMonths.map(m => (
                      <option key={m} value={m}>
                        {formatMonthLabel(m)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 pointer-events-none text-surface-400" />
                </div>

                {/* Date Picker */}
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-surface-50 dark:bg-surface-800/70 border border-surface-200 dark:border-surface-700 text-surface-800 dark:text-surface-200 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-surface-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search client, email, subject..."
                    className="w-full bg-surface-50 dark:bg-surface-800/70 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder-surface-400 text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-surface-400 hover:text-surface-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Reset Filters */}
                {(selectedMonth !== 'all' || selectedDate || searchTerm) && (
                  <button
                    onClick={() => {
                      setSelectedMonth('all');
                      setSelectedDate('');
                      setSearchTerm('');
                    }}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold px-2"
                  >
                    Clear Filters
                  </button>
                )}

                {/* Refresh Button */}
                <button
                  onClick={fetchData}
                  title="Refresh logs"
                  className="p-2 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-300 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Live Filter Summary */}
            <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 border-t border-surface-200/40 dark:border-surface-700/30 pt-3">
              <div>
                Showing <strong>{filteredLogs.length}</strong> of <strong>{emailLogs.length}</strong> total email logs
                <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                  (✓ Preserved permanently, including logs for deleted clients)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {filteredLogs.filter(l => l.status === 'sent').length} Sent
                </span>
                {filteredLogs.filter(l => l.status !== 'sent').length > 0 && (
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                    <XCircle className="w-3.5 h-3.5" />
                    {filteredLogs.filter(l => l.status !== 'sent').length} Failed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* DATE-WISE VIEW */}
          {groupView === 'date' && (
            <div className="space-y-4">
              {dateGroupedLogs.length === 0 ? (
                <div className="card p-12 text-center text-surface-400">No email logs match your current filter criteria.</div>
              ) : (
                dateGroupedLogs.map(group => {
                  const isCollapsed = collapsedGroups[group.dateKey];
                  return (
                    <div
                      key={group.dateKey}
                      className="card overflow-hidden bg-white/45 dark:bg-stone-900/25 border border-surface-200/50 dark:border-surface-700/30 backdrop-blur-xl rounded-2xl shadow-sm"
                    >
                      {/* Date Group Header */}
                      <div
                        onClick={() => toggleGroupCollapse(group.dateKey)}
                        className="p-4 bg-surface-50/50 dark:bg-surface-900/40 border-b border-surface-200/60 dark:border-surface-700/40 flex items-center justify-between cursor-pointer hover:bg-surface-100/50 dark:hover:bg-surface-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-surface-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-surface-400" />
                          )}
                          <Calendar className="w-4 h-4 text-brand-500" />
                          <h3 className="text-sm font-bold text-surface-900 dark:text-white">
                            {group.displayDate}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                            {group.logs.length} {group.logs.length === 1 ? 'Email' : 'Emails'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            ✓ {group.sentCount} Sent
                          </span>
                          {group.failedCount > 0 && (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                              ✗ {group.failedCount} Failed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Date Group Table Content */}
                      {!isCollapsed && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-surface-50/30 dark:bg-surface-900/20 border-b border-surface-200/40 dark:border-surface-700/30 text-surface-500">
                              <tr>
                                <th className="px-3 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap">Time</th>
                                <th className="px-3 py-2.5 font-semibold uppercase tracking-wider">Client Name & Service</th>
                                <th className="px-3 py-2.5 font-semibold uppercase tracking-wider">Email Type</th>
                                <th className="px-3 py-2.5 font-semibold uppercase tracking-wider">Recipient</th>
                                <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-right pr-4">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-200/40 dark:divide-surface-700/30">
                              {group.logs.map(log => {
                                const badge = formatEmailTypeBadge(log.email_type);
                                return (
                                  <tr key={log.id} className="hover:bg-surface-50/40 dark:hover:bg-surface-700/20 transition-colors">
                                    <td className="px-3 py-3 text-surface-600 dark:text-surface-400 font-medium whitespace-nowrap">
                                      {formatDateTime(log.sent_at)}
                                    </td>
                                    <td className="px-3 py-3 max-w-[160px] truncate">
                                      <div className="flex flex-col">
                                        <span className="font-bold text-surface-950 dark:text-white flex items-center gap-1.5 truncate">
                                          {log.client_name}
                                          {!log.renewal_id && log.client_name !== 'System / Automation' && (
                                            <span className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium border border-amber-500/30 shrink-0" title="Client deleted from renewals page, log preserved">
                                              Deleted
                                            </span>
                                          )}
                                        </span>
                                        {log.service && (
                                          <span className="text-[10px] text-surface-500 dark:text-surface-400 truncate">{log.service}</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                      <span
                                        className={`px-2.5 py-1 rounded text-[11px] font-black border ${badge.color}`}
                                        style={badge.style}
                                      >
                                        {badge.label}
                                      </span>
                                    </td>
                                    <td className="px-3 py-3 text-surface-700 dark:text-surface-300 font-medium max-w-[200px] truncate" title={log.recipient_email}>
                                      {log.recipient_email}
                                    </td>
                                    <td className="px-3 py-3 text-right pr-4 whitespace-nowrap">
                                      <span
                                        className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black border"
                                        style={
                                          log.status === 'sent'
                                            ? { backgroundColor: '#dcfce7', color: '#013220', borderColor: '#16a34a', fontWeight: '900' }
                                            : { backgroundColor: '#fee2e2', color: '#450a0a', borderColor: '#ef4444', fontWeight: '900' }
                                        }
                                      >
                                        {log.status.toUpperCase()}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* MONTH-WISE VIEW */}
          {groupView === 'month' && (
            <div className="space-y-4">
              {monthGroupedLogs.length === 0 ? (
                <div className="card p-12 text-center text-surface-400">No email logs match your current filter criteria.</div>
              ) : (
                monthGroupedLogs.map(group => {
                  const isCollapsed = collapsedGroups[group.monthKey];
                  return (
                    <div
                      key={group.monthKey}
                      className="card overflow-hidden bg-white/45 dark:bg-stone-900/25 border border-surface-200/50 dark:border-surface-700/30 backdrop-blur-xl rounded-2xl shadow-sm"
                    >
                      {/* Month Group Header */}
                      <div
                        onClick={() => toggleGroupCollapse(group.monthKey)}
                        className="p-4 bg-surface-50/60 dark:bg-surface-900/50 border-b border-surface-200/60 dark:border-surface-700/40 flex items-center justify-between cursor-pointer hover:bg-surface-100/50 dark:hover:bg-surface-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-surface-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-surface-400" />
                          )}
                          <Calendar className="w-5 h-5 text-brand-500" />
                          <div>
                            <h3 className="text-base font-bold text-surface-900 dark:text-white">
                              {group.displayMonth}
                            </h3>
                            <p className="text-[11px] text-surface-500">
                              Monthly outbound reminder audit
                            </p>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 ml-2">
                            {group.logs.length} Total Emails
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {group.sentCount} Sent
                          </span>
                          {group.failedCount > 0 && (
                            <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> {group.failedCount} Failed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Month Table Content */}
                      {!isCollapsed && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-surface-50/30 dark:bg-surface-900/20 border-b border-surface-200/40 dark:border-surface-700/30 text-surface-500">
                              <tr>
                                <th className="px-3 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap">Date & Time</th>
                                <th className="px-3 py-2.5 font-semibold uppercase tracking-wider">Client Name & Service</th>
                                <th className="px-3 py-2.5 font-semibold uppercase tracking-wider">Email Type</th>
                                <th className="px-3 py-2.5 font-semibold uppercase tracking-wider">Recipient</th>
                                <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-right pr-4">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-200/40 dark:divide-surface-700/30">
                              {group.logs.map(log => {
                                const badge = formatEmailTypeBadge(log.email_type);
                                return (
                                  <tr key={log.id} className="hover:bg-surface-50/40 dark:hover:bg-surface-700/20 transition-colors">
                                    <td className="px-3 py-3 text-surface-600 dark:text-surface-400 font-medium whitespace-nowrap">
                                      {formatDateTime(log.sent_at)}
                                    </td>
                                    <td className="px-3 py-3 max-w-[160px] truncate">
                                      <div className="flex flex-col">
                                        <span className="font-bold text-surface-950 dark:text-white flex items-center gap-1.5 truncate">
                                          {log.client_name}
                                          {!log.renewal_id && log.client_name !== 'System / Automation' && (
                                            <span className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium border border-amber-500/30 shrink-0" title="Client deleted from renewals page, log preserved">
                                              Deleted
                                            </span>
                                          )}
                                        </span>
                                        {log.service && (
                                          <span className="text-[10px] text-surface-500 dark:text-surface-400 truncate">{log.service}</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                                        {badge.label}
                                      </span>
                                    </td>
                                    <td className="px-3 py-3 text-surface-700 dark:text-surface-300 font-medium max-w-[200px] truncate" title={log.recipient_email}>
                                      {log.recipient_email}
                                    </td>
                                    <td className="px-3 py-3 text-right pr-4 whitespace-nowrap">
                                      <span
                                        className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black border"
                                        style={
                                          log.status === 'sent'
                                            ? { backgroundColor: '#dcfce7', color: '#013220', borderColor: '#16a34a', fontWeight: '900' }
                                            : { backgroundColor: '#fee2e2', color: '#450a0a', borderColor: '#ef4444', fontWeight: '900' }
                                        }
                                      >
                                        {log.status.toUpperCase()}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* FLAT TABLE VIEW */}
          {groupView === 'flat' && (
            <div className="card overflow-hidden bg-white/45 dark:bg-stone-900/25 border border-surface-200/50 dark:border-surface-700/30 backdrop-blur-xl rounded-2xl shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-50/50 dark:bg-surface-900/40 border-b border-surface-200 dark:border-surface-700">
                    <tr>
                      <th className="px-3 py-3 font-semibold text-surface-500 uppercase tracking-wider whitespace-nowrap">Date & Time</th>
                      <th className="px-3 py-3 font-semibold text-surface-500 uppercase tracking-wider">Client Name & Service</th>
                      <th className="px-3 py-3 font-semibold text-surface-500 uppercase tracking-wider">Email Type</th>
                      <th className="px-3 py-3 font-semibold text-surface-500 uppercase tracking-wider">Recipient</th>
                      <th className="px-3 py-3 font-semibold text-surface-500 uppercase tracking-wider text-right pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200/50 dark:divide-surface-700/40">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-12 text-surface-400">No email logs found</td>
                      </tr>
                    ) : (
                      filteredLogs.map(log => {
                        const badge = formatEmailTypeBadge(log.email_type);
                        return (
                          <tr key={log.id} className="hover:bg-surface-50/40 dark:hover:bg-surface-700/20 transition-colors">
                            <td className="px-3 py-3 text-surface-600 dark:text-surface-400 font-medium whitespace-nowrap">
                              {formatDateTime(log.sent_at)}
                            </td>
                            <td className="px-3 py-3 max-w-[160px] truncate">
                              <div className="flex flex-col">
                                <span className="font-bold text-surface-950 dark:text-white flex items-center gap-1.5 truncate">
                                  {log.client_name}
                                  {!log.renewal_id && log.client_name !== 'System / Automation' && (
                                    <span className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium border border-amber-500/30 shrink-0" title="Client deleted from renewals page, log preserved">
                                      Deleted
                                    </span>
                                  )}
                                </span>
                                {log.service && (
                                  <span className="text-[10px] text-surface-500 dark:text-surface-400 truncate">{log.service}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-surface-700 dark:text-surface-300 font-medium max-w-[200px] truncate" title={log.recipient_email}>
                              {log.recipient_email}
                            </td>
                            <td className="px-3 py-3 text-right pr-4 whitespace-nowrap">
                              <span
                                className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black border"
                                style={
                                  log.status === 'sent'
                                    ? { backgroundColor: '#dcfce7', color: '#013220', borderColor: '#16a34a', fontWeight: '900' }
                                    : { backgroundColor: '#fee2e2', color: '#450a0a', borderColor: '#ef4444', fontWeight: '900' }
                                }
                              >
                                {log.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* SCHEDULER ACTION LOGS TAB */
        <div className="card shadow-md overflow-hidden bg-white/45 dark:bg-stone-900/25 border border-surface-200/50 dark:border-surface-700/30 backdrop-blur-xl rounded-2xl">
          <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/20 dark:bg-surface-900/10">
            <h2 className="text-base font-bold text-surface-900 dark:text-white">Scheduler Actions Log</h2>
            <p className="text-xs text-surface-500">Audit trail of who paused/resumed email reminders and why</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-surface-50/50 dark:bg-surface-900/40 border-b border-surface-200 dark:border-surface-700">
                <tr>
                  <th className="px-4 py-3.5 font-semibold text-surface-500 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3.5 font-semibold text-surface-500 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3.5 font-semibold text-surface-500 uppercase tracking-wider">Performed By</th>
                  <th className="px-4 py-3.5 font-semibold text-surface-500 uppercase tracking-wider">Reason / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200/50 dark:divide-surface-700/40">
                {actionLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-12 text-surface-400">No action logs found</td>
                  </tr>
                ) : (
                  actionLogs.map(log => (
                    <tr key={log.id} className="hover:bg-surface-50/40 dark:hover:bg-surface-700/20 transition-colors">
                      <td className="px-4 py-4 text-surface-600 dark:text-surface-400">{formatDateTime(log.performed_at)}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                          log.action === 'start'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/50'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/50'
                        }`}>
                          {log.action === 'start' ? 'Started' : 'Stopped'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-surface-700 dark:text-surface-300 font-semibold flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[9px] font-bold">
                          {log.performed_by_name?.charAt(0) || 'U'}
                        </div>
                        {log.performed_by_name}
                      </td>
                      <td className="px-4 py-4 text-surface-600 dark:text-surface-400 max-w-xs whitespace-normal break-words font-medium">
                        {log.note}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation & Note Popup Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-surface-200/80 dark:border-surface-800 overflow-hidden transform scale-100 transition-all duration-300">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-brand-600 dark:text-brand-400">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-lg font-bold text-surface-900 dark:text-white">
                  Confirm Automation Update
                </h3>
              </div>
              <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                Are you sure you want to <strong className={modalAction === 'start' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                  {modalAction === 'start' ? 'START / RESUME' : 'STOP / PAUSE'}
                </strong> the outbound email scheduler?
              </p>
              
              <form onSubmit={handleConfirmToggle} className="space-y-4 mt-2">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 mb-1.5 uppercase tracking-wider">
                    Reason / Note for this action
                  </label>
                  <textarea
                    required
                    rows="3"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Starting automatic reminders after staging, pausing for server maintenance..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/40 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-md ${
                      modalAction === 'start'
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10'
                        : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10'
                    }`}
                  >
                    {submitting ? 'Updating...' : 'Submit & Acknowledge'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
