import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RenewalsList from './pages/RenewalsList';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import EditsHistory from './pages/EditsHistory';
import Trash from './pages/Trash';
import Notifications from './pages/Notifications';
import ActivityLogs from './pages/ActivityLogs';
import Visits from './pages/Visits';
import UserManagement from './pages/UserManagement';
import EmailAutomation from './pages/EmailAutomation';
import ClientDetails from './pages/ClientDetails';

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
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/renewals" element={<ProtectedRoute><RenewalsList /></ProtectedRoute>} />
        <Route path="/renewals/:id" element={<ProtectedRoute><ClientDetails /></ProtectedRoute>} />
        <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/edits-history" element={<ProtectedRoute><EditsHistory /></ProtectedRoute>} />
        <Route path="/trash" element={<AdminRoute><Trash /></AdminRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/activity-logs" element={<ProtectedRoute><ActivityLogs /></ProtectedRoute>} />
        <Route path="/visits" element={<ProtectedRoute><Visits /></ProtectedRoute>} />
        <Route path="/automation" element={<ProtectedRoute><EmailAutomation /></ProtectedRoute>} />
        
        <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
