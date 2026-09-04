import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles, AlertCircle, ShieldCheck, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// There is no multi-turn conversation memory here — every message goes to
// the backend as an independent request with no history, so "the 1st
// client" was being searched for literally as a client name. Sending the
// full chat history to Gemini on every call would fix this properly, but
// costs real requests against a 20/day cap for something resolvable for
// free: every numbered list the agent renders already prints "(RMT-###)"
// next to each row, in order, so an ordinal reference can be resolved
// against the text already on screen — no model call needed, and it works
// even while the daily limit is exhausted.
const ORDINAL_WORDS = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
  sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
};

function extractOrdinalPosition(text) {
  const lower = text.toLowerCase();
  const numMatch = lower.match(/#\s?(\d+)\b|\b(\d+)(?:st|nd|rd|th)\b/);
  if (numMatch) return parseInt(numMatch[1] || numMatch[2], 10);
  for (const [word, num] of Object.entries(ORDINAL_WORDS)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(lower)) return num;
  }
  return null;
}

// Resolves "the 1st client" / "#2" / "the third one" against the most
// recent agent message that actually rendered a numbered (RMT-###) list —
// not necessarily the immediately previous message, since that could be an
// unrelated error or a non-list answer further from the list itself.
function resolveOrdinalReference(userMessage, priorMessages) {
  if (/RMT-\d+/i.test(userMessage)) return userMessage; // already explicit, nothing to resolve

  const position = extractOrdinalPosition(userMessage);
  if (!position) return userMessage;

  for (let i = priorMessages.length - 1; i >= 0; i--) {
    const m = priorMessages[i];
    if (m.sender !== 'agent') continue;
    const ids = [...m.text.matchAll(/\(RMT-\d+\)/gi)].map(x => x[0].replace(/[()]/g, ''));
    if (ids.length === 0) continue;
    if (position > ids.length) return userMessage; // found a list, but not that many items — don't guess
    return `${userMessage} (referring to ${ids[position - 1]})`;
  }
  return userMessage; // no prior list to resolve against
}

// resetsAt is a server estimate (UTC midnight), not a guarantee from Google —
// rendered as a rounded "in about Xh" rather than a false-precise countdown.
function formatResetTime(resetsAtIso) {
  if (!resetsAtIso) return 'soon';
  const msLeft = new Date(resetsAtIso).getTime() - Date.now();
  if (msLeft <= 0) return 'shortly';
  const hours = Math.floor(msLeft / (1000 * 60 * 60));
  const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
  if (hours === 0) return `in ${minutes}m`;
  return `in ${hours}h ${minutes}m`;
}

export default function AgentDrawer() {
  const { getValidToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'agent',
      text: 'Hello! I am your AI Renewal Agent. How can I help you manage renewals, check contract risks, or make data updates today?'
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingMutation, setPendingMutation] = useState(null);
  const [usage, setUsage] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // The Gemini free-tier key has a hard 20 requests/day cap. Without this,
  // that showed up as intermittent, seemingly-random "temporarily
  // unavailable" answers with no way to tell why. Fetching and displaying
  // it makes the limit visible instead of mysterious, and refreshing after
  // every action keeps the count honest as it's used up.
  const fetchUsage = async () => {
    try {
      const authToken = await getValidToken();
      const res = await fetch('/api/agent/usage', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) setUsage(await res.json());
    } catch (err) {
      // Non-critical — the usage bar just stays at its last known value.
    }
  };

  useEffect(() => {
    if (isOpen) fetchUsage();
  }, [isOpen]);

  // parseNaturalLanguageMutation can only ever resolve a target by an exact
  // RMT-### id — anything else always returns "could not resolve target"
  // regardless of what the message actually asks for. Trying that endpoint
  // first for every message (the previous behavior) meant a plain question
  // like "total records in the rmt" showed that error and never reached the
  // real query path at all. Only attempt edit-parsing when the message
  // actually references a record.
  const RMT_ID_PATTERN = /\bRMT-\d+\b/i;

  // agent_jobs run in the background and only ever broadcast their result
  // over SSE — nothing in this component listened for that, so a query
  // enqueued fine and then no answer ever appeared. Poll the job instead
  // until it completes, fails, or times out.
  const pollJobResult = async (jobId, authToken) => {
    const start = Date.now();
    const timeoutMs = 25000;
    while (Date.now() - start < timeoutMs) {
      await new Promise(r => setTimeout(r, 1200));
      const res = await fetch(`/api/agent/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) continue;
      const job = await res.json();
      if (job.status === 'completed') {
        return { ok: true, text: job.result?.finalResult || 'Done, but the job returned no summary text.' };
      }
      if (job.status === 'failed') {
        return { ok: false, text: `⚠️ Agent job failed: ${job.error || 'unknown error'}` };
      }
      // still pending/running — keep polling
    }
    return { ok: false, text: '⚠️ The agent is taking longer than expected. Check the Approval Inbox or try again shortly.' };
  };

  const handleSendMessage = async () => {
    if (!prompt.trim() || isProcessing) return;

    const userMessage = prompt.trim();
    // Resolve against messages as it stands *before* this turn is appended —
    // display keeps the user's original wording; only the text actually
    // sent to the backend gets the resolved RMT ID appended.
    const resolvedMessage = resolveOrdinalReference(userMessage, messages);
    setPrompt('');
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setIsProcessing(true);

    try {
      // The access token lives only in AuthContext's React state (refreshed
      // via an HttpOnly cookie) — it is never written to localStorage, so a
      // plain localStorage.getItem('token') read here always returns null
      // and every call below would silently 403 as "Bearer null".
      const authToken = await getValidToken();

      // Only attempt edit parsing if user explicitly requests a field update/change
      const EDIT_KEYWORDS_PATTERN = /(?:update|change|set|edit|modify|make|mark|replace)\b/i;
      const RMT_ID_PATTERN = /(?:RMT|rmt)[-\s]?\d+/i;

      if (EDIT_KEYWORDS_PATTERN.test(resolvedMessage) && RMT_ID_PATTERN.test(resolvedMessage)) {
        const parseRes = await fetch('/api/agent/nl-edit/parse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ utterance: resolvedMessage })
        });

        if (parseRes.ok) {
          const mutation = await parseRes.json();
          if (mutation.changes && mutation.changes.length > 0) {
            setPendingMutation(mutation);
            setMessages(prev => [
              ...prev,
              {
                sender: 'agent',
                text: `I parsed a request to edit ${mutation.target?.clientName} (${mutation.target?.uniqueId}). Please confirm the diff below to execute the change:`,
                isMutationPreview: true
              }
            ]);
            setIsProcessing(false);
            return;
          }
        }
      }

      // General question, analysis, or record lookup — route through background job runner
      const queryRes = await fetch('/api/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ prompt: resolvedMessage })
      });

      if (queryRes.ok) {
        const { jobId } = await queryRes.json();
        const outcome = await pollJobResult(jobId, authToken);
        setMessages(prev => [...prev, { sender: 'agent', text: outcome.text }]);
      } else {
        setMessages(prev => [...prev, { sender: 'agent', text: 'Error enqueuing agent job. Please try again.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'agent', text: 'Connection error while communicating with AI agent.' }]);
    } finally {
      setIsProcessing(false);
      fetchUsage();
    }
  };

  // These two dedicated endpoints existed on the backend but nothing in the
  // UI ever called them — the quick-action chips just pre-filled the chat
  // input with matching text, which then went through the generic
  // classifier and got misrouted to an unrelated tool (e.g. "Run catch-up
  // daily sweep" resolved to get_expiring_renewals, not an actual sweep).
  // Calling the real endpoints directly instead of routing through chat.
  const handleDailySweep = async () => {
    if (isProcessing) return;
    setMessages(prev => [...prev, { sender: 'user', text: 'Run catch-up daily sweep' }]);
    setIsProcessing(true);
    try {
      const authToken = await getValidToken();
      const res = await fetch('/api/agent/daily-sweep', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const { summary } = await res.json();
        setMessages(prev => [...prev, {
          sender: 'agent',
          text: `⚡ Daily sweep complete. Scanned ${summary.totalScanned} renewals — ${summary.criticalCount} critical, ${summary.highCount} high risk, ${summary.queuedForApproval} drafts queued for approval, ${summary.skippedCount} already up to date. Check the Approval Inbox to review.`
        }]);
      } else {
        setMessages(prev => [...prev, { sender: 'agent', text: '⚠️ Daily sweep failed to run. Please try again.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'agent', text: 'Connection error while running the daily sweep.' }]);
    } finally {
      setIsProcessing(false);
      fetchUsage();
    }
  };

  const handleGuardianHealth = async () => {
    if (isProcessing) return;
    setMessages(prev => [...prev, { sender: 'user', text: 'Check Guardian health anomalies' }]);
    setIsProcessing(true);
    try {
      const authToken = await getValidToken();
      const res = await fetch('/api/agent/guardian-health', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const { findings } = await res.json();
        const text = findings.length === 0
          ? '🛡️ Guardian scan complete — no data integrity or security anomalies found.'
          : `🛡️ Guardian scan found ${findings.length} anomal${findings.length === 1 ? 'y' : 'ies'}: ${findings.slice(0, 3).map(f => `${f.category} (${f.clientName || f.uniqueId})`).join(', ')}${findings.length > 3 ? `, +${findings.length - 3} more` : ''}. See the Guardian Health page for details.`;
        setMessages(prev => [...prev, { sender: 'agent', text }]);
      } else {
        setMessages(prev => [...prev, { sender: 'agent', text: '⚠️ Guardian scan failed to run. Please try again.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'agent', text: 'Connection error while running the Guardian scan.' }]);
    } finally {
      setIsProcessing(false);
      fetchUsage();
    }
  };

  const handleConfirmMutation = async () => {
    if (!pendingMutation) return;
    setIsProcessing(true);
    try {
      const authToken = await getValidToken();
      const res = await fetch('/api/agent/nl-edit/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ mutation: pendingMutation })
      });

      if (res.ok) {
        toast.success('Mutation applied successfully');
        setMessages(prev => [
          ...prev,
          {
            sender: 'agent',
            text: `✅ Successfully updated record for ${pendingMutation.target?.clientName}. Audit log recorded.`
          }
        ]);
        setPendingMutation(null);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to apply mutation');
      }
    } catch (e) {
      toast.error('Error applying edit mutation');
    } finally {
      setIsProcessing(false);
      fetchUsage();
    }
  };

  return (
    <>
      {/* Floating Action Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold px-4 py-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer border border-white/20"
      >
        <Bot className="w-6 h-6 animate-pulse" />
        <span className="text-xs tracking-wider uppercase font-extrabold hidden sm:inline">AI Agent</span>
      </button>

      {/* Slide-out Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-[9990] w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-l border-amber-500/20 shadow-2xl flex flex-col transition-all duration-300">
          {/* Drawer Header */}
          <div className="p-4 bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-600 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">RenewalPro AI Agent</h3>
                <span className="text-[10px] text-amber-200 uppercase font-bold tracking-wider">v1.1.0 • Autonomous Watch</span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* AI Usage Indicator — the Gemini key is free-tier with a hard
              20 requests/day cap. Without this visible, hitting it looked
              like random, unexplained failures. */}
          {usage && (
            <div className={`px-4 py-2 border-b text-[11px] ${
              usage.limitReached
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
                : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
            }`}>
              {usage.limitReached ? (
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    Daily AI limit reached ({usage.requestsToday}/{usage.dailyRequestLimit}) — resumes ~{formatResetTime(usage.resetsAt)}.
                    Basic lookups still work; AI-drafted answers will resume automatically.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                    AI usage: {usage.requestsToday}/{usage.dailyRequestLimit}
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        usage.requestsToday / usage.dailyRequestLimit >= 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (usage.requestsToday / usage.dailyRequestLimit) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions Bar */}
          <div className="p-2 bg-slate-100 dark:bg-slate-950 flex items-center gap-2 overflow-x-auto text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={handleDailySweep}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              ⚡ Daily Sweep
            </button>
            <button
              onClick={handleGuardianHealth}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              🛡️ Guardian Health
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-none shadow-md font-medium'
                      : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/50 dark:border-slate-700/50'
                  }`}
                >
                  {m.text}

                  {m.isMutationPreview && pendingMutation && (
                    <div className="mt-3 p-3 bg-white dark:bg-slate-950 rounded-xl border border-amber-500/30 text-[11px] space-y-2 text-slate-800 dark:text-slate-200">
                      <div className="font-bold text-amber-600 dark:text-amber-400">
                        Proposed Field Diff:
                      </div>
                      {pendingMutation.changes.map((c, i) => (
                        <div key={i} className="font-mono bg-slate-50 dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                          <span className="font-bold text-indigo-600">{c.field}:</span> {c.from || '(empty)'} ➔ <strong className="text-emerald-600">{c.to}</strong>
                        </div>
                      ))}

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={handleConfirmMutation}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                        >
                          Confirm & Apply
                        </button>
                        <button
                          onClick={() => setPendingMutation(null)}
                          className="px-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold py-1.5 rounded-lg text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask agent or type natural edit instruction..."
                className="flex-1 bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-white placeholder-slate-400 px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={isProcessing || !prompt.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-xl disabled:opacity-50 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
