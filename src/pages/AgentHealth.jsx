import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, RefreshCw, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function AgentHealth() {
  const { getValidToken } = useAuth();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      // See AgentDrawer.jsx — the access token lives in AuthContext's React
      // state, never in localStorage, so localStorage.getItem('token') here
      // always returned null and every scan silently 403'd.
      const authToken = await getValidToken();
      const res = await fetch('/api/agent/guardian-health', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      } else {
        // Without this, a 403/500 left healthData null and the UI rendered
        // "All Systems Clean" — a failed scan looked identical to a clean one.
        toast.error('Guardian scan failed — showing no data, not a clean result.');
      }
    } catch (err) {
      toast.error('Failed to perform Guardian integrity scan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 rounded-2xl border border-rose-500/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl text-white shadow-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Guardian Anomaly Watch & Health</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              System data integrity scanner & security anomaly monitoring
            </p>
          </div>
        </div>

        <button
          onClick={fetchHealth}
          className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold px-4 py-2 rounded-xl transition-all border border-rose-500/20 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Run Diagnostic Scan
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Scanning database integrity...</div>
      ) : !healthData || healthData.findings.length === 0 ? (
        <div className="p-12 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-emerald-500/30 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">All Systems Clean</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Zero data integrity anomalies or security violations detected.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {healthData.findings.map((f, idx) => (
            <div key={idx} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 rounded-2xl border border-rose-500/20 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${f.severity === 'HIGH' ? 'bg-red-500/10 text-red-600 border border-red-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                    {f.severity} Severity
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    {f.category} — {f.clientName} ({f.uniqueId})
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {f.description}
              </p>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/50 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>💡 <strong className="text-slate-700 dark:text-slate-300">Suggested Action:</strong> {f.suggestedFix}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
