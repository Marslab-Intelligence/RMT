import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Bell,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import MagicBento from '../components/MagicBento';

export default function Dashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalClosed, setIsModalClosed] = useState(false);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const promises = [
          fetch('/api/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/dashboard/activity-logs?limit=5', { headers: { 'Authorization': `Bearer ${token}` } })
        ];

        const hasNotifications = user?.role === 'finance' || user?.role === 'admin';

        if (hasNotifications) {
          promises.push(
            fetch('/api/dashboard/notifications', { headers: { 'Authorization': `Bearer ${token}` } })
          );
        }

        const results = await Promise.all(promises);

        if (results[0].ok) setStats(await results[0].json());
        if (results[1].ok) setActivityLogs(await results[1].json());
        
        let promiseIdx = 2;
        if (hasNotifications) {
          if (results[promiseIdx]?.ok) {
            const data = await results[promiseIdx].json();
            const fetched = data.notifications || [];
            setNotifications(fetched);
            const filtered = fetched.filter(notif => notif.title?.toLowerCase() !== 'email sent');
            const unreadCount = filtered.filter(n => n.read === 0).length;
            setPrevUnreadCount(unreadCount);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      fetchData();
    }
  }, [token, user]);

  useEffect(() => {
    if (!token || (user?.role !== 'finance' && user?.role !== 'admin')) return;
    
    const fetchNotificationsOnly = async () => {
      try {
        const res = await fetch('/api/dashboard/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const fetched = data.notifications || [];
          setNotifications(fetched);
          
          const filtered = fetched.filter(notif => notif.title?.toLowerCase() !== 'email sent');
          const unreadCount = filtered.filter(n => n.read === 0).length;
          
          setPrevUnreadCount(prev => {
            if (unreadCount > prev) {
              setIsModalClosed(false);
            }
            return unreadCount;
          });
        }
      } catch (err) {
        console.error('Failed to fetch notifications in background', err);
      }
    };

    const interval = setInterval(fetchNotificationsOnly, 8000);
    return () => clearInterval(interval);
  }, [token, user]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const kpis = [
    { title: 'Total Services', value: stats?.total || 0, icon: Users, color: 'bg-blue-500', lightBg: 'bg-blue-50 dark:bg-blue-900/20', lightText: 'text-blue-600 dark:text-blue-400', statusQuery: 'all' },
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

  const extractClientFromNotification = (notif) => {
    if (notif.link) return notif.link;

    const msg = notif.message;
    if (!msg) return null;

    // 1. Edit Access Requested: "CST team requested edit access for [client]"
    if (msg.includes('CST team requested edit access for ')) {
      return '/renewals?search=' + encodeURIComponent(msg.split('CST team requested edit access for ')[1].trim());
    }
    
    // 2. Edit Approved: "Edit approved for [client]"
    if (msg.includes('Edit approved for ')) {
      return '/renewals?search=' + encodeURIComponent(msg.split('Edit approved for ')[1].trim());
    }

    // 3. New renewal created: "New renewal created for [client] ([service])..."
    if (msg.includes('New renewal created for ')) {
      const after = msg.split('New renewal created for ')[1];
      const client = after.split(' (')[0];
      return '/renewals?search=' + encodeURIComponent(client.trim());
    }

    // 4. Follow-Up Required: "Please meet [client] regarding [service]..."
    if (msg.includes('Please meet ')) {
      const after = msg.split('Please meet ')[1];
      const client = after.split(' regarding')[0];
      return '/renewals?search=' + encodeURIComponent(client.trim());
    }

    // 5. Email Sent: "[N]-day reminder sent for [client] ([service])."
    if (msg.includes(' reminder sent for ')) {
      const after = msg.split(' reminder sent for ')[1];
      const client = after.split(' (')[0];
      return '/renewals?search=' + encodeURIComponent(client.trim());
    }

    // 6. Renewal Expired: "[client]'s [service] renewal has expired."
    if (msg.includes("'s ") && msg.includes(" renewal has expired")) {
      const client = msg.split("'s ")[0];
      return '/renewals?search=' + encodeURIComponent(client.trim());
    }

    // 7. Client Renewed: "Renewal processed for [client]."
    if (msg.includes('Renewal processed for ')) {
      const after = msg.split('Renewal processed for ')[1];
      const client = after.split('.')[0];
      return '/renewals?search=' + encodeURIComponent(client.trim());
    }

    return null;
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
    const path = extractClientFromNotification(notif);
    if (path) {
      navigate(path);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await fetch(`/api/dashboard/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/dashboard/notifications/read-all', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const filteredNotifications = notifications.filter(notif => notif.title?.toLowerCase() !== 'email sent');
  const unreadNotifications = filteredNotifications.filter(n => n.read === 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Overview</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">Welcome back, {user?.fullName}. Here's what's happening today.</p>
        </div>
      </div>

      {/* KPI Cards — MagicBento */}
      <MagicBento
        textAutoHide={false}
        enableStars
        enableSpotlight
        enableBorderGlow
        enableTilt
        enableMagnetism={false}
        clickEffect
        spotlightRadius={400}
        particleCount={10}
        glowColor="132, 0, 255"
        cards={kpis.map(kpi => {
          const Icon = kpi.icon;
          return {
            label: kpi.title,
            value: kpi.value,
            icon: <Icon style={{ width: 14, height: 14, color: '#8b5cf6' }} />,
            onClick: () => navigate(`/renewals?status=${kpi.statusQuery}`)
          };
        })}
      />

      {/* Profit & Loss Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Total Profit Card */}
        <div 
          onClick={() => navigate('/renewals')}
          className="card card-profit p-6 flex justify-between items-center relative overflow-hidden group shadow-md cursor-pointer"
        >
          <div className="flex flex-col justify-between h-full z-10">
            <div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Total Profit</span>
              <div className="text-3xl font-black text-surface-900 dark:text-white mt-2">{formatCurrency(stats?.profit || 0)}</div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-emerald-600/90 dark:text-emerald-400/90 text-xs font-semibold">
              <TrendingUp className="w-4 h-4" />
              <span>Active portfolio yield</span>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none" />
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-300 pointer-events-none" />
        </div>

        {/* Total Loss Card */}
        <div 
          onClick={() => navigate('/renewals?status=Expired')}
          className="card card-loss p-6 flex justify-between items-center relative overflow-hidden group shadow-md cursor-pointer"
        >
          <div className="flex flex-col justify-between h-full z-10">
            <div>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest">Total Loss (Expired)</span>
              <div className="text-3xl font-black text-surface-900 dark:text-white mt-2">{formatCurrency(stats?.loss || 0)}</div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-rose-600/90 dark:text-rose-400/90 text-xs font-semibold">
              <TrendingDown className="w-4 h-4" />
              <span>Expired service losses</span>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-rose-500/5 to-transparent pointer-events-none" />
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-300 pointer-events-none" />
        </div>
      </div>


      {/* Quick Action / Notice Area */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className={`mt-8 grid grid-cols-1 ${
          (user?.role === 'finance' || user?.role === 'admin') 
            ? 'md:grid-cols-2 xl:grid-cols-2' 
            : 'md:grid-cols-1 xl:grid-cols-1'
        } gap-6`}
      >
        <div className="card p-6 border-t-2 border-brand-500">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">Logs</h2>
            <button 
              onClick={() => navigate('/activity-logs')} 
              className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
            >
              View All
            </button>
          </div>
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

        {(user?.role === 'finance' || user?.role === 'admin') && (
          <div className="card p-6 border-t-2 border-brand-500">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-500" />
                <h2 className="text-lg font-bold text-surface-900 dark:text-white">Updates</h2>
                {filteredNotifications.some(n => n.read === 0) && (
                  <span className="bg-brand-100 text-brand-800 text-[10px] font-semibold px-2 py-0.5 rounded-full dark:bg-brand-900/30 dark:text-brand-400 animate-pulse">
                    New
                  </span>
                )}
              </div>
              <button 
                onClick={() => navigate('/notifications')} 
                className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
              >
                View All
              </button>
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

      {/* Finance Unread Notifications Alert Modal */}
      {user?.role === 'finance' && unreadNotifications.length > 0 && !isModalClosed && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-600 to-emerald-600 px-6 py-4 flex items-center gap-3 text-white">
              <div className="bg-white/20 p-2 rounded-lg animate-bounce">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">New System Updates</h3>
                <p className="text-xs text-white/80">You have {unreadNotifications.length} unread update{unreadNotifications.length > 1 ? 's' : ''} to review</p>
              </div>
            </div>

            {/* Notifications List */}
            <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar space-y-4">
              {unreadNotifications.map((notif) => {
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
                    className="flex items-start gap-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-900/40 border border-surface-200/60 dark:border-surface-700/50 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800/60 transition-colors text-left"
                  >
                    <div className={`w-3 h-3 rounded-full ${bulletColor} mt-1.5 flex-shrink-0 animate-pulse`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-sm font-bold text-surface-900 dark:text-white">{notif.title}</h4>
                        <span className="text-[10px] text-surface-400 font-medium">{formatDateTime(notif.created_at)}</span>
                      </div>
                      <p className="text-xs text-surface-600 dark:text-surface-300 mt-1 leading-relaxed whitespace-pre-line">
                        {notif.message}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkRead(notif.id);
                      }}
                      title="Mark as Read"
                      className="flex-shrink-0 p-2 text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white dark:hover:bg-surface-800 rounded-lg transition-colors border border-transparent hover:border-surface-200 dark:hover:border-surface-700 font-semibold text-xs flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 bg-brand-500 rounded-full"></span>
                      Mark Read
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="bg-surface-50 dark:bg-surface-900/50 px-6 py-4 border-t border-surface-250 dark:border-surface-700 flex justify-end gap-3">
              <button
                onClick={() => setIsModalClosed(true)}
                className="btn-secondary w-full sm:w-auto px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
