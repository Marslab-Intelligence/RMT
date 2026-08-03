import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

      <AnimatePresence>
        {activeModal && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl p-4 md:p-8 flex flex-col overflow-hidden text-white"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/15 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-500/20 text-brand-400 rounded-xl border border-brand-500/30">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Drilldown Analysis: {activeModal}</h2>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="px-4 py-2 bg-slate-900/80 border border-white/20 rounded-xl text-xs"
                />
                <button
                  onClick={() => exportToCSV(filteredModalRecords, 'report')}
                  className="px-3.5 py-2 bg-emerald-500/20 rounded-xl text-xs font-bold"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-2 rounded-xl bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pt-6 space-y-6 custom-scrollbar">
               <div className="overflow-x-auto border border-white/10 rounded-xl bg-slate-950/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-white/10">
                      <tr>
                        <th className="px-4 py-3">Client Name</th>
                        <th className="px-4 py-3">Service Plan</th>
                        <th className="px-4 py-3">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredModalRecords.map((r, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3">{r.client_name}</td>
                          <td className="px-4 py-3">{r.service}</td>
                          <td className="px-4 py-3">{formatCurrency(r.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
