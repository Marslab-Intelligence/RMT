import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Bell, 
  CheckSquare, 
  Search, 
  ArrowRight, 
  ShieldAlert, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  FileText, 
  CreditCard, 
  MessageSquare,
  ChevronRight,
  Sparkles,
  Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDateTime, formatCurrency, formatDate } from '../utils/formatters';

export default function Notifications() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [centerData, setCenterData] = useState({
    categories: {
      dueToday: 0,
      overdue: 0,
      followupsDueToday: 0,
      clientResponse: 0,
      quotePending: 0,
      paymentPending: 0
    },
    items: {
      dueToday: [],
      overdue: [],
      followupsDueToday: [],
      clientResponse: [],
      quotePending: [],
      paymentPending: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'dueToday', 'overdue', 'followupsDueToday', 'clientResponse', 'quotePending', 'paymentPending'
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'logs'
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotificationCenterData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/dashboard/notification-center', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCenterData(data);
      }
    } catch (err) {
      console.error('Failed to load notification center metrics:', err);
    }
  }, [token]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      } else {
        toast.error('Failed to load notification logs');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchNotifications();
      fetchNotificationCenterData();
    }
  }, [token, fetchNotifications, fetchNotificationCenterData]);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch(`/api/dashboard/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
        toast.success('Notification marked as read');
      }
    } catch (err) {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/dashboard/notifications/read-all', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
        toast.success('All notifications marked as read');
      }
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const extractClientFromNotification = (notif) => {
    if (notif.link) return notif.link;
    const msg = notif.message;
    if (!msg) return null;
    if (msg.includes('CST team requested edit access for ')) return '/renewals?search=' + encodeURIComponent(msg.split('CST team requested edit access for ')[1].trim());
    if (msg.includes('Edit approved for ')) return '/renewals?search=' + encodeURIComponent(msg.split('Edit approved for ')[1].trim());
    if (msg.includes('New renewal created for ')) return '/renewals?search=' + encodeURIComponent(msg.split('New renewal created for ')[1].split(' (')[0].trim());
    if (msg.includes('Please meet ')) return '/renewals?search=' + encodeURIComponent(msg.split('Please meet ')[1].split(' regarding')[0].trim());
    if (msg.includes(' reminder sent for ')) return '/renewals?search=' + encodeURIComponent(msg.split(' reminder sent for ')[1].split(' (')[0].trim());
    if (msg.includes("'s ") && msg.includes(" renewal has expired")) return '/renewals?search=' + encodeURIComponent(msg.split("'s ")[0].trim());
    if (msg.includes('Renewal processed for ')) return '/renewals?search=' + encodeURIComponent(msg.split('Renewal processed for ')[1].split('.')[0].trim());
    return null;
  };

  const handleNotificationClick = async (notif) => {
    if (notif.read === 0) {
      await handleMarkAsRead(notif.id);
    }
    const path = extractClientFromNotification(notif);
    if (path) {
      navigate(path);
    }
  };

  const handleTaskAction = (clientName) => {
    navigate('/renewals?search=' + encodeURIComponent(clientName));
  };

  // Combine Actionable Tasks based on active category filter
  const getActionableItems = () => {
    const { items } = centerData;
    let list = [];
    if (activeCategory === 'all') {
      list = [
        ...items.dueToday,
        ...items.overdue,
        ...items.followupsDueToday,
        ...items.clientResponse,
        ...items.quotePending,
        ...items.paymentPending
      ];
      // Deduplicate by ID
      const seen = new Set();
      list = list.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    } else {
      list = items[activeCategory] || [];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        (item.client_name && item.client_name.toLowerCase().includes(q)) ||
        (item.service && item.service.toLowerCase().includes(q)) ||
        (item.unique_id && item.unique_id.toLowerCase().includes(q))
      );
    }

    return list;
  };

  const filteredNotifications = notifications
    .filter(notif => notif.title?.toLowerCase() !== 'email sent')
    .filter(notif => {
      if (filter === 'unread') return notif.read === 0;
      if (filter === 'read') return notif.read === 1;
      return true;
    })
    .filter(notif => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        notif.title?.toLowerCase().includes(query) ||
        notif.message?.toLowerCase().includes(query)
      );
    });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'error': return <ShieldAlert className="w-5 h-5 text-rose-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const categoryCards = [
    {
      id: 'dueToday',
      title: 'Renewals Due Today',
      count: centerData.categories.dueToday,
      icon: Clock,
      color: 'from-amber-500/20 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
    },
    {
      id: 'overdue',
      title: 'Overdue Renewals',
      count: centerData.categories.overdue,
      icon: AlertTriangle,
      color: 'from-rose-500/20 to-red-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
      badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
    },
    {
      id: 'followupsDueToday',
      title: 'Follow-ups Due Today',
      count: centerData.categories.followupsDueToday,
      icon: Calendar,
      color: 'from-blue-500/20 to-cyan-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
    },
    {
      id: 'clientResponse',
      title: 'Client Response Received',
      count: centerData.categories.clientResponse,
      icon: MessageSquare,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
    },
    {
      id: 'quotePending',
      title: 'Quote Pending Approval',
      count: centerData.categories.quotePending,
      icon: FileText,
      color: 'from-indigo-500/20 to-violet-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      badgeBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
    },
    {
      id: 'paymentPending',
      title: 'Payment Pending',
      count: centerData.categories.paymentPending,
      icon: CreditCard,
      color: 'from-purple-500/20 to-pink-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
    }
  ];

  const actionableList = getActionableItems();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
              <Bell className="w-6 h-6" />
            </div>
            Notification Center
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1 text-sm">
            Centralized notification panel for pending tasks, urgent renewals, and client responses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {filteredNotifications.some(n => n.read === 0) && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 bg-white/50 dark:bg-white/5 border border-surface-200 dark:border-surface-700 rounded-xl hover:border-brand-500 transition-all shadow-sm"
            >
              <CheckSquare className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Suggested Notification Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryCards.map((card) => {
          const Icon = card.icon;
          const isSelected = activeCategory === card.id;
          return (
            <div
              key={card.id}
              onClick={() => {
                setActiveTab('tasks');
                setActiveCategory(isSelected ? 'all' : card.id);
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                isSelected 
                  ? 'ring-2 ring-brand-500 border-transparent bg-gradient-to-br ' + card.color + ' shadow-lg scale-[1.01]' 
                  : 'bg-white/60 dark:bg-surface-800/60 border-surface-200/80 dark:border-surface-700/80 hover:border-brand-500/50 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${card.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-surface-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5">
                      {card.count === 1 ? '1 pending task' : `${card.count} pending tasks`}
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${card.badgeBg}`}>
                  {card.count}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-2">
        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1 bg-surface-100/80 dark:bg-surface-800/80 rounded-xl border border-surface-200/60 dark:border-surface-700/60 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'tasks'
                ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            Actionable Tasks ({actionableList.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-brand-500" />
            System Updates ({filteredNotifications.length})
          </button>
        </div>

        {/* Search Input & Category Reset */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {activeCategory !== 'all' && (
            <button
              onClick={() => setActiveCategory('all')}
              className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 whitespace-nowrap"
            >
              <Filter className="w-3 h-3" /> Show All Categories
            </button>
          )}

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-surface-400" />
            <input
              type="text"
              placeholder={activeTab === 'tasks' ? "Search client or service..." : "Search updates..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : activeTab === 'tasks' ? (
        /* Actionable Tasks List */
        <div className="card overflow-hidden">
          <div className="divide-y divide-surface-100 dark:divide-surface-800">
            {actionableList.length === 0 ? (
              <div className="p-12 text-center text-surface-500 dark:text-surface-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-sm">All caught up!</p>
                <p className="text-xs text-surface-400 mt-1">No pending actionable tasks found for this category.</p>
              </div>
            ) : (
              actionableList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleTaskAction(item.client_name)}
                  className="p-4 hover:bg-surface-50/60 dark:hover:bg-surface-900/30 transition-all flex items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="p-2 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 font-mono text-[11px] font-semibold flex-shrink-0">
                      {item.unique_id || 'ID'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-surface-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                          {item.client_name}
                        </h4>
                        <span className="text-[10px] bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 px-2 py-0.5 rounded-full font-medium border border-brand-200 dark:border-brand-800">
                          {item.service}
                        </span>
                        {item.renewal_confirmation && item.renewal_confirmation !== 'pending' && (
                          <span className="text-[10px] bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 px-2 py-0.5 rounded-full font-medium capitalize">
                            {item.renewal_confirmation.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-surface-500 dark:text-surface-400 mt-1.5 flex-wrap">
                        <span>Due: <strong className="text-surface-700 dark:text-surface-200">{formatDate(item.renewal_date)}</strong></span>
                        <span>Value: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(item.value)}</strong></span>
                        <span>Status: <strong className="text-surface-700 dark:text-surface-200">{item.status}</strong></span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTaskAction(item.client_name);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 bg-brand-50/50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 rounded-lg group-hover:bg-brand-600 group-hover:text-white transition-all whitespace-nowrap"
                  >
                    <span>Take Action</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* System Notifications Logs */
        <div className="card overflow-hidden">
          <div className="divide-y divide-surface-100 dark:divide-surface-800">
            {filteredNotifications.length === 0 ? (
              <div className="p-12 text-center text-surface-500 dark:text-surface-400">
                No updates found.
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 hover:bg-surface-50/50 dark:hover:bg-surface-900/20 transition-all flex items-start gap-4 cursor-pointer relative group ${
                    notif.read === 0 ? 'bg-brand-50/10 dark:bg-brand-950/5' : ''
                  }`}
                >
                  <div className="mt-1 flex-shrink-0">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-xs font-semibold text-surface-900 dark:text-white ${notif.read === 0 ? 'text-brand-600 dark:text-brand-400' : ''}`}>
                        {notif.title}
                      </h4>
                      {notif.read === 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-600 dark:bg-brand-400"></span>
                      )}
                      <span className="text-[10px] bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 px-1.5 py-0.5 rounded font-medium capitalize">
                        {notif.type || 'system'}
                      </span>
                    </div>
                    <p className="text-xs text-surface-600 dark:text-surface-300 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-surface-400 dark:text-surface-500 mt-2">
                      {formatDateTime(notif.created_at)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {notif.read === 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notif.id);
                        }}
                        className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors whitespace-nowrap opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        Mark read
                      </button>
                    )}
                    <ArrowRight className="w-4 h-4 text-surface-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
