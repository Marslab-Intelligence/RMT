import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { Toaster } from 'react-hot-toast';

// Clear stale chunk reload markers on clean app mount
try {
  sessionStorage.removeItem('chunk_reload');
  sessionStorage.removeItem('chunk_reload_count');
} catch (e) {
  // Ignore storage errors
}

// Handle Vite dynamic import preload errors when new deployments land
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error detected. Auto-refreshing application bundle...');
  event.preventDefault();
  window.location.reload();
});

// Auto-recover from stale deployment script/chunk load errors
window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Expected a JavaScript-or-Wasm module script') ||
    msg.includes('Loading chunk') ||
    msg.includes('Script error')
  ) {
    const lastReload = sessionStorage.getItem('chunk_last_reload');
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem('chunk_last_reload', now.toString());
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
    const lastReload = sessionStorage.getItem('chunk_last_reload');
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem('chunk_last_reload', now.toString());
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
