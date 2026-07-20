import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { 
  BarChart3, TrendingUp, TrendingDown, Mail, AlertCircle, CheckCircle2, Clock, 
  Activity, Zap, Users, ArrowUpRight
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import ThreeDGraph from '../components/ThreeDGraph';

const STATUS_COLORS = {
  'Active': '#3b82f6',          // Blue
  'Pending Renewal': '#f97316',  // Orange
  'Renewed': '#10b981',          // Emerald
  'Expired': '#ef4444',          // Red
  'Closed': '#64748b'            // Slate
};

export default function Reports() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [statusData, setStatusData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      if (!token) return;
      try {
        const [statsRes, stRes, moRes, actRes, emRes] = await Promise.all([
          fetch('/api/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/dashboard/charts/status', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/dashboard/charts/monthly', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/dashboard/activity-logs?limit=20', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/dashboard/email-logs?limit=20', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (stRes.ok) setStatusData(await stRes.json());
        if (moRes.ok) setMonthlyData(await moRes.json());
        if (actRes.ok) setActivityLogs(await actRes.json());
        if (emRes.ok) setEmailLogs(await emRes.json());
      } catch (err) {
        console.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      fetchReports();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  // Calculate deliverability
  const sentCount = emailLogs.filter(l => l.status === 'sent').length;
  const totalEmails = emailLogs.length;
  const deliverabilityRate = totalEmails > 0 ? Math.round((sentCount / totalEmails) * 100) : 100;

  // Custom tooltips for nice presentation
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-surface-800 p-3 shadow-lg rounded-lg border border-surface-200 dark:border-surface-700 text-xs">
          <p className="font-semibold text-surface-900 dark:text-white mb-1">{data.status}</p>
          <p className="text-surface-600 dark:text-surface-400">Count: <span className="font-bold text-brand-600">{data.count}</span></p>
        </div>
      );
    }
    return null;
  };

  const CustomComposedTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-surface-800 p-3 shadow-lg rounded-lg border border-surface-200 dark:border-surface-700 text-xs space-y-1">
          <p className="font-semibold text-surface-900 dark:text-white border-b border-surface-100 dark:border-surface-700 pb-1 mb-1">{label}</p>
          <p className="text-brand-600 dark:text-brand-400 flex justify-between gap-4">
            <span>Revenue:</span>
            <span className="font-bold">{formatCurrency(payload[0].value)}</span>
          </p>
          {payload[1] && (
            <p className="text-emerald-600 dark:text-emerald-400 flex justify-between gap-4">
              <span>Renewals:</span>
              <span className="font-bold">{payload[1].value}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Real-time visual insights, performance metrics, and compliance logs.
          </p>
        </div>
      </div>

      {/* KPI Highlight grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
        <div className="card p-5 flex items-center gap-4 relative overflow-hidden group">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium uppercase tracking-wider">Active Portfolio</p>
            <p className="text-xl font-bold text-surface-900 dark:text-white mt-0.5">{stats?.active || 0} Services</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4 relative overflow-hidden group">
          <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium uppercase tracking-wider">Pending Reminders</p>
            <p className="text-xl font-bold text-surface-900 dark:text-white mt-0.5">{stats?.upcoming || 0} Upcoming</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4 relative overflow-hidden group">
          <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium uppercase tracking-wider">Email Deliverability</p>
            <p className="text-xl font-bold text-surface-900 dark:text-white mt-0.5">{deliverabilityRate}% Success</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4 relative overflow-hidden group">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium uppercase tracking-wider">Total Contract Pipeline</p>
            <p className="text-xl font-bold text-surface-900 dark:text-white mt-0.5">{formatCurrency(stats?.revenue || 0)}</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4 relative overflow-hidden group">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium uppercase tracking-wider">Total Profit</p>
            <p className="text-xl font-bold text-surface-900 dark:text-white mt-0.5">{formatCurrency(stats?.profit || 0)}</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4 relative overflow-hidden group">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-450">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium uppercase tracking-wider">Total Loss (Expired)</p>
            <p className="text-xl font-bold text-surface-900 dark:text-white mt-0.5">{formatCurrency(stats?.loss || 0)}</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pie Chart: Status Distribution */}
        <div className="card p-6 lg:col-span-5 h-[380px] flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">Renewal Status Distribution</h2>
            <p className="text-xs text-surface-500">Overview of status across all active renewals</p>
          </div>
          <div className="flex-1 min-h-0 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="status"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Absolute Label */}
            <div className="absolute text-center">
              <span className="text-2xl font-extrabold text-surface-900 dark:text-white">
                {statusData.reduce((acc, curr) => acc + curr.count, 0)}
              </span>
              <p className="text-[10px] text-surface-500 uppercase tracking-wider font-semibold">Total Services</p>
            </div>
          </div>
          
          {/* Custom Legends Grid */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs border-t border-surface-100 dark:border-surface-700 pt-4">
            {statusData.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.status] || '#94a3b8' }}></span>
                <span className="text-surface-700 dark:text-surface-300 font-medium">{entry.status} ({entry.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Composed Chart: Renewals and Revenue */}
        <div className="card p-6 lg:col-span-7 h-[380px] flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">Volume & Revenue Forecast</h2>
            <p className="text-xs text-surface-500">Projected contract values and counts by month</p>
          </div>
          <div className="flex-1 min-h-0 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 10, right: -5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.15} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-surface-700" />
                <XAxis dataKey="month" tick={{fontSize: 10}} tickLine={false} tickMargin={8} />
                <YAxis yAxisId="left" tick={{fontSize: 10}} tickLine={false} axisLine={false} formatter={(val) => `₹${val/1000}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<CustomComposedTooltip />} />
                <Bar yAxisId="left" dataKey="revenue" fill="url(#barGradient)" name="Revenue" radius={[4, 4, 0, 0]} barSize={32} />
                <Line yAxisId="right" type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }} name="Volume" />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3D Profit & Loss Visualizer Section */}
      <div className="card p-6 flex flex-col h-[450px] justify-between shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-surface-900 dark:text-white">3D Profit & Loss Visualizer</h2>
          <p className="text-xs text-surface-500">Interactive WebGL comparison of total portfolio profit against expired portfolio value loss</p>
        </div>
        <div className="flex-1 min-h-0 mt-4">
          <ThreeDGraph profit={stats?.profit || 0} loss={stats?.loss || 0} />
        </div>
      </div>

      {/* Logs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Logs */}
        <div className="card flex flex-col h-[500px] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center bg-surface-50/50 dark:bg-surface-900/20">
            <div>
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">Email Automation Logs</h2>
              <p className="text-xs text-surface-500">Live outbound reminder email status</p>
            </div>
            <Mail className="w-5 h-5 text-surface-400" />
          </div>
          <div className="flex-1 overflow-auto p-0 custom-scrollbar">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-surface-50 dark:bg-surface-900/50 sticky top-0 border-b border-surface-200 dark:border-surface-700">
                <tr>
                  <th className="px-4 py-3 font-semibold text-surface-500 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 font-semibold text-surface-500 uppercase tracking-wider">Client/Type</th>
                  <th className="px-4 py-3 font-semibold text-surface-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-4 py-3 font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                {emailLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-10 text-surface-400">No logs found</td>
                  </tr>
                ) : (
                  emailLogs.map(log => (
                    <tr key={log.id} className="hover:bg-surface-50 dark:hover:bg-surface-700/30 transition-colors">
                      <td className="px-4 py-3.5 text-surface-600 dark:text-surface-400">{formatDateTime(log.sent_at)}</td>
                      <td className="px-4 py-3.5 truncate max-w-[160px]" title={`${log.client_name} - ${log.email_type}`}>
                        <span className="font-semibold text-surface-900 dark:text-white">{log.client_name}</span><br/>
                        <span className="text-[10px] bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 px-1.5 py-0.5 rounded font-mono mt-0.5 inline-block">{log.email_type}</span>
                      </td>
                      <td className="px-4 py-3.5 text-surface-700 dark:text-surface-300 font-medium">{log.recipient_email}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${log.status === 'sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'}`}>
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Logs */}
        <div className="card flex flex-col h-[500px] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center bg-surface-50/50 dark:bg-surface-900/20">
            <div>
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">Audit Trail (Activity)</h2>
              <p className="text-xs text-surface-500">Immutable system action logs</p>
            </div>
            <Zap className="w-5 h-5 text-surface-400 animate-pulse" />
          </div>
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-surface-200 dark:before:bg-surface-700">
              {activityLogs.length === 0 ? (
                <p className="text-sm text-surface-500 text-center py-10">No recent activity.</p>
              ) : (
                activityLogs.map(log => (
                  <div key={log.id} className="flex gap-4 relative">
                    <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-850 flex items-center justify-center z-10 text-[10px] text-brand-600 dark:text-brand-400 font-bold shadow-sm">
                      {log.role?.[0]?.toUpperCase() || 'S'}
                    </div>
                    <div className="flex-1 bg-surface-50/50 dark:bg-surface-900/10 p-3 rounded-lg border border-surface-100 dark:border-surface-800/80">
                      <p className="text-sm text-surface-800 dark:text-surface-100 font-medium">{log.details}</p>
                      <div className="text-xs text-surface-500 mt-2 flex justify-between items-center border-t border-surface-100 dark:border-surface-800/50 pt-2">
                        <span className="font-semibold text-surface-700 dark:text-surface-300">By {log.full_name || 'System'}</span>
                        <span className="text-[10px] font-mono text-surface-400 dark:text-surface-500">{formatDateTime(log.created_at, { year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
