import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Check, CheckSquare, Search, Trash2, ArrowRight, ShieldAlert, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDateTime } from '../utils/formatters';

export default function Notifications() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotifications = async () => {
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
        toast.error('Failed to load notifications');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

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
      await handleMarkAsRead(notif.id);
    }
    const path = extractClientFromNotification(notif);
    if (path) {
      navigate(path);
    }
  };

  // Filter out 'email sent' notifications as requested by user in rule #8
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
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'error':
        return <ShieldAlert className="w-5 h-5 text-rose-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            Updates
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            System notifications and updates logs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {filteredNotifications.some(n => n.read === 0) && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 bg-white/40 dark:bg-white/5 border border-surface-200 dark:border-surface-700 rounded-lg hover:border-brand-500 transition-all"
            >
              <CheckSquare className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-surface-400" />
          <input
            type="text"
            placeholder="Search updates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 w-full md:w-auto">
          {['all', 'unread', 'read'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filter === f
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white/40 dark:bg-white/5 text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-700 hover:border-brand-500'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : (
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
                      <h4 className={`text-sm font-semibold text-surface-900 dark:text-white ${notif.read === 0 ? 'text-brand-600 dark:text-brand-400' : ''}`}>
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
