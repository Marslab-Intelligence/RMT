import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { APP_VERSION } from '../version';

export default function VersionNotifier() {
  const [newVersionInfo, setNewVersionInfo] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch(`/api/version?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.version && data.version !== APP_VERSION) {
          setNewVersionInfo(data);
        }
      }
    } catch (err) {
      // Silently catch fetch errors
    }
  }, []);

  useEffect(() => {
    checkVersion();
    const interval = setInterval(checkVersion, 30000); // Poll every 30 seconds

    const handleFocus = () => checkVersion();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkVersion]);

  const handleUpdate = async () => {
    setIsReloading(true);
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
      sessionStorage.clear();
      localStorage.removeItem('chunk_last_reload');
    } catch (e) {
      console.error('Cache clear error:', e);
    } finally {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('v', (newVersionInfo?.version || Date.now()).toString());
      window.location.href = currentUrl.toString();
    }
  };

  if (!newVersionInfo || isDismissed) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] pointer-events-auto">
      <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-600 text-white px-4 py-3 shadow-2xl border-b border-white/20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl flex-shrink-0 animate-pulse">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base tracking-wide">
                  🎉 New Version Update Available (v{newVersionInfo.version})
                </span>
                <span className="text-[10px] uppercase font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-white/90 font-medium">
                A new release with feature updates & fixes is available. Update now to clear old cached code and load the latest features!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            <button
              onClick={handleUpdate}
              disabled={isReloading}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-amber-100 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-indigo-600 ${isReloading ? 'animate-spin' : ''}`} />
              {isReloading ? 'Updating & Refreshing...' : 'Update & Refresh Now'}
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Dismiss for this session"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
