import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  CalendarClock, 
  CheckCircle2, 
  AlertCircle, 
  IndianRupee, 
  Clock,
  ArrowUpRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export default function Dashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, logsRes] = await Promise.all([
          fetch('/api/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/dashboard/activity-logs?limit=5', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (logsRes.ok) setActivityLogs(await logsRes.json());
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const kpis = [
    { title: 'Total Clients', value: stats?.total || 0, icon: Users, color: 'bg-blue-500', trend: '+12%', lightBg: 'bg-blue-50 dark:bg-blue-900/20', lightText: 'text-blue-600 dark:text-blue-400', statusQuery: 'all' },
    { title: 'Upcoming (30d)', value: stats?.upcoming || 0, icon: CalendarClock, color: 'bg-orange-500', trend: 'Action Req.', lightBg: 'bg-orange-50 dark:bg-orange-900/20', lightText: 'text-orange-600 dark:text-orange-400', statusQuery: 'Pending Renewal' },
    { title: 'Renewed', value: stats?.renewed || 0, icon: CheckCircle2, color: 'bg-emerald-500', trend: '+24%', lightBg: 'bg-emerald-50 dark:bg-emerald-900/20', lightText: 'text-emerald-600 dark:text-emerald-400', statusQuery: 'Renewed' },
    { title: 'Expired', value: stats?.expired || 0, icon: AlertCircle, color: 'bg-red-500', trend: '-2%', lightBg: 'bg-red-50 dark:bg-red-900/20', lightText: 'text-red-600 dark:text-red-400', statusQuery: 'Expired' },
    { title: 'Pending Follow-ups', value: stats?.pendingFollowups || 0, icon: Clock, color: 'bg-purple-500', trend: 'Priority', lightBg: 'bg-purple-50 dark:bg-purple-900/20', lightText: 'text-purple-600 dark:text-purple-400', statusQuery: 'Active' },
    { title: 'Total Revenue Value', value: formatCurrency(stats?.revenue || 0), icon: IndianRupee, color: 'bg-brand-500', trend: '+18%', lightBg: 'bg-brand-50 dark:bg-brand-900/20', lightText: 'text-brand-600 dark:text-brand-400', statusQuery: 'all' },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Overview</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">Welcome back, {user?.fullName}. Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-surface-500 flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-500" /> System Status: Online
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <motion.div 
              key={index} 
              variants={item}
              onClick={() => navigate(`/renewals?status=${kpi.statusQuery}`)}
              className="card p-6 flex flex-col justify-between hover:border-brand-500/50 transition-colors relative overflow-hidden group cursor-pointer"
            >
              
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${kpi.lightBg} ${kpi.lightText}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                  {kpi.trend.includes('-') || kpi.trend.includes('Req') || kpi.trend.includes('Priority') ? null : <TrendingUp className="w-3 h-3 mr-1" />}
                  {kpi.trend}
                </div>
              </div>
              
              <div>
                <h3 className="text-surface-500 dark:text-surface-400 text-sm font-medium mb-1">{kpi.title}</h3>
                <p className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">{kpi.value}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Quick Action / Notice Area */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <div className="card p-6 bg-surface-900 text-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-white">
            <CalendarClock className="w-48 h-48" />
          </div>
          <h2 className="text-xl font-bold mb-2 relative z-10">Automation is Active</h2>
          <p className="text-surface-300 mb-6 max-w-md relative z-10">
            The automated email scheduler is running. Next reminder batch will be processed at 09:00 AM.
          </p>
          <button 
            onClick={() => navigate('/reports')}
            className="bg-white text-surface-900 px-4 py-2 rounded-md text-sm font-semibold flex items-center hover:bg-surface-100 transition-colors relative z-10"
          >
            View Email Logs <ArrowUpRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        <div className="card p-6 dark:bg-surface-800 dark:border-surface-700">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-4">Recent Activity</h2>
          <div className="space-y-4">
             {activityLogs.length === 0 ? (
               <p className="text-sm text-surface-500">No recent activity.</p>
             ) : (
               activityLogs.map(log => (
                 <div key={log.id} className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-surface-900 dark:text-surface-100 font-medium truncate">{log.details}</p>
                      <p className="text-xs text-surface-500">
                        {formatDateTime(log.created_at)}
                      </p>
                    </div>
                 </div>
               ))
             )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
