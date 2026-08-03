import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Lazy-loaded pages for optimized bundle splitting
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const RenewalsList = lazy(() => import('./pages/RenewalsList'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const EditsHistory = lazy(() => import('./pages/EditsHistory'));
const Trash = lazy(() => import('./pages/Trash'));
const Notifications = lazy(() => import('./pages/Notifications'));
const ActivityLogs = lazy(() => import('./pages/ActivityLogs'));
const Visits = lazy(() => import('./pages/Visits'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const EmailAutomation = lazy(() => import('./pages/EmailAutomation'));
const ClientDetails = lazy(() => import('./pages/ClientDetails'));
const Pricing = lazy(() => import('./pages/Pricing'));

const PageLoader = () => (
  <div className="min-h-[60vh] w-full flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
      <span className="text-xs font-medium text-surface-400">Loading...</span>
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-surface-50 dark:bg-surface-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-surface-50 dark:bg-surface-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>;
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/renewals" element={<ProtectedRoute><RenewalsList /></ProtectedRoute>} />
          <Route path="/renewals/:id" element={<ProtectedRoute><ClientDetails /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/edits-history" element={<ProtectedRoute><EditsHistory /></ProtectedRoute>} />
          <Route path="/trash" element={<AdminRoute><Trash /></AdminRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/activity-logs" element={<AdminRoute><ActivityLogs /></AdminRoute>} />
          <Route path="/visits" element={<ProtectedRoute><Visits /></ProtectedRoute>} />
          <Route path="/automation" element={<ProtectedRoute><EmailAutomation /></ProtectedRoute>} />
          <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
          
          <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
