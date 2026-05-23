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
  Activity,
  Bell
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export default function Dashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [editedLogs, setEditedLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const promises = [
          fetch('/api/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/dashboard/activity-logs?limit=5', { headers: { 'Authorization': `Bearer ${token}` } })
        ];

        const hasEdits = user?.role === 'finance' || user?.role === 'admin' || user?.role === 'sales';
        const hasNotifications = user?.role === 'finance' || user?.role === 'admin';

        if (hasEdits) {
          promises.push(
            fetch('/api/renewals/edits-history?limit=5', { headers: { 'Authorization': `Bearer ${token}` } })
          );
        }

        if (hasNotifications) {
          promises.push(
            fetch('/api/dashboard/notifications', { headers: { 'Authorization': `Bearer ${token}` } })
          );
        }

        const results = await Promise.all(promises);

        if (results[0].ok) setStats(await results[0].json());
        if (results[1].ok) setActivityLogs(await results[1].json());
        
        let promiseIdx = 2;
        if (hasEdits) {
          if (results[promiseIdx]?.ok) {
            setEditedLogs(await results[promiseIdx].json());
          }
          promiseIdx++;
        }

        if (hasNotifications) {
          if (results[promiseIdx]?.ok) {
            const data = await results[promiseIdx].json();
            setNotifications(data.notifications || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, user]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const kpis = [
    { title: 'Total Clients', value: stats?.total || 0, icon: Users, color: 'bg-blue-500', lightBg: 'bg-blue-50 dark:bg-blue-900/20', lightText: 'text-blue-600 dark:text-blue-400', statusQuery: 'all' },
    { title: 'Upcoming (30d)', value: stats?.upcoming || 0, icon: CalendarClock, color: 'bg-orange-500', lightBg: 'bg-orange-50 dark:bg-orange-900/20', lightText: 'text-orange-600 dark:text-orange-400', statusQuery: 'Pending Renewal' },
    { title: 'Renewed', value: stats?.renewed || 0, icon: CheckCircle2, color: 'bg-emerald-500', lightBg: 'bg-emerald-50 dark:bg-emerald-900/20', lightText: 'text-emerald-600 dark:text-emerald-400', statusQuery: 'Renewed' },
    { title: 'Expired', value: stats?.expired || 0, icon: AlertCircle, color: 'bg-red-500', lightBg: 'bg-red-50 dark:bg-red-900/20', lightText: 'text-red-600 dark:text-red-400', statusQuery: 'Expired' },
    { title: 'Pending Follow-ups', value: stats?.pendingFollowups || 0, icon: Clock, color: 'bg-purple-500', lightBg: 'bg-purple-50 dark:bg-purple-900/20', lightText: 'text-purple-600 dark:text-purple-400', statusQuery: 'Active' },
    { title: 'Total Revenue Value', value: formatCurrency(stats?.revenue || 0), icon: IndianRupee, color: 'bg-brand-500', lightBg: 'bg-brand-50 dark:bg-brand-900/20', lightText: 'text-brand-600 dark:text-brand-400', statusQuery: 'all' },
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

  const handleNotificationClick = async (notif) => {
    if (notif.read === 0) {
      try {
        await fetch(`/api/dashboard/notifications/${notif.id}/read`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: 1 } : n));
      } catch (err) {
        console.error('Failed to mark notification as read', err);
      }
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const filteredNotifications = notifications.filter(notif => notif.title?.toLowerCase() !== 'email sent');

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
        className={`mt-8 grid grid-cols-1 md:grid-cols-2 ${
          (user?.role === 'finance' || user?.role === 'admin') 
            ? 'xl:grid-cols-3' 
            : (user?.role === 'sales') 
              ? 'xl:grid-cols-2' 
              : 'xl:grid-cols-1'
        } gap-6`}
      >
        <div className="card p-6">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-4">Logs</h2>
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

        {(user?.role === 'finance' || user?.role === 'admin' || user?.role === 'sales') && (
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">Recent Edits</h2>
              <button 
                onClick={() => navigate('/edits-history')} 
                className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {editedLogs.length === 0 ? (
                <p className="text-sm text-surface-500">No recent edits.</p>
              ) : (
                editedLogs.map(log => {
                  let reason = '';
                  try {
                    const next = typeof log.new_data === 'string' ? JSON.parse(log.new_data) : log.new_data;
                    reason = next?.reason || '';
                  } catch (e) {}
                  return (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-surface-900 dark:text-surface-100 font-semibold truncate">
                          {log.client_name || 'Renewal Record'}
                        </p>
                        <p className="text-xs text-surface-500 truncate">
                          Edited by <span className="font-medium text-surface-700 dark:text-surface-300">{log.performed_by_name}</span> ({log.performed_by_role === 'sales' ? 'CST' : 'Admin'})
                        </p>
                        {reason && (
                          <p className="text-xs text-surface-500 dark:text-surface-400 italic truncate mt-0.5" title={reason}>
                            "{reason}"
                          </p>
                        )}
                        <p className="text-[10px] text-surface-400 mt-0.5">
                          {formatDateTime(log.performed_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {(user?.role === 'finance' || user?.role === 'admin') && (
          <div className="card p-6 border-t-2 border-brand-500">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-500" />
                <h2 className="text-lg font-bold text-surface-900 dark:text-white">Updates</h2>
              </div>
              {filteredNotifications.some(n => n.read === 0) && (
                <span className="bg-brand-100 text-brand-800 text-[10px] font-semibold px-2 py-0.5 rounded-full dark:bg-brand-900/30 dark:text-brand-400 animate-pulse">
                  New
                </span>
              )}
            </div>
            <div className="space-y-3 pr-1">
              {filteredNotifications.length === 0 ? (
                <p className="text-sm text-surface-500">No recent updates.</p>
              ) : (
                filteredNotifications.slice(0, 5).map(notif => {
                  const notifColorMap = {
                    success: 'bg-emerald-500',
                    warning: 'bg-amber-500',
                    error: 'bg-rose-500',
                    info: 'bg-blue-500'
                  };
                  const bulletColor = notifColorMap[notif.type] || 'bg-brand-500';
                  
                  return (
                    <div 
                      key={notif.id} 
                      onClick={() => handleNotificationClick(notif)}
                      className={`flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors border border-transparent hover:border-surface-200 dark:hover:border-surface-700 ${notif.read === 0 ? 'bg-surface-50/50 dark:bg-surface-800/20 font-medium' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${bulletColor} mt-1.5 flex-shrink-0 ${notif.read === 0 ? 'animate-pulse' : ''}`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-bold text-surface-900 dark:text-white truncate ${notif.read === 0 ? 'text-brand-600 dark:text-brand-400' : ''}`}>
                            {notif.title}
                          </p>
                          <span className="text-[9px] text-surface-400 flex-shrink-0">
                            {formatDateTime(notif.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-surface-600 dark:text-surface-300 mt-0.5 break-words leading-normal">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
