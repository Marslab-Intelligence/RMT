import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CalendarClock,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  IndianRupee,
  Clock,
  ArrowUpRight,
  Bell,
  TrendingUp,
  TrendingDown,
  FileText,
  Percent,
  PhoneCall,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Layers,
  Zap
} from 'lucide-react';
import { formatCurrency, formatDateTime, formatDate } from '../utils/formatters';

export default function Dashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [actionableItems, setActionableItems] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalClosed, setIsModalClosed] = useState(false);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const isAdmin = user?.role === 'admin';
        const hasNotifications = user?.role === 'sales' || user?.role === 'admin';

        const promises = [
          fetch('/api/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/dashboard/actionable-items?limit=8', { headers: { 'Authorization': `Bearer ${token}` } })
        ];

        if (isAdmin) {
          promises.push(fetch('/api/dashboard/activity-logs?limit=5', { headers: { 'Authorization': `Bearer ${token}` } }));
        }

        if (hasNotifications) {
          promises.push(
            fetch('/api/dashboard/notifications', { headers: { 'Authorization': `Bearer ${token}` } })
          );
        }

        const results = await Promise.all(promises);

        if (results[0].ok) setStats(await results[0].json());
        if (results[1].ok) setActionableItems(await results[1].json());

        let idx = 2;
        if (isAdmin) {
          if (results[idx]?.ok) setActivityLogs(await results[idx].json());
          idx++;
        }

        if (hasNotifications) {
          if (results[idx]?.ok) {
            const data = await results[idx].json();
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
    if (!token || (user?.role !== 'sales' && user?.role !== 'admin')) return;
    
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

  // Phase 2 Actionable Widgets Grid (10 iPhone Liquid Glass Widgets)
  const widgets = [
    {
      id: 'dueToday',
      title: 'Renewals Due Today',
      value: stats?.dueToday || 0,
      badgeText: 'Action Today',
      icon: CalendarCheck,
      cardStyle: 'bg-gradient-to-br from-amber-500/15 via-amber-400/10 to-amber-500/5 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-slate-900/60 border-amber-400/50 dark:border-amber-500/40 shadow-lg shadow-amber-500/5 hover:border-amber-500/80 hover:shadow-amber-500/15 backdrop-blur-xl',
      iconStyle: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40',
      badgeStyle: 'bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-500/40 font-bold',
      onClick: () => navigate('/renewals?dateRange=today')
    },
    {
      id: 'dueThisWeek',
      title: 'Renewals Due This Week',
      value: stats?.dueThisWeek || 0,
      badgeText: 'Next 7 Days',
      icon: CalendarDays,
      cardStyle: 'bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-indigo-500/5 dark:from-indigo-950/40 dark:via-blue-950/30 dark:to-slate-900/60 border-indigo-400/50 dark:border-indigo-500/40 shadow-lg shadow-indigo-500/5 hover:border-indigo-500/80 hover:shadow-indigo-500/15 backdrop-blur-xl',
      iconStyle: 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-500/40',
      badgeStyle: 'bg-indigo-500/20 text-indigo-950 dark:text-indigo-200 border border-indigo-500/40 font-bold',
      onClick: () => navigate('/renewals?dateRange=next7')
    },
    {
      id: 'dueThisMonth',
      title: 'Renewals Due This Month',
      value: stats?.dueThisMonth || 0,
      badgeText: 'Current Month',
      icon: CalendarClock,
      cardStyle: 'bg-gradient-to-br from-sky-500/15 via-cyan-500/10 to-sky-500/5 dark:from-sky-950/40 dark:via-cyan-950/30 dark:to-slate-900/60 border-sky-400/50 dark:border-sky-500/40 shadow-lg shadow-sky-500/5 hover:border-sky-500/80 hover:shadow-sky-500/15 backdrop-blur-xl',
      iconStyle: 'bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-500/40',
      badgeStyle: 'bg-sky-500/20 text-sky-950 dark:text-sky-200 border border-sky-500/40 font-bold',
      onClick: () => navigate('/renewals?dateRange=this_month')
    },
    {
      id: 'overdue',
      title: 'Overdue Renewals',
      value: stats?.overdue || 0,
      badgeText: 'Urgent',
      icon: AlertTriangle,
      cardStyle: 'bg-gradient-to-br from-rose-500/15 via-red-500/10 to-rose-500/5 dark:from-rose-950/40 dark:via-red-950/30 dark:to-slate-900/60 border-rose-400/50 dark:border-rose-500/40 shadow-lg shadow-rose-500/5 hover:border-rose-500/80 hover:shadow-rose-500/15 backdrop-blur-xl',
      iconStyle: 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/40',
      badgeStyle: 'bg-rose-500/20 text-rose-950 dark:text-rose-200 border border-rose-500/40 font-bold',
      onClick: () => navigate('/renewals?dateRange=expired')
    },
    {
      id: 'pendingClientApproval',
      title: 'Pending Client Approval',
      value: stats?.pendingClientApproval || 0,
      badgeText: 'Decision Needed',
      icon: Clock,
      cardStyle: 'bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-orange-500/5 dark:from-orange-950/40 dark:via-amber-950/30 dark:to-slate-900/60 border-orange-400/50 dark:border-orange-500/40 shadow-lg shadow-orange-500/5 hover:border-orange-500/80 hover:shadow-orange-500/15 backdrop-blur-xl',
      iconStyle: 'bg-orange-500/20 text-orange-800 dark:text-orange-300 border border-orange-500/40',
      badgeStyle: 'bg-orange-500/20 text-orange-950 dark:text-orange-200 border border-orange-500/40 font-bold',
      onClick: () => navigate('/renewals?renewalConfirmation=pending')
    },
    {
      id: 'quotesSent',
      title: 'Quotes Sent',
      value: stats?.quotesSent || 0,
      badgeText: 'Invoices/Quotes',
      icon: FileText,
      cardStyle: 'bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-blue-500/5 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-slate-900/60 border-blue-400/50 dark:border-blue-500/40 shadow-lg shadow-blue-500/5 hover:border-blue-500/80 hover:shadow-blue-500/15 backdrop-blur-xl',
      iconStyle: 'bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-500/40',
      badgeStyle: 'bg-blue-500/20 text-blue-950 dark:text-blue-200 border border-blue-500/40 font-bold',
      onClick: () => navigate('/renewals?quotesSent=true')
    },
    {
      id: 'revenueThisMonth',
      title: 'Revenue This Month',
      value: formatCurrency(stats?.revenueThisMonth || 0),
      badgeText: 'MTD Confirmed',
      icon: IndianRupee,
      cardStyle: 'bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-500/5 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900/60 border-emerald-400/50 dark:border-emerald-500/40 shadow-lg shadow-emerald-500/5 hover:border-emerald-500/80 hover:shadow-emerald-500/15 backdrop-blur-xl',
      iconStyle: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40',
      badgeStyle: 'bg-emerald-500/20 text-emerald-950 dark:text-emerald-200 border border-emerald-500/40 font-bold',
      onClick: () => navigate('/renewals?status=Renewed')
    },
    {
      id: 'expectedRevenue',
      title: 'Expected Renewal Revenue',
      value: formatCurrency(stats?.expectedRevenue || 0),
      badgeText: 'Pipeline',
      icon: TrendingUp,
      cardStyle: 'bg-gradient-to-br from-purple-500/15 via-fuchsia-500/10 to-purple-500/5 dark:from-purple-950/40 dark:via-fuchsia-950/30 dark:to-slate-900/60 border-purple-400/50 dark:border-purple-500/40 shadow-lg shadow-purple-500/5 hover:border-purple-500/80 hover:shadow-purple-500/15 backdrop-blur-xl',
      iconStyle: 'bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-500/40',
      badgeStyle: 'bg-purple-500/20 text-purple-950 dark:text-purple-200 border border-purple-500/40 font-bold',
      onClick: () => navigate('/renewals?status=Active')
    },
    {
      id: 'conversionRate',
      title: 'Renewal Conversion Rate',
      value: `${stats?.conversionRate || 0}%`,
      badgeText: 'Performance',
      icon: Percent,
      cardStyle: 'bg-gradient-to-br from-teal-500/15 via-emerald-500/10 to-teal-500/5 dark:from-teal-950/40 dark:via-emerald-950/30 dark:to-slate-900/60 border-teal-400/50 dark:border-teal-500/40 shadow-lg shadow-teal-500/5 hover:border-teal-500/80 hover:shadow-teal-500/15 backdrop-blur-xl',
      iconStyle: 'bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-500/40',
      badgeStyle: 'bg-teal-500/20 text-teal-950 dark:text-teal-200 border border-teal-500/40 font-bold',
      onClick: () => navigate('/reports')
    },
    {
      id: 'pendingFollowups',
      title: 'Pending Follow-ups',
      value: stats?.pendingFollowups || 0,
      badgeText: 'Outreach Required',
      icon: PhoneCall,
      cardStyle: 'bg-gradient-to-br from-fuchsia-500/15 via-pink-500/10 to-fuchsia-500/5 dark:from-fuchsia-950/40 dark:via-pink-950/30 dark:to-slate-900/60 border-fuchsia-400/50 dark:border-fuchsia-500/40 shadow-lg shadow-fuchsia-500/5 hover:border-fuchsia-500/80 hover:shadow-fuchsia-500/15 backdrop-blur-xl',
      iconStyle: 'bg-fuchsia-500/20 text-fuchsia-800 dark:text-fuchsia-300 border border-fuchsia-500/40',
      badgeStyle: 'bg-fuchsia-500/20 text-fuchsia-950 dark:text-fuchsia-200 border border-fuchsia-500/40 font-bold',
      onClick: () => navigate('/renewals?pendingFollowup=true')
    }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
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

    if (msg.includes('CST team requested edit access for ')) {
      return '/renewals?search=' + encodeURIComponent(msg.split('CST team requested edit access for ')[1].trim());
    }
    if (msg.includes('Edit approved for ')) {
      return '/renewals?search=' + encodeURIComponent(msg.split('Edit approved for ')[1].trim());
    }
    if (msg.includes('New renewal created for ')) {
      const after = msg.split('New renewal created for ')[1];
      const client = after.split(' (')[0];
      return '/renewals?search=' + encodeURIComponent(client.trim());
    }
    if (msg.includes('Please meet ')) {
      const after = msg.split('Please meet ')[1];
      const client = after.split(' regarding')[0];
      return '/renewals?search=' + encodeURIComponent(client.trim());
    }
    if (msg.includes(' reminder sent for ')) {
      const after = msg.split(' reminder sent for ')[1];
      const client = after.split(' (')[0];
      return '/renewals?search=' + encodeURIComponent(client.trim());
    }
    if (msg.includes("'s ") && msg.includes(" renewal has expired")) {
      const client = msg.split("'s ")[0];
      return '/renewals?search=' + encodeURIComponent(client.trim());
    }
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
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
    setPrevUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await fetch(`/api/dashboard/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    setPrevUnreadCount(0);
    setIsModalClosed(true);
    try {
      await fetch('/api/dashboard/notifications/read-all', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const filteredNotifications = notifications.filter(notif => notif.title?.toLowerCase() !== 'email sent');
  const unreadNotifications = filteredNotifications.filter(n => n.read === 0);

  return (
    <div className="space-y-8 pb-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-black dark:text-white">Actionable Executive Dashboard</h1>
            <span className="bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-brand-500/20 backdrop-blur-md">
              Phase 2
            </span>
          </div>
          <p className="text-slate-800 dark:text-surface-400 mt-1 text-sm">
            Welcome back, <span className="font-semibold text-black dark:text-surface-200">{user?.fullName}</span>. Prioritize immediate actions and manage upcoming renewals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/renewals')}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-2 shadow-md shadow-brand-500/20"
          >
            <Layers className="w-4 h-4" />
            <span>Open Renewal Manager</span>
          </button>
        </div>
      </div>

      {/* 10 iPhone Liquid Glass Metrics Cards Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
      >
        {widgets.map((widget) => {
          const Icon = widget.icon;
          return (
            <motion.div
              key={widget.id}
              variants={item}
              onClick={widget.onClick}
              className={`p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 cursor-pointer relative overflow-hidden group flex flex-col justify-between ${widget.cardStyle}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className={`p-2 rounded-xl backdrop-blur-md ${widget.iconStyle}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-sm ${widget.badgeStyle}`}>
                    {widget.badgeText}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-black dark:text-white/90 transition-colors leading-tight">
                  {widget.title}
                </h3>
                <div className="text-2xl font-black text-black dark:text-white mt-1 group-hover:scale-105 transition-transform origin-left">
                  {widget.value}
                </div>
              </div>
              <div className="mt-4 pt-2.5 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-[11px] font-bold text-black dark:text-white/70">
                <span>View items</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-black dark:text-white/80" />
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Priority Action Needed Section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-6 border-t-4 border-amber-500 shadow-md"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
                Immediate Action Required
                <span className="text-xs font-normal text-surface-500 dark:text-surface-400">
                  (Top Priorities Needing Attention)
                </span>
              </h2>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                Renewals due today, overdue, or waiting on client follow-up decision
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/renewals?dateRange=expired')}
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View All Priorities</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {actionableItems.length === 0 ? (
          <div className="py-8 text-center bg-surface-50 dark:bg-surface-900/30 rounded-xl border border-dashed border-surface-200 dark:border-surface-700">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-surface-700 dark:text-surface-300">All caught up!</p>
            <p className="text-xs text-surface-500 mt-1">No high-priority overdue or due today items currently pending.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700/60 text-[11px] uppercase tracking-wider text-surface-500 dark:text-surface-400 font-semibold bg-surface-50/50 dark:bg-surface-900/40">
                  <th className="py-3 px-4 rounded-l-lg">Client & Service</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Follow-up</th>
                  <th className="py-3 px-4 text-right rounded-r-lg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200/60 dark:divide-surface-700/40 text-xs">
                {actionableItems.map((item) => {
                  const isDueToday = item.renewal_date && new Date(item.renewal_date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                  const isOverdue = item.renewal_date && new Date(item.renewal_date) < new Date(new Date().setHours(0,0,0,0));

                  return (
                    <tr 
                      key={item.id}
                      onClick={() => navigate(`/renewals?search=${encodeURIComponent(item.client_name)}`)}
                      className="hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-semibold text-surface-900 dark:text-white">
                        <div className="truncate max-w-[200px]">{item.client_name}</div>
                        <div className="text-[11px] font-normal text-surface-500 truncate max-w-[200px]">{item.service}</div>
                      </td>
                      <td className="py-3 px-4 font-medium whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          isDueToday 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse' 
                            : isOverdue 
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' 
                              : 'text-surface-700 dark:text-surface-300'
                        }`}>
                          {item.renewal_date ? formatDate(item.renewal_date) : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-surface-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(item.value)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'Expired' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-surface-600 dark:text-surface-300 whitespace-nowrap">
                        {item.follow_up_status || 'Pending'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/renewals?search=${encodeURIComponent(item.client_name)}`);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-900/50 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <span>Review</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Liquid Glass Profit & Loss Metric Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Profit Card */}
        <div 
          onClick={() => navigate('/renewals')}
          className="p-6 rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer relative overflow-hidden group flex justify-between items-center bg-gradient-to-br from-emerald-500/15 via-teal-400/10 to-emerald-500/5 dark:from-emerald-950/40 dark:via-teal-900/30 dark:to-slate-900/60 border-emerald-400/50 dark:border-emerald-500/40 shadow-lg shadow-emerald-500/5 hover:border-emerald-500/80 hover:shadow-emerald-500/15"
        >
          <div className="flex flex-col justify-between h-full z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-widest">Total Portfolio Profit</span>
              </div>
              <div className="text-3xl font-black text-black dark:text-white mt-1.5">{formatCurrency(stats?.profit || 0)}</div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-emerald-950 dark:text-emerald-300 text-xs font-bold bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/40 w-fit backdrop-blur-md">
              <TrendingUp className="w-4 h-4" />
              <span>Active portfolio yield</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 backdrop-blur-md group-hover:scale-110 transition-transform">
            <TrendingUp className="w-8 h-8" />
          </div>
        </div>

        {/* Total Loss Card */}
        <div 
          onClick={() => navigate('/renewals?status=Expired')}
          className="p-6 rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer relative overflow-hidden group flex justify-between items-center bg-gradient-to-br from-rose-500/15 via-red-400/10 to-rose-500/5 dark:from-rose-950/40 dark:via-red-900/30 dark:to-slate-900/60 border-rose-400/50 dark:border-rose-500/40 shadow-lg shadow-rose-500/5 hover:border-rose-500/80 hover:shadow-rose-500/15"
        >
          <div className="flex flex-col justify-between h-full z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span className="text-[11px] font-bold text-rose-900 dark:text-rose-300 uppercase tracking-widest">Total Loss (Expired)</span>
              </div>
              <div className="text-3xl font-black text-black dark:text-white mt-1.5">{formatCurrency(stats?.loss || 0)}</div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-rose-950 dark:text-rose-300 text-xs font-bold bg-rose-500/20 px-3 py-1 rounded-full border border-rose-500/40 w-fit backdrop-blur-md">
              <TrendingDown className="w-4 h-4" />
              <span>Expired service losses</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/40 backdrop-blur-md group-hover:scale-110 transition-transform">
            <TrendingDown className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Modern Activity Feed & Live Updates Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={`grid grid-cols-1 ${
          user?.role === 'admin' 
            ? 'md:grid-cols-2 xl:grid-cols-2' 
            : 'md:grid-cols-1 xl:grid-cols-1'
        } gap-6`}
      >
        {/* Logs Container - Admin Only */}
        {user?.role === 'admin' && (
          <div className="p-6 rounded-2xl border bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border-white/80 dark:border-white/15 shadow-xl shadow-black/5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-500/40 backdrop-blur-md">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-black dark:text-white leading-none">System Audit Logs</h2>
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-400 mt-1">Live user actions & system activity</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/activity-logs')} 
                className="text-xs text-brand-700 dark:text-brand-300 font-bold hover:underline bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20 backdrop-blur-md"
              >
                View All
              </button>
            </div>

            <div className="space-y-3.5 flex-1">
               {activityLogs.length === 0 ? (
                 <p className="text-sm font-semibold text-slate-700 dark:text-slate-400 text-center py-6">No recent activity logged.</p>
               ) : (
                  activityLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex items-center gap-3.5 p-2.5 rounded-xl bg-white/50 dark:bg-slate-800/40 border border-white/60 dark:border-white/10 hover:border-brand-500/40 transition-all group">
                       <div className="w-2.5 h-2.5 rounded-full bg-brand-500 flex-shrink-0 group-hover:scale-125 transition-transform shadow-sm shadow-brand-500/50"></div>
                       <div className="flex-1 min-w-0">
                         <p className="text-xs font-bold text-black dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{log.details}</p>
                         <p className="text-[10px] font-bold text-slate-700 dark:text-slate-400 mt-0.5">
                           {formatDateTime(log.created_at)}
                         </p>
                       </div>
                    </div>
                  ))
               )}
            </div>
          </div>
        )}

        {/* Updates Container */}
        {(user?.role === 'sales' || user?.role === 'admin') && (
          <div className="p-6 rounded-2xl border bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border-white/80 dark:border-white/15 shadow-xl shadow-black/5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 backdrop-blur-md">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-black dark:text-white leading-none">Live Updates & Alerts</h2>
                    {filteredNotifications.some(n => n.read === 0) && (
                      <span className="bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-400 mt-1">Real-time status changes & notifications</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/notifications')} 
                className="text-xs text-brand-700 dark:text-brand-300 font-bold hover:underline bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20 backdrop-blur-md"
              >
                View All
              </button>
            </div>

            <div className="space-y-3 flex-1">
              {filteredNotifications.length === 0 ? (
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-400 text-center py-6">No recent updates available.</p>
              ) : (
                filteredNotifications.slice(0, 5).map(notif => {
                  const notifColorMap = {
                    success: 'bg-emerald-500 border-emerald-500/50',
                    warning: 'bg-amber-500 border-amber-500/50',
                    error: 'bg-rose-500 border-rose-500/50',
                    info: 'bg-blue-500 border-blue-500/50'
                  };
                  const bulletStyle = notifColorMap[notif.type] || 'bg-brand-500 border-brand-500/50';
                  
                  return (
                    <div 
                      key={notif.id} 
                      onClick={() => handleNotificationClick(notif)}
                      className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                        notif.read === 0 
                          ? 'bg-amber-500/10 dark:bg-amber-500/10 border-amber-400/40 shadow-sm' 
                          : 'bg-white/50 dark:bg-slate-800/40 border-white/60 dark:border-white/10 hover:border-brand-500/40'
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${bulletStyle} mt-1 flex-shrink-0 ${notif.read === 0 ? 'animate-pulse scale-110' : ''}`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-black text-black dark:text-white truncate">
                            {notif.title}
                          </p>
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-400 flex-shrink-0">
                            {formatDateTime(notif.created_at)}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-300 mt-1 break-words leading-relaxed">
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

      {/* Unread Notifications Alert Modal */}
      {(user?.role === 'sales' || user?.role === 'admin') && unreadNotifications.length > 0 && !isModalClosed && createPortal(
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
            <div className="bg-surface-50 dark:bg-surface-900/50 px-6 py-4 border-t border-surface-200 dark:border-surface-700 flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
              >
                Mark all as read
              </button>
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
