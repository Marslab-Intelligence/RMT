import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { Toaster } from 'react-hot-toast';

// Auto-recover from stale deployment script/chunk load errors
window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Expected a JavaScript-or-Wasm module script') ||
    msg.includes('Loading chunk') ||
    msg.includes('Script error')
  ) {
    if (!sessionStorage.getItem('chunk_reload')) {
      sessionStorage.setItem('chunk_reload', 'true');
      window.location.reload();
    }
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = String(event?.reason || '');
  if (
    reason.includes('Failed to fetch dynamically imported module') ||
    reason.includes('Expected a JavaScript-or-Wasm module script') ||
    reason.includes('Loading chunk')
  ) {
    if (!sessionStorage.getItem('chunk_reload')) {
      sessionStorage.setItem('chunk_reload', 'true');
      window.location.reload();
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#1e293b', color: '#fff', borderRadius: '8px' } }} />
    </AuthProvider>
  </React.StrictMode>,
);
