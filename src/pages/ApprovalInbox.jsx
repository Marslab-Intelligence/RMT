import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Mail, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ApprovalInbox() {
  const { getValidToken } = useAuth();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const fetchEpisodes = async () => {
    setLoading(true);
    try {
      // See AgentDrawer.jsx — the access token lives in AuthContext's React
      // state, never in localStorage, so localStorage.getItem('token') here
      // always returned null and every fetch silently 403'd.
      const authToken = await getValidToken();
      const res = await fetch(`/api/agent/episodes?status=${filter}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEpisodes(data);
      } else {
        // Without this, a 403/500 left episodes as [] and the UI rendered
        // "Inbox Clean" — a failed fetch looked identical to a genuinely
        // empty inbox.
        toast.error('Failed to load approval inbox — showing no data, not a clean inbox.');
      }
    } catch (err) {
      toast.error('Failed to load approval inbox');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisodes();
  }, [filter]);

  const handleVerdict = async (id, verdict) => {
    try {
      const authToken = await getValidToken();
      const res = await fetch(`/api/agent/episodes/${id}/verdict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ verdict })
      });
      if (res.ok) {
        toast.success(`Item marked as ${verdict}`);
        fetchEpisodes();
      } else {
        toast.error('Failed to update item verdict');
      }
    } catch (err) {
      toast.error('Error submitting verdict');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 rounded-2xl border border-amber-500/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-rose-500 rounded-xl text-white shadow-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">AI Agent Approval Inbox</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Review and approve agent-authored client drafts and proposed workflow actions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === 'pending' ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
          >
            Pending Approval ({episodes.length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === 'approved' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
          >
            Approved
          </button>
          <button
            onClick={fetchEpisodes}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading inbox items...</div>
      ) : episodes.length === 0 ? (
        <div className="p-12 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Inbox Clean</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No items currently requiring human approval.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {episodes.map((item) => {
            const proposed = item.proposed_action || {};
            const context = item.context_snapshot || {};
            return (
              <div key={item.id} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 rounded-2xl border border-amber-500/20 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {item.action}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {item.client_name || 'Client'} ({item.unique_id || 'N/A'})
                    </span>
                    {context.risk?.tier && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${context.risk.tier === 'CRITICAL' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'}`}>
                        Risk: {context.risk.tier} ({context.risk.score}/100)
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-mono">
                    <div className="flex items-center gap-1.5 font-sans font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                      <Mail className="w-3.5 h-3.5" /> Proposed Draft Content:
                    </div>
                    {proposed.message || 'No draft text'}
                  </div>

                  {proposed.gateResult && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <span className="font-semibold">Safety Gate Status:</span>
                      {proposed.gateResult.passed ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Passed
                        </span>
                      ) : (
                        <span className="text-red-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Vetoed ({proposed.gateResult.vetoes?.[0]?.reason})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {filter === 'pending' && (
                  <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto">
                    <button
                      onClick={() => handleVerdict(item.id, 'approved')}
                      className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve & Send
                    </button>
                    <button
                      onClick={() => handleVerdict(item.id, 'rejected')}
                      className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
