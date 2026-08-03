import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, TrendingUp, TrendingDown, Mail, AlertCircle, CheckCircle2, Clock, 
  Activity, Zap, Users, ArrowUpRight, Maximize2, Minimize2, X, Search, Download, Filter,
  Layers, Building2, ChevronRight, PieChart as PieIcon, ExternalLink, Calendar
} from 'lucide-react';
import { formatCurrency, formatCompactCurrency, formatDateTime } from '../utils/formatters';
import ThreeDGraph from '../components/ThreeDGraph';
import AreaGraphVisualizer from '../components/AreaGraphVisualizer';
import ServiceDistributionPieChart from '../components/ServiceDistributionPieChart';

const STATUS_COLORS = {
  'Active': '#3b82f6',          // Blue
  'Pending Renewal': '#f97316',  // Orange
  'Renewed': '#10b981',          // Emerald
  'Expired': '#ef4444',          // Red
  'Closed': '#64748b'            // Slate
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
  const [stats, setStats] = useState(null);
  const [statusData, setStatusData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [serviceData, setServiceData] = useState([]);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Full Screen State
  const [activeModal, setActiveModal] = useState(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalCategoryFilter, setModalCategoryFilter] = useState('All');
  const [selectedMonthDrilldown, setSelectedMonthDrilldown] = useState(null);

  // Close modal on ESC key
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
        promises.push(fetch('/api/dashboard/activity-logs?limit=20', { headers: { 'Authorization': `Bearer ${token}` } }));
        promises.push(fetch('/api/dashboard/email-logs?limit=20', { headers: { 'Authorization': `Bearer ${token}` } }));
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
      console.error('Error fetching report analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

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

      if (activeModal === 'active_kpi') return matchSearch && matchCategory && (item.status === 'Active' || item.status === 'Renewed');
      if (activeModal === 'pending_kpi') return matchSearch && matchCategory && item.status === 'Pending Renewal';
      if (activeModal === 'loss_kpi' || activeModal === 'loss') return matchSearch && matchCategory && item.status === 'Expired';
      
      return matchSearch && matchCategory;
    });
  }, [serviceRecords, modalSearchTerm, modalCategoryFilter, activeModal]);

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
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Pending Renewal':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Expired':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const openModal = (type) => {
    setModalSearchTerm('');
    setModalCategoryFilter('All');
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-indigo-950/80 to-slate-900/90 p-6 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/20 text-brand-400 rounded-xl border border-brand-500/30">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Reports & Executive Analytics</h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Real-time performance metrics, portfolio revenue, service distribution & system audit logs</p>
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

      {activeModal && createPortal(
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-[9999] bg-slate-950/98 backdrop-blur-3xl p-4 sm:p-6 md:p-8 flex flex-col overflow-hidden text-white animate-fade-in"
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
                {/* Category Dropdown */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={modalCategoryFilter}
                    onChange={(e) => setModalCategoryFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-white/20 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {availableModalCategories.map(cat => (
                      <option key={cat} value={cat}>{cat === 'All' ? 'All Services' : cat}</option>
                    ))}
                  </select>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    placeholder="Search client, vendor, service..."
                    className="pl-9 pr-4 py-2 bg-slate-900 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500 w-44 sm:w-64"
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

            {/* Summary Stat Cards */}
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

            {/* Table Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/10 rounded-2xl bg-slate-900/60 shadow-2xl">
              {filteredModalRecords.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-sm text-white">No matching records found</p>
                  <p className="text-xs mt-1 text-slate-400">Try adjusting your search query or service category filter.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-300 border-b border-white/10 uppercase tracking-wider text-[11px] font-semibold sticky top-0 backdrop-blur-md z-10">
                    <tr>
                      <th className="px-4 py-3 text-left">Client Name</th>
                      <th className="px-4 py-3 text-left">Vendor</th>
                      <th className="px-4 py-3 text-left">Service Plan</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-left">Renewal Date</th>
                      <th className="px-4 py-3 text-right">Contract Value</th>
                      <th className="px-4 py-3 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-slate-200">
                    {filteredModalRecords.map((r, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-semibold text-white">{r.client_name || 'N/A'}</td>
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
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
