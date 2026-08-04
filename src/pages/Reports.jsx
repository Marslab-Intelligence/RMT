import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, TrendingUp, TrendingDown, Mail, AlertCircle, CheckCircle2, Clock, 
  Activity, Zap, Users, ArrowUpRight, Maximize2, Minimize2, X, Search, Download, Filter,
  Layers, Building2, ChevronRight, PieChart as PieIcon, ExternalLink, Calendar, Shield, ShieldAlert, ArrowRight, XCircle
} from 'lucide-react';
import { formatCurrency, formatCompactCurrency, formatDateTime } from '../utils/formatters';
import ThreeDGraph from '../components/ThreeDGraph';
import AreaGraphVisualizer from '../components/AreaGraphVisualizer';
import ServiceDistributionPieChart from '../components/ServiceDistributionPieChart';
import ClientDetailsModal from '../components/ClientDetailsModal';

const STATUS_COLORS = {
  'Active': '#3b82f6',          // Blue
  'Pending Renewal': '#f97316',  // Orange
  'Renewed': '#10b981',          // Emerald
  'Expired': '#ef4444',          // Red
  'Closed': '#64748b'            // Slate
};

const formatEmailTypeBadge = (type) => {
  switch (type) {
    case '30_day_reminder': return { label: '30-Day Reminder', color: 'bg-blue-100 text-blue-950 border-blue-400 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-700/60 font-bold' };
    case '20_day_reminder': return { label: '20-Day Reminder', color: 'bg-indigo-100 text-indigo-950 border-indigo-400 dark:bg-indigo-950/70 dark:text-indigo-200 dark:border-indigo-700/60 font-bold' };
    case '15_day_reminder': return { label: '15-Day Reminder', color: 'bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700/60 font-bold' };
    case '10_day_reminder': return { label: '10-Day Reminder', color: 'bg-orange-100 text-orange-950 border-orange-400 dark:bg-orange-950/70 dark:text-orange-200 dark:border-orange-700/60 font-bold' };
    case '5_day_reminder':  return { label: '5-Day Reminder',  color: 'bg-rose-100 text-rose-950 border-rose-400 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-700/60 font-bold' };
    case '3_day_reminder':  return { label: '3-Day Reminder',  color: 'bg-red-100 text-red-950 border-red-400 dark:bg-red-950/70 dark:text-red-200 dark:border-red-700/60 font-bold' };
    case 'sales_special_15_day': return { label: 'CST 15-Day Followup', color: 'bg-purple-100 text-purple-950 border-purple-400 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-700/60 font-bold' };
    case 'sales_special_5_day':  return { label: 'CST 5-Day Followup',  color: 'bg-pink-100 text-pink-950 border-pink-400 dark:bg-pink-950/70 dark:text-pink-200 dark:border-pink-700/60 font-bold' };
    case 'sales_special_3_day':  return { label: 'CST 3-Day Followup',  color: 'bg-rose-100 text-rose-950 border-rose-400 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-700/60 font-bold' };
    case 'renewal_expired': return { label: 'Expiry Alert', color: 'bg-red-100 text-red-950 border-red-400 dark:bg-red-950/70 dark:text-red-200 dark:border-red-700/60 font-bold' };
    case 'automation_toggle': return { label: 'Automation Toggle', color: 'bg-slate-200 text-slate-950 border-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 font-bold' };
    case 'payment_received': return { label: 'Payment Received', color: 'bg-emerald-100 text-emerald-950 border-emerald-400 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-700/60 font-bold' };
    default: return { label: type ? type.replace(/_/g, ' ') : 'General', color: 'bg-slate-200 text-slate-950 border-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 font-bold' };
  }
};

const exportToCSV = (data, filename) => {
  if (!data || !data.length) return;
  const keys = Object.keys(data[0]);
  const headers = keys.join(',');
  const rows = data.map(obj => keys.map(k => `"${(obj[k] ?? '').toString().replace(/"/g, '""')}"`).join(','));
  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function Reports() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [statusData, setStatusData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [serviceData, setServiceData] = useState([]);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter states for Admin Telemetry
  const [emailLogSearch, setEmailLogSearch] = useState('');
  const [emailLogFilter, setEmailLogFilter] = useState('All');
  const [auditLogSearch, setAuditLogSearch] = useState('');
  const [auditLogRoleFilter, setAuditLogRoleFilter] = useState('All');

  // Modal Full Screen State
  const [activeModal, setActiveModal] = useState(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalCategoryFilter, setModalCategoryFilter] = useState('All');
  const [modalStatusFilter, setModalStatusFilter] = useState('All');
  const [modalDateFilter, setModalDateFilter] = useState('All');
  const [modalStartDate, setModalStartDate] = useState('');
  const [modalEndDate, setModalEndDate] = useState('');
  const [modalViewMode, setModalViewMode] = useState('both');
  const [selectedMonthDrilldown, setSelectedMonthDrilldown] = useState(null);
  const [selectedClientForDetails, setSelectedClientForDetails] = useState(null);

  // Close modal on ESC key + lock body scroll when modal is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
        setSelectedMonthDrilldown(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lock body scroll and hide sidebar when modal is open
  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [activeModal]);

  const fetchReports = useCallback(async () => {
    if (!token) return;
    try {
      const promises = [
        fetch('/api/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/dashboard/charts/status', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/dashboard/charts/monthly', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/dashboard/charts/services', { headers: { 'Authorization': `Bearer ${token}` } })
      ];

      const isAdmin = user?.role === 'admin';
      if (isAdmin) {
        promises.push(fetch('/api/dashboard/activity-logs?limit=50', { headers: { 'Authorization': `Bearer ${token}` } }));
        promises.push(fetch('/api/dashboard/email-logs?limit=50', { headers: { 'Authorization': `Bearer ${token}` } }));
      }

      const responses = await Promise.all(promises);
      
      const statsRes = await responses[0].json();
      const statusRes = await responses[1].json();
      const monthlyRes = await responses[2].json();
      const servicesRes = await responses[3].json();

      if (statsRes) setStats(statsRes);
      if (statusRes) setStatusData(statusRes);
      if (monthlyRes) setMonthlyData(monthlyRes);
      if (servicesRes) {
        setServiceData(servicesRes.summary || []);
        setServiceRecords(servicesRes.allRecords || []);
      }

      if (isAdmin) {
        if (responses[4]) setActivityLogs(await responses[4].json());
        if (responses[5]) setEmailLogs(await responses[5].json());
      }
    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  const filteredEmailLogs = useMemo(() => {
    if (!emailLogs) return [];
    return emailLogs.filter(log => {
      const q = emailLogSearch.toLowerCase();
      const matchSearch = !emailLogSearch.trim() || 
        (log.client_name && log.client_name.toLowerCase().includes(q)) ||
        (log.recipient_email && log.recipient_email.toLowerCase().includes(q)) ||
        (log.service && log.service.toLowerCase().includes(q)) ||
        (log.email_type && log.email_type.toLowerCase().includes(q)) ||
        (log.subject && log.subject.toLowerCase().includes(q));

      const matchFilter = emailLogFilter === 'All' || 
        (emailLogFilter === 'sent' && log.status === 'sent') ||
        (emailLogFilter === 'reminder' && log.email_type && log.email_type.includes('reminder')) ||
        (emailLogFilter === 'expired' && log.email_type && log.email_type.includes('expired'));

      return matchSearch && matchFilter;
    });
  }, [emailLogs, emailLogSearch, emailLogFilter]);

  const filteredAuditLogs = useMemo(() => {
    if (!activityLogs) return [];
    return activityLogs.filter(log => {
      const q = auditLogSearch.toLowerCase();
      const matchSearch = !auditLogSearch.trim() ||
        (log.details && log.details.toLowerCase().includes(q)) ||
        (log.full_name && log.full_name.toLowerCase().includes(q)) ||
        (log.role && log.role.toLowerCase().includes(q));

      const matchRole = auditLogRoleFilter === 'All' || log.role === auditLogRoleFilter;

      return matchSearch && matchRole;
    });
  }, [activityLogs, auditLogSearch, auditLogRoleFilter]);

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 8000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  // Derived metrics
  const totalEmailsSent = emailLogs.length;
  const successfulEmails = emailLogs.filter(log => log.status === 'sent').length;
  const deliverabilityRate = totalEmailsSent > 0 ? Math.round((successfulEmails / totalEmailsSent) * 100) : 100;

  // Filtered dataset for modal tables
  const filteredModalRecords = useMemo(() => {
    if (!serviceRecords || serviceRecords.length === 0) return [];
    
    return serviceRecords.filter(item => {
      const matchSearch = modalSearchTerm === '' || 
        (item.client_name && item.client_name.toLowerCase().includes(modalSearchTerm.toLowerCase())) ||
        (item.service && item.service.toLowerCase().includes(modalSearchTerm.toLowerCase())) ||
        (item.vendor && item.vendor.toLowerCase().includes(modalSearchTerm.toLowerCase()));

      const matchCategory = modalCategoryFilter === 'All' || 
        (item.service && item.service.toLowerCase().includes(modalCategoryFilter.toLowerCase()));

      const matchStatus = modalStatusFilter === 'All' || item.status === modalStatusFilter;

      let matchDate = true;
      if (modalDateFilter !== 'All' && item.expiry_date) {
        const itemDate = new Date(item.expiry_date);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (modalDateFilter === 'this_month') {
          matchDate = itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        } else if (modalDateFilter === 'next_month') {
          const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          matchDate = itemDate.getMonth() === nextMonth.getMonth() && itemDate.getFullYear() === nextMonth.getFullYear();
        } else if (modalDateFilter === '30_days') {
          const in30 = new Date(startOfToday.getTime() + 30 * 24 * 60 * 60 * 1000);
          matchDate = itemDate >= startOfToday && itemDate <= in30;
        } else if (modalDateFilter === '60_days') {
          const in60 = new Date(startOfToday.getTime() + 60 * 24 * 60 * 60 * 1000);
          matchDate = itemDate >= startOfToday && itemDate <= in60;
        } else if (modalDateFilter === '90_days') {
          const in90 = new Date(startOfToday.getTime() + 90 * 24 * 60 * 60 * 1000);
          matchDate = itemDate >= startOfToday && itemDate <= in90;
        } else if (modalDateFilter === 'expired') {
          matchDate = itemDate < startOfToday || item.status === 'Expired';
        } else if (modalDateFilter === 'custom') {
          if (modalStartDate && modalEndDate) {
            const start = new Date(modalStartDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(modalEndDate);
            end.setHours(23, 59, 59, 999);
            matchDate = itemDate >= start && itemDate <= end;
          } else if (modalStartDate) {
            const start = new Date(modalStartDate);
            start.setHours(0, 0, 0, 0);
            matchDate = itemDate >= start;
          } else if (modalEndDate) {
            const end = new Date(modalEndDate);
            end.setHours(23, 59, 59, 999);
            matchDate = itemDate <= end;
          }
        }
      }

      if (activeModal === 'active_kpi') return matchSearch && matchCategory && matchStatus && matchDate && (item.status === 'Active' || item.status === 'Renewed');
      if (activeModal === 'pending_kpi') return matchSearch && matchCategory && matchStatus && matchDate && item.status === 'Pending Renewal';
      if (activeModal === 'loss_kpi' || activeModal === 'loss') return matchSearch && matchCategory && matchStatus && matchDate && item.status === 'Expired';
      
      return matchSearch && matchCategory && matchStatus && matchDate;
    });
  }, [serviceRecords, modalSearchTerm, modalCategoryFilter, modalStatusFilter, modalDateFilter, modalStartDate, modalEndDate, activeModal]);

  // Available categories for modal dropdown filter
  const availableModalCategories = useMemo(() => {
    if (!serviceRecords) return ['All'];
    const cats = Array.from(new Set(serviceRecords.map(r => r.service).filter(Boolean))).sort();
    return ['All', ...cats];
  }, [serviceRecords]);

  // Modal summary stats
  const modalSummary = useMemo(() => {
    const totalCount = filteredModalRecords.length;
    const totalVal = filteredModalRecords.reduce((acc, r) => acc + (parseFloat(r.value) || 0), 0);
    const totalProfit = filteredModalRecords.reduce((acc, r) => acc + (parseFloat(r.profit) || 0), 0);
    const uniqueClients = new Set(filteredModalRecords.map(r => r.client_name)).size;
    return { totalCount, totalVal, totalProfit, uniqueClients };
  }, [filteredModalRecords]);

  const getModalTitle = (type) => {
    switch (type) {
      case 'services': return 'Service Plan Portfolio Analysis & Breakdown';
      case 'revenue': return 'Volume & Portfolio Revenue Analytics';
      case 'profit': return 'Portfolio Net Profit Analytics';
      case 'loss':
      case 'loss_kpi': return 'Expired Portfolio Loss Audit';
      case 'active_kpi': return 'Active & Renewed Subscriptions Audit';
      case 'pending_kpi': return 'Pending Renewals Pipeline Audit';
      case 'deliverability_kpi': return 'Email Automation Logs & Deliverability';
      case 'pipeline_kpi': return 'Total Portfolio Pipeline Breakdown';
      default: return `Drilldown Analysis: ${type}`;
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Active':
      case 'Renewed':
        return 'bg-emerald-100 text-emerald-950 border-emerald-400 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-700/60 font-bold';
      case 'Pending Renewal':
        return 'bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700/60 font-bold';
      case 'Expired':
        return 'bg-rose-100 text-rose-950 border-rose-400 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-700/60 font-bold';
      default:
        return 'bg-slate-200 text-slate-950 border-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 font-bold';
    }
  };

  // Monthly profit & loss analytical breakdown
  const monthlyAnalysis = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return null;

    const enriched = monthlyData.map(m => {
      const rev = parseFloat(m.revenue) || 0;
      const estProfit = Math.round(rev * 0.72);
      return {
        month: m.month,
        count: m.count || 0,
        revenue: rev,
        profit: estProfit
      };
    });

    let peakMonth = enriched[0];
    let riskMonth = enriched[0];

    enriched.forEach(m => {
      if (m.revenue > peakMonth.revenue) peakMonth = m;
      if (m.revenue < riskMonth.revenue) riskMonth = m;
    });

    const totalRev = enriched.reduce((acc, m) => acc + m.revenue, 0);
    const avgRev = enriched.length > 0 ? totalRev / enriched.length : 0;

    return {
      enriched,
      peakMonth,
      riskMonth,
      avgRev,
      totalRev
    };
  }, [monthlyData]);

  // Clients belonging to selected month drilldown
  const monthDrilldownClients = useMemo(() => {
    if (!selectedMonthDrilldown || !serviceRecords) return [];
    return serviceRecords.filter(item => {
      const rawDate = item.expiry_date || item.renewal_date;
      if (!rawDate) return false;
      const dStr = typeof rawDate === 'string' ? rawDate : new Date(rawDate).toISOString();
      return dStr.startsWith(selectedMonthDrilldown);
    });
  }, [selectedMonthDrilldown, serviceRecords]);

  const openModal = (type) => {
    setModalSearchTerm('');
    setModalCategoryFilter('All');
    setModalStatusFilter('All');
    setModalDateFilter('All');
    setModalStartDate('');
    setModalEndDate('');
    const isGraphType = ['revenue', 'profit', 'loss', 'services'].includes(type);
    setModalViewMode(isGraphType ? 'graph' : 'both');
    setSelectedMonthDrilldown(null);
    setActiveModal(type);
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  const CustomComposedTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const rev = payload.find(p => p.dataKey === 'revenue')?.value || 0;
      const count = payload.find(p => p.dataKey === 'count')?.value || 0;
      return (
        <div className="bg-slate-950/90 backdrop-blur-xl border border-white/20 p-3.5 rounded-xl shadow-2xl text-white">
          <p className="font-bold text-xs text-brand-300 border-b border-white/10 pb-1 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-indigo-400 font-medium">Revenue:</span>
              <span className="font-mono font-bold text-emerald-400">{formatCurrency(rev)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-emerald-400 font-medium">Renewals Volume:</span>
              <span className="font-mono font-bold text-white">{count} contracts</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in relative pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-gradient-to-r dark:from-slate-900/90 dark:via-indigo-950/80 dark:to-slate-900/90 p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xl dark:shadow-2xl backdrop-blur-xl transition-all">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-xl border border-brand-500/20 dark:border-brand-500/30">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Reports & Executive Analytics</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Real-time performance metrics, portfolio revenue, service distribution & system audit logs</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div onClick={() => openModal('active_kpi')} className="p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group flex items-center gap-3.5 bg-gradient-to-br from-blue-500/15 via-blue-400/10 to-blue-500/5 dark:from-blue-950/40 dark:via-blue-900/30 dark:to-slate-900/60 border-blue-400/50 dark:border-blue-500/40 shadow-lg shadow-blue-500/5 hover:border-blue-500/80 hover:shadow-blue-500/15 backdrop-blur-xl cursor-pointer">
          <div className="p-3 rounded-xl bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-500/40 flex-shrink-0 backdrop-blur-md">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-700 dark:text-surface-400 uppercase tracking-wider truncate">Active Portfolio</p>
            <p className="text-lg font-black text-black dark:text-white mt-0.5 leading-none">{stats?.active || 0} <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Services</span></p>
          </div>
          <Maximize2 className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2" />
        </div>

        <div onClick={() => openModal('pending_kpi')} className="p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group flex items-center gap-3.5 bg-gradient-to-br from-amber-500/15 via-orange-400/10 to-amber-500/5 dark:from-amber-950/40 dark:via-orange-900/30 dark:to-slate-900/60 border-amber-400/50 dark:border-amber-500/40 shadow-lg shadow-amber-500/5 hover:border-amber-500/80 hover:shadow-amber-500/15 backdrop-blur-xl cursor-pointer">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 flex-shrink-0 backdrop-blur-md">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-700 dark:text-surface-400 uppercase tracking-wider truncate">Pending Reminders</p>
            <p className="text-lg font-black text-black dark:text-white mt-0.5 leading-none">{stats?.upcoming || 0} <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Upcoming</span></p>
          </div>
          <Maximize2 className="w-3.5 h-3.5 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2" />
        </div>

        <div onClick={() => openModal('deliverability_kpi')} className="p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group flex items-center gap-3.5 bg-gradient-to-br from-cyan-500/15 via-teal-400/10 to-cyan-500/5 dark:from-cyan-950/40 dark:via-teal-900/30 dark:to-slate-900/60 border-cyan-400/50 dark:border-cyan-500/40 shadow-lg shadow-cyan-500/5 hover:border-cyan-500/80 hover:shadow-cyan-500/15 backdrop-blur-xl cursor-pointer">
          <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/40 flex-shrink-0 backdrop-blur-md">
            <Mail className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-700 dark:text-surface-400 uppercase tracking-wider truncate">Email Deliverability</p>
            <p className="text-lg font-black text-black dark:text-white mt-0.5 leading-none">{deliverabilityRate}% <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Success</span></p>
          </div>
          <Maximize2 className="w-3.5 h-3.5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2" />
        </div>

        <div onClick={() => openModal('pipeline_kpi')} className="p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group flex items-center gap-3.5 bg-gradient-to-br from-indigo-500/15 via-purple-400/10 to-indigo-500/5 dark:from-indigo-950/40 dark:via-purple-900/30 dark:to-slate-900/60 border-indigo-400/50 dark:border-indigo-500/40 shadow-lg shadow-indigo-500/5 hover:border-indigo-500/80 hover:shadow-indigo-500/15 backdrop-blur-xl cursor-pointer">
          <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-500/40 flex-shrink-0 backdrop-blur-md">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-700 dark:text-surface-400 uppercase tracking-wider truncate">Total Contract Pipeline</p>
            <p className="text-lg font-black text-black dark:text-white mt-0.5 leading-none">{formatCurrency(stats?.revenue || 0)}</p>
          </div>
          <Maximize2 className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2" />
        </div>

        <div onClick={() => openModal('profit')} className="p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group flex items-center gap-3.5 bg-gradient-to-br from-emerald-500/15 via-teal-400/10 to-emerald-500/5 dark:from-emerald-950/40 dark:via-teal-900/30 dark:to-slate-900/60 border-emerald-400/50 dark:border-emerald-500/40 shadow-lg shadow-emerald-500/5 hover:border-emerald-500/80 hover:shadow-emerald-500/15 backdrop-blur-xl cursor-pointer">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 flex-shrink-0 backdrop-blur-md">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-700 dark:text-surface-400 uppercase tracking-wider truncate">Total Profit</p>
            <p className="text-lg font-black text-black dark:text-white mt-0.5 leading-none">{formatCurrency(stats?.profit || 0)}</p>
          </div>
          <Maximize2 className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2" />
        </div>

        <div onClick={() => openModal('loss')} className="p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group flex items-center gap-3.5 bg-gradient-to-br from-rose-500/15 via-red-400/10 to-rose-500/5 dark:from-rose-950/40 dark:via-red-900/30 dark:to-slate-900/60 border-rose-400/50 dark:border-rose-500/40 shadow-lg shadow-rose-500/5 hover:border-rose-500/80 hover:shadow-rose-500/15 backdrop-blur-xl cursor-pointer">
          <div className="p-3 rounded-xl bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/40 flex-shrink-0 backdrop-blur-md">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-700 dark:text-surface-400 uppercase tracking-wider truncate">Total Loss (Expired)</p>
            <p className="text-lg font-black text-black dark:text-white mt-0.5 leading-none">{formatCurrency(stats?.loss || 0)}</p>
          </div>
          <Maximize2 className="w-3.5 h-3.5 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="group/animated-card relative overflow-hidden rounded-2xl border border-white/80 dark:border-white/15 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl shadow-black/5 p-5 lg:col-span-5 h-[420px] flex flex-col justify-between transition-all duration-500 hover:shadow-2xl hover:border-brand-500/40">
          <ServiceDistributionPieChart 
            rawServiceData={serviceData} 
            allRecords={serviceRecords} 
            onExpand={() => openModal('services')}
          />
        </div>

        <div className="group/animated-card relative overflow-hidden rounded-2xl border border-white/80 dark:border-white/15 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl shadow-black/5 p-6 lg:col-span-7 h-[420px] flex flex-col justify-between transition-all duration-500 hover:shadow-2xl hover:border-brand-500/40">
          <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.05)_1px,transparent_1px)] bg-[size:20px_20px] opacity-70 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-black dark:text-white">Volume & Revenue Analysis</h2>
                <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 backdrop-blur-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Live Data
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openModal('revenue')}
                className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all flex items-center gap-1 text-[11px] font-bold"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Full Screen</span>
              </button>
            </div>
          </div>
          <div className="relative z-10 flex-1 min-h-0 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.4} />
                <XAxis dataKey="month" interval={0} tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis yAxisId="left" width={60} tick={{ fontSize: 10, fontWeight: 600 }} tickFormatter={(val) => formatCompactCurrency(val)} />
                <YAxis yAxisId="right" orientation="right" width={35} tick={{ fontSize: 10, fontWeight: 600 }} />
                <RechartsTooltip content={<CustomComposedTooltip />} />
                <Bar yAxisId="left" dataKey="revenue" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={34} />
                <Line yAxisId="right" dataKey="count" stroke="#10b981" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AreaGraphVisualizer
          title="Portfolio Profit Analytics"
          type="profit"
          totalValue={stats?.profit || 0}
          monthlyData={monthlyData}
          onExpand={() => openModal('profit')}
        />
        <AreaGraphVisualizer
          title="Expired Portfolio Loss Analytics"
          type="loss"
          totalValue={stats?.loss || 0}
          monthlyData={monthlyData}
          onExpand={() => openModal('loss')}
        />
      </div>

      {/* ADMIN EXCLUSIVE: Email Logs & Audit Logs Section */}
      {user?.role === 'admin' && (
        <div className="space-y-6 pt-6 border-t border-slate-200/50 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20 backdrop-blur-md">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">System Audit & Email Telemetry</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  Admin Profile Exclusive
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Real-time outbound notification dispatches and complete system activity audit trail
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/email-automation')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-white/10 transition-all shadow-sm"
              >
                <Mail className="w-3.5 h-3.5 text-cyan-500" />
                Email Settings
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => navigate('/activity-logs')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-white/10 transition-all shadow-sm"
              >
                <Activity className="w-3.5 h-3.5 text-brand-500" />
                All Activity Logs
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Outbound Email Logs Panel */}
            <div className="group/animated-card relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/15 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl p-5 flex flex-col justify-between transition-all duration-500 hover:border-indigo-500/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Outbound Email Logs
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                        {filteredEmailLogs.length}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Automated client renewal notifications</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Filter Dropdown */}
                  <div className="relative">
                    <select
                      value={emailLogFilter}
                      onChange={(e) => setEmailLogFilter(e.target.value)}
                      className="px-2.5 py-1 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/15 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                    >
                      <option value="All">All Email Types</option>
                      <option value="sent">Sent Status</option>
                      <option value="reminder">Reminders Only</option>
                      <option value="expired">Expiry Alerts</option>
                    </select>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={emailLogSearch}
                      onChange={(e) => setEmailLogSearch(e.target.value)}
                      placeholder="Search emails..."
                      className="pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/15 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-28 sm:w-36"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 overflow-y-auto custom-scrollbar max-h-[360px] rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/40">
                {filteredEmailLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No email logs match your search or filter.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-white/10 uppercase text-[10px] font-semibold sticky top-0 backdrop-blur-md">
                      <tr>
                        <th className="px-3 py-2">Sent Time</th>
                        <th className="px-3 py-2">Client / Service</th>
                        <th className="px-3 py-2">Email Type</th>
                        <th className="px-3 py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 text-slate-700 dark:text-slate-200">
                      {filteredEmailLogs.map((log) => {
                        const badge = formatEmailTypeBadge(log.email_type);
                        return (
                          <tr key={log.id} className="hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors">
                            <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                              {formatDateTime(log.sent_at)}
                            </td>
                            <td className="px-3 py-2.5 max-w-[160px] truncate">
                              <div className="font-bold text-slate-900 dark:text-white truncate">{log.client_name || 'System'}</div>
                              {log.recipient_email && (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{log.recipient_email}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                log.status === 'sent'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                              }`}>
                                {log.status ? log.status.toUpperCase() : 'SENT'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* 2. System Audit Logs Panel */}
            <div className="group/animated-card relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/15 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl p-5 flex flex-col justify-between transition-all duration-500 hover:border-brand-500/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      System Audit Logs
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-500/30">
                        {filteredAuditLogs.length}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">User actions & record change tracking</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Filter Dropdown */}
                  <div className="relative">
                    <select
                      value={auditLogRoleFilter}
                      onChange={(e) => setAuditLogRoleFilter(e.target.value)}
                      className="px-2.5 py-1 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/15 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                    >
                      <option value="All">All Roles</option>
                      <option value="admin">Admin</option>
                      <option value="user">User / Sales</option>
                    </select>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={auditLogSearch}
                      onChange={(e) => setAuditLogSearch(e.target.value)}
                      placeholder="Search activity..."
                      className="pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/15 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 w-28 sm:w-36"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 overflow-y-auto custom-scrollbar max-h-[360px] rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/40">
                {filteredAuditLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No activity logs match your search or role filter.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-white/10 uppercase text-[10px] font-semibold sticky top-0 backdrop-blur-md">
                      <tr>
                        <th className="px-3 py-2">Timestamp</th>
                        <th className="px-3 py-2">User / Role</th>
                        <th className="px-3 py-2">Action Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 text-slate-700 dark:text-slate-200">
                      {filteredAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-white">{log.full_name || 'System User'}</div>
                            <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 uppercase">
                              {log.role || 'user'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Modal Drilldown Portal */}
      {activeModal && createPortal(
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99999,
              background: 'rgba(7, 10, 24, 0.96)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              color: 'white',
              padding: '24px 28px',
            }}
          >
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/15 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-500/20 text-brand-400 rounded-xl border border-brand-500/30">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">{getModalTitle(activeModal)}</h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Comprehensive telemetry & contract breakdown</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* View Mode Switcher for Graph Modals */}
                {['revenue', 'profit', 'loss', 'services'].includes(activeModal) && (
                  <div className="flex items-center p-1 bg-slate-900 border border-white/20 rounded-xl">
                    <button
                      onClick={() => setModalViewMode('graph')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        modalViewMode === 'graph' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Graph & Insights
                    </button>
                    <button
                      onClick={() => setModalViewMode('both')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        modalViewMode === 'both' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Graph & Table
                    </button>
                    <button
                      onClick={() => setModalViewMode('table')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        modalViewMode === 'table' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Table Only
                    </button>
                  </div>
                )}

                {/* Category Dropdown */}
                <div className="flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={modalCategoryFilter}
                    onChange={(e) => setModalCategoryFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-white/20 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                  >
                    {availableModalCategories.map(cat => (
                      <option key={cat} value={cat}>{cat === 'All' ? 'All Services' : cat}</option>
                    ))}
                  </select>
                </div>

                {/* Status Dropdown Filter */}
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <select
                    value={modalStatusFilter}
                    onChange={(e) => setModalStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-white/20 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Pending Renewal">Pending Renewal</option>
                    <option value="Renewed">Renewed</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>

                {/* Renewal Date Dropdown & Calendar Range Filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <select
                      value={modalDateFilter}
                      onChange={(e) => setModalDateFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-900 border border-white/20 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                    >
                      <option value="All">All Renewal Dates</option>
                      <option value="this_month">This Month</option>
                      <option value="next_month">Next Month</option>
                      <option value="30_days">Next 30 Days</option>
                      <option value="60_days">Next 60 Days</option>
                      <option value="90_days">Next 90 Days</option>
                      <option value="expired">Expired / Past Due</option>
                      <option value="custom">📅 Custom Date Range...</option>
                    </select>
                  </div>

                  {modalDateFilter === 'custom' && (
                    <div className="flex items-center gap-2 bg-slate-900/90 border border-emerald-500/40 px-3 py-1 rounded-xl backdrop-blur-md">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">From:</span>
                        <input
                          type="date"
                          value={modalStartDate}
                          onChange={(e) => setModalStartDate(e.target.value)}
                          style={{ colorScheme: 'dark' }}
                          className="bg-slate-800 text-white text-xs px-2 py-1 rounded-lg border border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        />
                      </div>
                      <span className="text-slate-500 font-bold">-</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">To:</span>
                        <input
                          type="date"
                          value={modalEndDate}
                          onChange={(e) => setModalEndDate(e.target.value)}
                          style={{ colorScheme: 'dark' }}
                          className="bg-slate-800 text-white text-xs px-2 py-1 rounded-lg border border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        />
                      </div>
                      {(modalStartDate || modalEndDate) && (
                        <button
                          onClick={() => { setModalStartDate(''); setModalEndDate(''); }}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-bold ml-1"
                          title="Clear date range"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    placeholder="Search client, vendor, service..."
                    className="pl-9 pr-4 py-2 bg-slate-900 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500 w-36 sm:w-48"
                  />
                </div>

                {/* Export CSV */}
                <button
                  onClick={() => exportToCSV(filteredModalRecords, `report-${activeModal}`)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold transition-all"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all ml-auto lg:ml-0"
                  title="Close Full Screen View"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* FULL SCREEN GRAPH DISPLAY & EXECUTIVE MONTHLY ANALYSIS PANEL */}
            {modalViewMode !== 'table' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar my-3 space-y-4 pr-1">
                {/* 1. Primary Full Screen Visualizer Chart */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/15 backdrop-blur-xl shadow-2xl">
                  {activeModal === 'revenue' && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-base font-black text-white flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-indigo-400" />
                            Month-by-Month Volume & Revenue Breakdown
                          </h3>
                          <p className="text-xs text-slate-400">Granular monthly revenue distribution and contract counts</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold">
                          <span className="flex items-center gap-1.5 text-indigo-400">
                            <span className="w-3 h-3 rounded bg-indigo-500 inline-block"></span> Revenue (₹)
                          </span>
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Contract Count
                          </span>
                        </div>
                      </div>
                      <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={monthlyData} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.3} />
                            <XAxis dataKey="month" interval={0} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                            <YAxis yAxisId="left" width={70} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} tickFormatter={(val) => formatCompactCurrency(val)} />
                            <YAxis yAxisId="right" orientation="right" width={40} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} />
                            <RechartsTooltip content={<CustomComposedTooltip />} />
                            <Bar yAxisId="left" dataKey="revenue" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
                            <Line yAxisId="right" dataKey="count" stroke="#10b981" strokeWidth={3.5} dot={{ r: 4, fill: '#10b981' }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {(activeModal === 'profit' || activeModal === 'loss') && (
                    <AreaGraphVisualizer
                      title={activeModal === 'profit' ? "Portfolio Profit Analytics (Full Screen View)" : "Expired Portfolio Loss Analytics (Full Screen View)"}
                      type={activeModal === 'profit' ? "profit" : "loss"}
                      totalValue={activeModal === 'profit' ? (modalSummary.totalProfit || stats?.profit || 0) : (stats?.loss || 0)}
                      monthlyData={monthlyData}
                      height="h-[340px]"
                      fullScreenMode={true}
                    />
                  )}

                  {activeModal === 'services' && (
                    <div className="h-[340px] flex items-center justify-center">
                      <ServiceDistributionPieChart 
                        rawServiceData={serviceData} 
                        allRecords={serviceRecords} 
                      />
                    </div>
                  )}
                </div>

                {/* 2. Month-by-Month Profit vs Loss Chart */}
                {monthlyAnalysis && (
                  <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/15 backdrop-blur-xl shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-black text-white flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-emerald-400" />
                          Month-by-Month Estimated Net Profit & Target Telemetry
                        </h3>
                        <p className="text-xs text-slate-400">Comparing estimated monthly gross profit with total contract revenue</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Est. Net Profit
                        </span>
                        <span className="flex items-center gap-1.5 text-indigo-400">
                          <span className="w-3 h-3 rounded bg-indigo-500/50 inline-block"></span> Gross Revenue
                        </span>
                      </div>
                    </div>
                    <div className="h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthlyAnalysis.enriched} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.25} />
                          <XAxis dataKey="month" interval={0} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                          <YAxis width={65} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} tickFormatter={(val) => formatCompactCurrency(val)} />
                          <RechartsTooltip content={<CustomComposedTooltip />} />
                          <Bar dataKey="revenue" fill="#6366f1" opacity={0.4} radius={[6, 6, 0, 0]} barSize={24} />
                          <Bar dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* 3. AI Executive Strategic Monthly Profit & Loss Analysis Panel */}
                {monthlyAnalysis && (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/95 to-slate-950 border border-brand-500/30 backdrop-blur-xl shadow-2xl">
                    <div className="flex items-center gap-2 pb-3 border-b border-white/10 mb-4">
                      <div className="p-2 rounded-xl bg-brand-500/20 text-brand-300 border border-brand-500/30">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white flex items-center gap-2">
                          Executive AI Profit & Loss Analysis
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-brand-500/20 text-brand-300 border border-brand-500/30 uppercase">
                            Actionable Insights
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400">Monthly profit peaks, risk analysis & strategic revenue growth recommendations</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* Peak Profit Month Card */}
                      <div 
                        onClick={() => setSelectedMonthDrilldown(monthlyAnalysis.peakMonth?.month)}
                        className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md cursor-pointer hover:border-emerald-400 hover:bg-emerald-500/15 hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-[1.01] transition-all group relative"
                        title="Click to view related clients for this month"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400">🏆 Highest Profit Month</span>
                          <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                        </div>
                        <p className="text-2xl font-black text-white mt-1.5">{monthlyAnalysis.peakMonth?.month || 'N/A'}</p>
                        <p className="text-sm font-bold text-emerald-300 mt-0.5">
                          {formatCurrency(monthlyAnalysis.peakMonth?.revenue || 0)} <span className="text-[10px] text-slate-400 font-medium">(Rev)</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Est. Profit: <strong className="text-white">{formatCurrency(monthlyAnalysis.peakMonth?.profit || 0)}</strong> across {monthlyAnalysis.peakMonth?.count || 0} contracts.
                        </p>
                        <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px] font-bold text-emerald-400 group-hover:text-white transition-colors">
                          <span>View {monthlyAnalysis.peakMonth?.count || 0} Related Clients</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>

                      {/* Highest Risk Month Card */}
                      <div 
                        onClick={() => setSelectedMonthDrilldown(monthlyAnalysis.riskMonth?.month)}
                        className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 backdrop-blur-md cursor-pointer hover:border-rose-400 hover:bg-rose-500/15 hover:shadow-lg hover:shadow-rose-500/10 hover:scale-[1.01] transition-all group relative"
                        title="Click to view related clients for this month"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-black tracking-wider text-rose-400">⚠️ Lowest Revenue / High Risk Month</span>
                          <TrendingDown className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                        </div>
                        <p className="text-2xl font-black text-white mt-1.5">{monthlyAnalysis.riskMonth?.month || 'N/A'}</p>
                        <p className="text-sm font-bold text-rose-300 mt-0.5">
                          {formatCurrency(monthlyAnalysis.riskMonth?.revenue || 0)} <span className="text-[10px] text-slate-400 font-medium">(Rev)</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Est. Profit: <strong className="text-white">{formatCurrency(monthlyAnalysis.riskMonth?.profit || 0)}</strong> ({monthlyAnalysis.riskMonth?.count || 0} active renewals).
                        </p>
                        <div className="mt-2.5 pt-2 border-t border-rose-500/20 flex items-center justify-between text-[11px] font-bold text-rose-400 group-hover:text-white transition-colors">
                          <span>View {monthlyAnalysis.riskMonth?.count || 0} Related Clients</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>

                      {/* Average Monthly Telemetry */}
                      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 backdrop-blur-md">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-black tracking-wider text-indigo-300">📈 Monthly Average Run-Rate</span>
                          <Activity className="w-4 h-4 text-indigo-400" />
                        </div>
                        <p className="text-2xl font-black text-white mt-1.5">{formatCurrency(monthlyAnalysis.avgRev)}</p>
                        <p className="text-xs font-semibold text-indigo-300 mt-0.5">
                          Tracked Period: {monthlyAnalysis.totalTrackedMonths} Months
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Total Forecasted Portfolio: <strong className="text-white">{formatCurrency(monthlyAnalysis.totalRev)}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Strategic Action Plan */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-2.5">
                        <Zap className="w-3.5 h-3.5" />
                        Strategic Action Plan to Improve Net Profit & Reduce Loss:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 flex items-start gap-2">
                          <span className="p-1 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] mt-0.5">1</span>
                          <div>
                            <strong className="text-white block font-bold">Advance Renewal Campaigns (60-Day Lock)</strong>
                            <p className="text-slate-400 text-[11px] mt-0.5">Launch automated notification triggers 60 days prior to peak months like <span className="text-emerald-300 font-semibold">{monthlyAnalysis.peakMonth?.month}</span> to lock in recurring contracts early and remove drop-off risk.</p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 flex items-start gap-2">
                          <span className="p-1 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[10px] mt-0.5">2</span>
                          <div>
                            <strong className="text-white block font-bold">Upsell High-Margin Cloud Services</strong>
                            <p className="text-slate-400 text-[11px] mt-0.5">Focus CST follow-ups on bundling high-margin Managed Services and Enterprise SSL add-ons to boost overall contract gross margin beyond 75%.</p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 flex items-start gap-2">
                          <span className="p-1 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px] mt-0.5">3</span>
                          <div>
                            <strong className="text-white block font-bold">Risk Month Churn Prevention</strong>
                            <p className="text-slate-400 text-[11px] mt-0.5">Prioritize proactive account executive outreach for accounts in lower revenue months like <span className="text-rose-300 font-semibold">{monthlyAnalysis.riskMonth?.month}</span> to prevent contract expiry and net revenue loss.</p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 flex items-start gap-2">
                          <span className="p-1 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] mt-0.5">4</span>
                          <div>
                            <strong className="text-white block font-bold">Vendor Cost Structuring</strong>
                            <p className="text-slate-400 text-[11px] mt-0.5">Negotiate volume discounts with vendors for high-volume renewal items to lower cost of goods sold (COGS) and increase net profitability.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Summary Stat Cards */}
            {modalViewMode !== 'graph' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 flex-shrink-0">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Matching Contracts</p>
                  <p className="text-xl font-black text-white mt-1">{modalSummary.totalCount}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Portfolio Value</p>
                  <p className="text-xl font-black text-emerald-400 mt-1">{formatCurrency(modalSummary.totalVal)}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Net Profit</p>
                  <p className="text-xl font-black text-indigo-300 mt-1">{formatCurrency(modalSummary.totalProfit)}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Unique Clients</p>
                  <p className="text-xl font-black text-amber-400 mt-1">{modalSummary.uniqueClients}</p>
                </div>
              </div>
            )}

            {/* Table Container */}
            {modalViewMode !== 'graph' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/10 rounded-2xl bg-slate-900/60 shadow-2xl">
              {filteredModalRecords.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-sm text-white">No matching records found</p>
                  <p className="text-xs mt-1 text-slate-400">Try adjusting your filters or search query.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-300 border-b border-white/10 uppercase tracking-wider text-[11px] font-semibold sticky top-0 backdrop-blur-md z-10">
                    <tr>
                      <th className="px-4 py-3 text-left">Client Name</th>
                      <th className="px-4 py-3 text-left">Vendor</th>
                      <th className="px-4 py-3 text-left">Service Plan</th>
                      <th className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1 justify-center">
                          <span>Status</span>
                          <select
                            value={modalStatusFilter}
                            onChange={(e) => setModalStatusFilter(e.target.value)}
                            className="bg-slate-800/80 border border-white/20 rounded px-1 py-0.5 text-[10px] font-bold text-brand-400 focus:outline-none cursor-pointer uppercase hover:text-white transition-colors ml-1"
                            title="Filter by Status"
                          >
                            <option value="All" className="bg-slate-900 text-white">All</option>
                            <option value="Active" className="bg-slate-900 text-emerald-400">Active</option>
                            <option value="Pending Renewal" className="bg-slate-900 text-amber-400">Pending</option>
                            <option value="Renewed" className="bg-slate-900 text-blue-400">Renewed</option>
                            <option value="Expired" className="bg-slate-900 text-rose-400">Expired</option>
                          </select>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <div className="inline-flex items-center gap-1">
                          <span>Renewal Date</span>
                          <select
                            value={modalDateFilter}
                            onChange={(e) => setModalDateFilter(e.target.value)}
                            className="bg-slate-800/80 border border-white/20 rounded px-1 py-0.5 text-[10px] font-bold text-brand-400 focus:outline-none cursor-pointer uppercase hover:text-white transition-colors ml-1"
                            title="Filter by Renewal Date"
                          >
                            <option value="All" className="bg-slate-900 text-white">All</option>
                            <option value="this_month" className="bg-slate-900 text-slate-200">This Month</option>
                            <option value="next_month" className="bg-slate-900 text-slate-200">Next Month</option>
                            <option value="30_days" className="bg-slate-900 text-slate-200">30 Days</option>
                            <option value="60_days" className="bg-slate-900 text-slate-200">60 Days</option>
                            <option value="90_days" className="bg-slate-900 text-slate-200">90 Days</option>
                            <option value="expired" className="bg-slate-900 text-rose-400">Expired</option>
                          </select>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right">Contract Value</th>
                      <th className="px-4 py-3 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-slate-200">
                    {filteredModalRecords.map((r, i) => (
                      <tr 
                        key={i} 
                        onClick={() => setSelectedClientForDetails(r)}
                        className="hover:bg-white/10 cursor-pointer transition-colors group"
                        title="Click to view full client contract details"
                      >
                        <td className="px-4 py-3 font-semibold text-white group-hover:text-brand-300 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>{r.client_name || 'N/A'}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-300">{r.vendor || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {r.service || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeStyle(r.status)}`}>
                            {r.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {r.expiry_date ? new Date(r.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                          {formatCurrency(r.value || 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-indigo-300">
                          {formatCurrency(r.profit || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            )}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Month Client Drilldown Modal */}
      {selectedMonthDrilldown && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-white/20 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    Client Contracts for {selectedMonthDrilldown}
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                      {monthDrilldownClients.length} Contracts
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Click on any client card below to view full client contract details</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMonthDrilldown(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client Table / Grid */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {monthDrilldownClients.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50 text-amber-400" />
                  <p className="text-sm font-bold text-white">No active contracts found for {selectedMonthDrilldown}</p>
                  <p className="text-xs mt-1">Check back once new renewals are assigned to this month.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {monthDrilldownClients.map((client, idx) => (
                    <div 
                      key={client.id || idx}
                      onClick={() => setSelectedClientForDetails(client)}
                      className="p-4 rounded-xl bg-slate-800/70 border border-white/10 hover:border-brand-500/50 hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition-transform">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors truncate">
                              {client.client_name}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeStyle(client.status)}`}>
                              {client.status || 'Active'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                            <span className="font-semibold text-slate-300">{client.service}</span>
                            {client.vendor && <span>• Vendor: {client.vendor}</span>}
                            {client.unique_id && <span className="font-mono text-[10px] text-slate-500">({client.unique_id})</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm font-mono font-bold text-emerald-400">{formatCurrency(client.value || 0)}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Renewal: <strong className="text-white">{client.expiry_date ? new Date(client.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</strong>
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-brand-500 group-hover:text-white text-slate-400 transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-white/10 bg-slate-900/90 flex justify-between items-center text-xs text-slate-300">
              <div className="flex items-center gap-4">
                <span>Total Portfolio Revenue: <strong className="text-emerald-400 font-mono font-bold text-sm ml-1">{formatCurrency(monthDrilldownClients.reduce((acc, c) => acc + (parseFloat(c.value) || 0), 0))}</strong></span>
                <span>Est. Net Profit: <strong className="text-indigo-400 font-mono font-bold text-sm ml-1">{formatCurrency(monthDrilldownClients.reduce((acc, c) => acc + (parseFloat(c.profit || Math.round((c.value || 0) * 0.72)) || 0), 0))}</strong></span>
              </div>
              <button 
                onClick={() => setSelectedMonthDrilldown(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Full Details Modal */}
      {selectedClientForDetails && (
        <ClientDetailsModal 
          client={selectedClientForDetails} 
          onClose={() => setSelectedClientForDetails(null)} 
        />
      )}
    </div>
  );
}
