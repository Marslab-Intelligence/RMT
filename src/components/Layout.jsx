import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/formatters';
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut, 
  Bell, 
  Menu,
  X,
  Search,
  ShieldCheck,
  Moon,
  Sun,
  Home,
  History
} from 'lucide-react';

const getRoleLabel = (role) => {
  if (role === 'admin') return 'Admin';
  if (role === 'finance') return 'Finance';
  if (role === 'sales') return 'CST';
  return '';
};

const getRoleBadgeStyle = (role) => {
  if (role === 'admin') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50';
  if (role === 'finance') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50';
  if (role === 'sales') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/50';
  return '';
};

export default function Layout({ children }) {
  const { user, logout, token } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);
  const triggerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Sidebar auto-show on mouse near left edge
  useEffect(() => {
    const handleMouseMove = (e) => {
      // Show sidebar when mouse is within 16px of left edge
      if (e.clientX <= 16) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Hide sidebar when mouse leaves the sidebar area
  const handleSidebarMouseLeave = useCallback((e) => {
    // Only close if mouse truly left the sidebar (not entering a child)
    if (sidebarRef.current && !sidebarRef.current.contains(e.relatedTarget)) {
      setSidebarOpen(false);
    }
  }, []);

  // Dark mode toggle
  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDarkMode(true);
    }
  };

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/dashboard/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications);
          setUnreadCount(data.unread);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Renewals', path: '/renewals', icon: FileText },
    { name: 'Reports & Logs', path: '/reports', icon: BarChart3 },
  ];

  if (user?.role === 'finance' || user?.role === 'admin') {
    navItems.push({ name: 'Record Details', path: '/edits-history', icon: History });
  }

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="flex h-screen transition-colors duration-200 relative overflow-hidden bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 dark:from-stone-900 dark:via-slate-900 dark:to-rose-950">

      {/* Decorative blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{zIndex: 0}}>
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-amber-300/35 dark:bg-amber-700/20 blur-3xl" />
        <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full bg-orange-300/30 dark:bg-orange-800/15 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-rose-300/30 dark:bg-rose-800/15 blur-3xl" />
        <div className="absolute top-1/4 left-1/2 w-64 h-64 rounded-full bg-amber-200/20 dark:bg-amber-900/10 blur-3xl" />
      </div>

      {/* Sidebar backdrop (visible when sidebar is open) */}
      {(sidebarOpen || isMobileMenuOpen) && (
        <div
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300"
          onClick={() => { setSidebarOpen(false); setIsMobileMenuOpen(false); }}
        />
      )}

      {/* Auto-hide Sidebar — slides in from left on hover */}
      <div
        ref={sidebarRef}
        onMouseLeave={handleSidebarMouseLeave}
        className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out shadow-2xl ${(sidebarOpen || isMobileMenuOpen) ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          background: 'rgba(255, 248, 240, 0.55)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.5)',
        }}
      >
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center">
            <img src="/logo.png" alt="MarsLab Logo" className="h-8 w-auto object-contain" />
          </div>
          <button onClick={() => { setSidebarOpen(false); setIsMobileMenuOpen(false); }} className="text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white/50 dark:bg-brand-900/25 text-brand-700 dark:text-brand-400 shadow-sm'
                      : 'text-surface-600 dark:text-surface-400 hover:bg-white/40 dark:hover:bg-white/10 hover:text-surface-900 dark:hover:text-surface-200'
                  }`}
                  onClick={() => { setSidebarOpen(false); setIsMobileMenuOpen(false); }}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-surface-400 dark:text-surface-500'}`} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-4">
          <div className="text-center mb-3 px-2">
            <p className="text-sm font-semibold text-surface-700 dark:text-surface-300">{user?.fullName}</p>
            <p className="text-xs text-surface-500 dark:text-surface-400 capitalize mt-0.5">
              {user?.role === 'sales' ? 'CST' : user?.role} Team
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors pt-3"
            style={{borderTop: '1px solid rgba(255,255,255,0.4)'}}
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{position: 'relative', zIndex: 1}}>
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 z-20"
          style={{
            background: 'rgba(255, 248, 240, 0.40)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.45)',
          }}
        >
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
            >
              <Menu className="w-6 h-6" />
            </button>
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3 py-2 text-surface-600 hover:text-brand-600 dark:text-surface-400 dark:hover:text-brand-400 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors text-sm font-medium"
              title="Go to Dashboard"
            >
              <Home className="w-5 h-5" />
              <span className="hidden sm:inline">Home</span>
            </button>
            {/* Role page label — only on dashboard */}
            {location.pathname === '/' && user?.role && (
              <span className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${getRoleBadgeStyle(user.role)}`}>
                {getRoleLabel(user.role)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 text-surface-600 hover:text-surface-800 dark:text-surface-300 dark:hover:text-white rounded-xl transition-colors shadow-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.35)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.55)',
              }}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 text-surface-600 hover:text-surface-800 dark:text-surface-300 dark:hover:text-white rounded-xl transition-colors shadow-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.35)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.55)',
                }}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-surface-800 rounded-full"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xl"
                  style={{
                    background: 'rgba(255, 248, 240, 0.65)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255, 255, 255, 0.55)',
                  }}
                >
                  <div className="px-4 py-3 flex justify-between items-center"
                    style={{borderBottom: '1px solid rgba(255, 255, 255, 0.4)'}}>
                    <h3 className="font-semibold text-surface-900 dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-xs font-medium bg-brand-100/80 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-surface-500 dark:text-surface-400">
                        No notifications right now.
                      </div>
                    ) : (
                      notifications.slice(0, 5).map(notif => (
                        <div key={notif.id} className={`p-4 last:border-0 hover:bg-white/30 dark:hover:bg-white/5 transition-colors ${notif.read ? 'opacity-60' : ''}`}
                          style={{borderBottom: '1px solid rgba(255,255,255,0.3)'}}>
                          <p className="text-sm font-medium text-surface-900 dark:text-white">{notif.title}</p>
                          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 line-clamp-2">{notif.message}</p>
                          <p className="text-[10px] text-surface-400 dark:text-surface-500 mt-2">
                            {formatDateTime(notif.created_at)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2" style={{borderTop: '1px solid rgba(255,255,255,0.4)'}}>
                    <button className="w-full text-center text-xs font-medium text-brand-600 dark:text-brand-400 py-1.5 hover:underline">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 rounded-xl transition-colors shadow-sm text-sm font-medium"
              style={{
                background: 'rgba(255, 235, 235, 0.40)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 200, 200, 0.45)',
              }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar relative">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
