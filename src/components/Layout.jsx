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
  Home
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

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="flex h-screen bg-surface-50 dark:bg-surface-900 transition-colors duration-200">
      {/* Sidebar backdrop (visible when sidebar is open) */}
      {(sidebarOpen || isMobileMenuOpen) && (
        <div 
          className="fixed inset-0 z-20 bg-surface-900/20 backdrop-blur-[2px] transition-opacity duration-300"
          onClick={() => { setSidebarOpen(false); setIsMobileMenuOpen(false); }}
        />
      )}

      {/* Auto-hide Sidebar — slides in from left on hover */}
      <div
        ref={sidebarRef}
        onMouseLeave={handleSidebarMouseLeave}
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#f5f4f0] dark:bg-surface-800 border-r border-surface-200 dark:border-surface-700 transform transition-transform duration-300 ease-in-out shadow-2xl ${(sidebarOpen || isMobileMenuOpen) ? 'translate-x-0' : '-translate-x-full'}`}
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
                      ? 'bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400' 
                      : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700/50 hover:text-surface-900 dark:hover:text-surface-200'
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
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-surface-300 dark:border-surface-700 pt-3"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-[#f5f0e8] dark:bg-surface-800 flex items-center justify-between px-6 z-10">
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
              className="p-2.5 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors bg-[#f5f0e8] dark:bg-surface-800 shadow-sm border border-surface-200 dark:border-surface-700"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors bg-[#f5f0e8] dark:bg-surface-800 shadow-sm border border-surface-200 dark:border-surface-700"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-surface-800 rounded-full"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-surface-800 rounded-xl shadow-lg shadow-surface-200/50 dark:shadow-black/50 border border-surface-200 dark:border-surface-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center bg-surface-50 dark:bg-surface-800/50">
                    <h3 className="font-semibold text-surface-900 dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 px-2 py-0.5 rounded-full">
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
                        <div key={notif.id} className={`p-4 border-b border-surface-100 dark:border-surface-700 last:border-0 hover:bg-surface-50 dark:hover:bg-surface-700/30 transition-colors ${notif.read ? 'opacity-60' : ''}`}>
                          <p className="text-sm font-medium text-surface-900 dark:text-white">{notif.title}</p>
                          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 line-clamp-2">{notif.message}</p>
                          <p className="text-[10px] text-surface-400 dark:text-surface-500 mt-2">
                            {formatDateTime(notif.created_at)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 bg-surface-50 dark:bg-surface-800/50 border-t border-surface-200 dark:border-surface-700">
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
              className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors bg-[#f5f0e8] dark:bg-surface-800 shadow-sm border border-surface-200 dark:border-surface-700 text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar relative bg-[#f5f0e8] dark:bg-surface-900">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
