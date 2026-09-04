import crypto from 'crypto';
import { executeAgentQuery } from './queryBuilder.js';
import { validateDraftSafety } from './safetyGate.js';
import { computeRiskScore } from './riskScorer.js';
import { parseNaturalLanguageMutation } from './naturalLanguageEditor.js';
import { classifyIntent, explainRiskScore, generateQuerySpec } from './geminiClient.js';
import { runQuerySpec } from './queryEngine.js';

const MAX_STEPS = 12;

export const APPROVAL_TIERS = {
  get_expiring_renewals: 'auto',
  get_renewal_by_id: 'auto',
  get_portfolio_summary: 'auto',
  get_client_stats: 'auto',
  get_top_clients_by_value: 'auto',
  get_top_clients_by_profit: 'auto',
  get_overdue_renewals: 'auto',
  get_pending_invoices: 'auto',
  search_client_renewals: 'auto',
  get_service_breakdown: 'auto',
  get_vendor_breakdown: 'auto',
  get_owner_breakdown: 'auto',
  answer_data_question: 'auto',
  draft_outreach_email: 'approve_first',
  stage_status_change: 'approve_first',
  delete_renewal_record: 'human_only',
  edit_pricing_structure: 'human_only'
};

/**
 * Main execution runner for Autonomous AI Renewal Agent
 */
export async function runAgentTask({ prompt, context = {}, user }) {
  const history = [];
  const toolCallHashes = new Set();
  let step = 0;
  let finalResult = null;

  while (step < MAX_STEPS) {
    step++;

    // Intent classifier / Tool selector logic
    const toolCall = await determineNextToolCall(prompt, context, history);

    if (!toolCall) {
      // Task finished
      break;
    }

    // Loop detection
    const callHash = crypto.createHash('md5').update(JSON.stringify(toolCall)).digest('hex');
    if (toolCallHashes.has(callHash)) {
      history.push({ step, error: 'Loop detected: identical tool call repeated. Aborting run.' });
      break;
    }
    toolCallHashes.add(callHash);

    // Approval Tier Check
    const tier = APPROVAL_TIERS[toolCall.toolName] || 'approve_first';
    if (tier === 'human_only') {
      history.push({
        step,
        action: toolCall.toolName,
        status: 'blocked',
        reason: 'Action requires manual human intervention and cannot be executed autonomously.'
      });
      break;
    }

    // Execute Tool
    try {
      const toolOutput = await executeTool(toolCall, user, prompt);
      history.push({ step, tool: toolCall.toolName, params: toolCall.params, output: toolOutput });

      // Build final answer from tool output
      finalResult = await generateResultSummary(prompt, toolCall.toolName, toolOutput, toolCall.params);
    } catch (err) {
      history.push({ step, tool: toolCall.toolName, error: err.message });
      break;
    }
  }

  return {
    completed: true,
    totalSteps: step,
    finalResult: finalResult || 'Processed query successfully.',
    history
  };
}

const ROUTABLE_TOOLS = [
  'get_expiring_renewals',
  'get_portfolio_summary',
  'get_client_stats',
  'get_renewal_by_id',
  'get_top_clients_by_value',
  'get_top_clients_by_profit',
  'get_overdue_renewals',
  'get_pending_invoices',
  'search_client_renewals',
  'get_service_breakdown',
  'get_vendor_breakdown',
  'get_owner_breakdown',
  'answer_data_question',
  'parse_nl_edit',
];

const TOOL_HINT = 'Tool guide:\n' +
  '- get_client_stats for "total clients", "how many clients", "client count", or "total unique clients"\n' +
  '- get_top_clients_by_profit for "highest profit", "top margin", or "most profitable client"\n' +
  '- get_top_clients_by_value for "top/biggest/highest value client(s)", "who pays the most", or "highest price renewal"\n' +
  '- get_overdue_renewals for "overdue payment", "unpaid clients", "late payment", or "due payment"\n' +
  '- get_pending_invoices for "invoice pending", "unbilled renewals", or "invoice not sent"\n' +
  '- search_client_renewals when searching for renewals of a specific client or service name\n' +
  '- get_vendor_breakdown for breakdown or totals by vendor (Microsoft, AWS, Acronis, etc.)\n' +
  '- get_owner_breakdown for breakdown or totals by owner/sales rep\n' +
  '- get_service_breakdown for breakdown by service type\n' +
  '- get_expiring_renewals for renewals due soon\n' +
  '- get_portfolio_summary for overall high-level executive portfolio numbers\n' +
  '- get_renewal_by_id when a specific RMT-### is named\n' +
  '- parse_nl_edit only when the message asks to update or set a field on a record\n' +
  '- answer_data_question for date/time-range questions ("June 2026", "last month", "this quarter", "last 30 days") ' +
  'and for any other arbitrary data query about renewals that does not clearly match one of the tools above.';

async function determineNextToolCall(prompt, context, history) {
  if (history.length > 0) return null;

  const classification = await classifyIntent({
    prompt: `${TOOL_HINT}\n\nUser request: ${prompt}`,
    allowedTools: ROUTABLE_TOOLS,
    fallbackTool: 'answer_data_question',
  });

  if (classification.ok) {
    return { toolName: classification.toolName, params: classification.params };
  }

  return regexFallbackToolCall(prompt);
}

function regexFallbackToolCall(prompt) {
  const lowerPrompt = prompt.toLowerCase();

  // 1. Client count & total client queries
  if (/total client|client count|how many client|number of client|distinct client|list of client|all client/i.test(lowerPrompt)) {
    return { toolName: 'get_client_stats', params: {} };
  }

  // 2. Profit / margin queries (Checked before value!)
  if (/(profit|margin|gain|profitable)/i.test(lowerPrompt)) {
    return { toolName: 'get_top_clients_by_profit', params: { limit: 10 } };
  }

  // 3. High value / higher price / top client / expensive renewal queries
  if (/(high|top|big|large|max|expensive|costly|price|value|higher|valuable|biggest|largest)/i.test(lowerPrompt) && /(client|renewal|contract|price|value)/i.test(lowerPrompt)) {
    return { toolName: 'get_top_clients_by_value', params: { limit: 10 } };
  }

  // 4. Overdue / unpaid payment queries
  if (/(overdue|unpaid|pending payment|late payment|due payment|payment delay|disputed)/i.test(lowerPrompt)) {
    return { toolName: 'get_overdue_renewals', params: {} };
  }

  // 5. Invoice pending / invoice status
  if (/(invoice|unbilled|bill pending|not invoiced)/i.test(lowerPrompt)) {
    return { toolName: 'get_pending_invoices', params: {} };
  }

  // 6. Vendor queries
  if (/(vendor|supplier|brand|microsoft|aws|acronis|sophos|zoho)/i.test(lowerPrompt)) {
    if (/(microsoft|aws|acronis|sophos|zoho)/i.test(lowerPrompt)) {
      const match = lowerPrompt.match(/(microsoft|aws|acronis|sophos|zoho)/i);
      return { toolName: 'search_client_renewals', params: { query: match[0] } };
    }
    return { toolName: 'get_vendor_breakdown', params: {} };
  }

  // 7. Owner / BDM / Sales Rep queries
  if (/(owner|sales rep|bdm|assigned|account manager|sales person)/i.test(lowerPrompt)) {
    return { toolName: 'get_owner_breakdown', params: {} };
  }

  // 8. Service breakdown queries
  if (/(service|breakdown|by service|per service)/i.test(lowerPrompt)) {
    return { toolName: 'get_service_breakdown', params: {} };
  }

  // 9. Expiring / upcoming / due renewals
  if (/(expiring|\bdue\b|upcoming|urgent|risk|expiry)/i.test(lowerPrompt)) {
    return { toolName: 'get_expiring_renewals', params: { days: 30 } };
  }

  // 10. Specific RMT ID lookup (e.g., RMT-101, rmt 101, rmt-101, RMT101).
  // Checked before the date/temporal step below — an explicit record ID is
  // a stronger, unambiguous signal than a date mention that might just be
  // incidental to the same message ("RMT-101 renewal for June 2026" should
  // still look up RMT-101, not run a date-range query).
  if (/(?:RMT|rmt)[-\s]?\d+/i.test(prompt)) {
    const idMatch = prompt.match(/(?:RMT|rmt)[-\s]?(\d+)/i);
    const numericPart = idMatch ? idMatch[1] : '';
    const formattedRmtId = `RMT-${numericPart}`;

    if (/(?:update|set|change|edit|modify)\b/i.test(lowerPrompt)) {
      return { toolName: 'parse_nl_edit', params: { utterance: prompt } };
    }
    return { toolName: 'get_renewal_by_id', params: { id: formattedRmtId } };
  }

  // 9b. Date/temporal questions — a real gap until now. Nothing above
  // recognizes "June 2026", "last month", "Q2", a bare year, etc., so these
  // fell all the way through to client-name search (step 12/14 below),
  // which correctly finds no client literally named "the record of june
  // 2026" and reports a misleading "no client records" message for a
  // question that was never about a client at all. answer_data_question can
  // actually construct a renewal_date range filter — route there instead.
  const MONTH_NAMES = /(january|february|march|april|may|june|july|august|september|october|november|december)/i;
  if (
    MONTH_NAMES.test(lowerPrompt) ||
    /\b(19|20)\d{2}\b/.test(lowerPrompt) ||
    /\b(last|this|next)\s+(month|week|quarter|year)\b/i.test(lowerPrompt) ||
    /\bq[1-4]\b/i.test(lowerPrompt) ||
    /\blast\s+\d+\s+days?\b/i.test(lowerPrompt)
  ) {
    return { toolName: 'answer_data_question', params: {} };
  }

  // 11. NL Edit instructions
  if (/(?:update|set|change)\s+[a-z_]+/i.test(lowerPrompt)) {
    return { toolName: 'parse_nl_edit', params: { utterance: prompt } };
  }

  // 12. Search client by name ("renewals for Acme", "client HDFC", "search Sidcorp")
  const clientSearchMatch = lowerPrompt.match(/(?:client|for|search|find|show)\s+([a-z0-9\s\.\-]{3,})/i);
  if (clientSearchMatch && !/portfolio|summary|overview|total|all|due|overdue|invoice|rmt|application|system|help/i.test(clientSearchMatch[1])) {
    return { toolName: 'search_client_renewals', params: { query: clientSearchMatch[1].trim() } };
  }

  // 13. High-level portfolio summary & RMT System info
  if (/portfolio|summary|overview|rmt|application|system|help|what can you do|features|agent/i.test(lowerPrompt)) {
    return { toolName: 'get_portfolio_summary', params: {} };
  }

  // 14. Fallback search for any other open prompt
  return { toolName: 'search_client_renewals', params: { query: prompt } };
}

async function executeTool(toolCall, user, prompt) {
  switch (toolCall.toolName) {
    case 'get_expiring_renewals':
      return await executeAgentQuery({ queryName: 'get_expiring_renewals', params: [toolCall.params.days || 30], user });
    case 'get_portfolio_summary':
      return await executeAgentQuery({ queryName: 'get_portfolio_summary', params: [], user });
    case 'get_client_stats':
      return await executeAgentQuery({ queryName: 'get_client_stats', params: [], user });
    case 'get_renewal_by_id':
      return await executeAgentQuery({ queryName: 'get_renewal_by_id', params: [toolCall.params.id], user });
    case 'get_top_clients_by_value':
      return await executeAgentQuery({ queryName: 'get_top_clients_by_value', params: [toolCall.params.limit || 10], user });
    case 'get_top_clients_by_profit':
      return await executeAgentQuery({ queryName: 'get_top_clients_by_profit', params: [toolCall.params.limit || 10], user });
    case 'get_overdue_renewals':
      return await executeAgentQuery({ queryName: 'get_overdue_renewals', params: [], user });
    case 'get_pending_invoices':
      return await executeAgentQuery({ queryName: 'get_pending_invoices', params: [], user });
    case 'search_client_renewals':
      return await executeAgentQuery({ queryName: 'search_client_renewals', params: [toolCall.params.query || ''], user });
    case 'get_service_breakdown':
      return await executeAgentQuery({ queryName: 'get_service_breakdown', params: [], user });
    case 'get_vendor_breakdown':
      return await executeAgentQuery({ queryName: 'get_vendor_breakdown', params: [], user });
    case 'get_owner_breakdown':
      return await executeAgentQuery({ queryName: 'get_owner_breakdown', params: [], user });
    case 'answer_data_question': {
      const specResult = await generateQuerySpec(prompt);
      if (!specResult.ok) {
        return { ok: false, reason: specResult.reason, explanation: specResult.explanation };
      }
      const queryResult = await runQuerySpec(specResult.spec, user);
      if (!queryResult.ok) {
        return { ok: false, reason: queryResult.reason, explanation: queryResult.error };
      }
      return { ok: true, rows: queryResult.rows };
    }
    case 'parse_nl_edit':
      return await parseNaturalLanguageMutation(toolCall.params.utterance, user);
    default:
      throw new Error(`Unknown tool name ${toolCall.toolName}`);
  }
}

async function generateResultSummary(prompt, toolName, output, toolParams = {}) {
  if (toolName === 'get_portfolio_summary' && output[0]) {
    const p = output[0];
    return `📊 Portfolio Analysis:\n• Total Active Contracts: ${p.total_active}\n• Total Unique Clients: ${p.total_clients}\n• Total Portfolio Value: ₹${parseFloat(p.total_value).toLocaleString('en-IN')}\n• Total Portfolio Profit: ₹${parseFloat(p.total_profit).toLocaleString('en-IN')}\n• Urgent Renewals (≤ 15 days): ${p.urgent_count}\n• Overdue Payments: ${p.overdue_count}`;
  }

  if (toolName === 'get_client_stats' && output[0]) {
    const s = output[0];
    return `📊 Client Portfolio Overview:\n• Total Unique Clients: ${s.total_unique_clients} clients\n• Total Active Contracts: ${s.total_contracts} contracts\n• Total Portfolio Value: ₹${parseFloat(s.total_portfolio_value).toLocaleString('en-IN')}\n• Average Contract Value: ₹${parseFloat(s.avg_contract_value).toLocaleString('en-IN')}`;
  }

  if (toolName === 'get_expiring_renewals') {
    if (!output.length) return 'No active renewals expiring within the specified timeframe.';
    const lines = output.slice(0, 15).map((r, i) =>
      `${i + 1}. ${r.client_name} (${r.unique_id}) — ₹${parseFloat(r.value).toLocaleString('en-IN')} | Service: ${r.service} | Date: ${r.renewal_date ? String(r.renewal_date).split('T')[0] : 'N/A'}`
    );
    return `⌛ Expiring Renewals (${output.length} total found):\n${lines.join('\n')}`;
  }

  if (toolName === 'get_renewal_by_id') {
    if (!output || !output.length) {
      return `ℹ️ No matching renewal record found for ${toolParams.id || 'the specified ID'}. Please check the ID or search by client name.`;
    }
    const r = output[0];
    const risk = computeRiskScore(r);
    let base = `📋 Record Details for ${r.unique_id || ('RMT-' + r.id)} (${r.client_name}):\n` +
               `• Service: ${r.service || 'N/A'}\n` +
               `• Contract Value: ₹${parseFloat(r.value || 0).toLocaleString('en-IN')}\n` +
               `• Status: ${r.status || 'Active'}\n` +
               `• Owner/BDM: ${r.owner || 'Unassigned'}\n` +
               `• Payment State: ${r.payment_state || 'Paid'}\n` +
               `• Days Until Renewal: ${r.days_left !== undefined && r.days_left !== null ? r.days_left : 'N/A'}\n` +
               `• Risk Tier: ${risk.tier} (Score: ${risk.score}/100)`;
    try {
      const explanation = await explainRiskScore(risk);
      if (explanation && explanation.ok && explanation.text) {
        base += `\n\nRisk Assessment: ${explanation.text}`;
      }
    } catch (e) {}
    return base;
  }

  if (toolName === 'parse_nl_edit') {
    if (output.error) return `⚠️ Edit Blocked: ${output.error}`;
    return `✏️ Mutation Proposed for ${output.target.uniqueId} (${output.target.clientName}):\nChange ${output.changes.map(c => `${c.field} ➔ ${c.to}`).join(', ')}.`;
  }

  if (toolName === 'get_top_clients_by_value') {
    if (!output.length) return 'No active renewals found to rank by value.';
    const lines = output.map((r, i) =>
      `${i + 1}. ${r.client_name} (${r.unique_id}) — ₹${parseFloat(r.value).toLocaleString('en-IN')} (Service: ${r.service || 'N/A'}${r.owner ? `, Owner: ${r.owner}` : ''})`
    );
    return `🏆 Top ${lines.length} Clients by Renewal Value:\n${lines.join('\n')}`;
  }

  if (toolName === 'get_top_clients_by_profit') {
    if (!output.length) return 'No active renewals found to rank by profit.';
    const lines = output.map((r, i) =>
      `${i + 1}. ${r.client_name} (${r.unique_id}) — Profit: ₹${parseFloat(r.profit || 0).toLocaleString('en-IN')} (Value: ₹${parseFloat(r.value).toLocaleString('en-IN')}, Service: ${r.service || 'N/A'})`
    );
    return `💰 Top ${lines.length} Clients by Renewal Profit:\n${lines.join('\n')}`;
  }

  if (toolName === 'get_overdue_renewals') {
    if (!output.length) return '🎉 Great news! No overdue renewals found in the system.';
    const lines = output.map((r, i) =>
      `${i + 1}. ${r.client_name} (${r.unique_id}) — ₹${parseFloat(r.value).toLocaleString('en-IN')} | Service: ${r.service} | Status: ${r.payment_state || 'Overdue'}`
    );
    return `⚠️ Overdue Renewals (${output.length} records found):\n${lines.join('\n')}`;
  }

  if (toolName === 'get_pending_invoices') {
    if (!output.length) return 'All active renewal contracts have invoices sent.';
    const lines = output.map((r, i) =>
      `${i + 1}. ${r.client_name} (${r.unique_id}) — ₹${parseFloat(r.value).toLocaleString('en-IN')} | Service: ${r.service} | Invoice: ${r.invoice_status || 'Not Sent'}`
    );
    return `📄 Renewals Pending Invoice (${output.length} records found):\n${lines.join('\n')}`;
  }

  if (toolName === 'search_client_renewals') {
    if (!output.length) return 'No matching client records found.';
    const lines = output.map((r, i) =>
      `• ${r.client_name} (${r.unique_id}) — ₹${parseFloat(r.value).toLocaleString('en-IN')} | Service: ${r.service} | Status: ${r.status}`
    );
    return `🔍 Search Results (${output.length} records found):\n${lines.join('\n')}`;
  }

  if (toolName === 'get_service_breakdown') {
    if (!output.length) return 'No active renewals found to break down by service.';
    const lines = output.map(s =>
      `• ${s.service}: ${s.count} contract${s.count === 1 ? '' : 's'}, total value ₹${parseFloat(s.total_value).toLocaleString('en-IN')}, profit ₹${parseFloat(s.total_profit).toLocaleString('en-IN')}`
    );
    return `💼 Renewal Portfolio by Service:\n${lines.join('\n')}`;
  }

  if (toolName === 'get_vendor_breakdown') {
    if (!output.length) return 'No vendor data available.';
    const lines = output.map(v =>
      `• ${v.vendor}: ${v.count} contract${v.count === 1 ? '' : 's'}, total value ₹${parseFloat(v.total_value).toLocaleString('en-IN')}`
    );
    return `🏢 Renewal Portfolio by Vendor:\n${lines.join('\n')}`;
  }

  if (toolName === 'get_owner_breakdown') {
    if (!output.length) return 'No owner data available.';
    const lines = output.map(o =>
      `• ${o.owner}: ${o.count} contract${o.count === 1 ? '' : 's'}, total value ₹${parseFloat(o.total_value).toLocaleString('en-IN')}`
    );
    return `👤 Renewal Portfolio by Owner / Sales Rep:\n${lines.join('\n')}`;
  }

  if (toolName === 'answer_data_question') {
    if (!output.ok) {
      if (output.reason === 'unanswerable') {
        return `⚠️ I couldn't answer that: ${output.explanation || 'it doesn’t map to data I have access to.'}`;
      }
      if (output.reason === 'no_api_key' || output.reason === 'budget_exceeded' || output.reason === 'call_failed') {
        return `⚠️ The AI service is temporarily unavailable (${output.reason.replace(/_/g, ' ')}), so I couldn't process that question. Please try again shortly.`;
      }
      return `⚠️ I couldn't answer that right now. Please try again.`;
    }
    if (!output.rows.length) return 'No matching records found.';
    const isSingleAggregate = output.rows.length === 1 && Object.keys(output.rows[0]).length <= 3;
    if (isSingleAggregate) {
      const parts = Object.entries(output.rows[0]).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${formatCell(v)}`);
      return parts.join(', ') + '.';
    }
    const lines = output.rows.slice(0, 15).map((row) =>
      Object.entries(row).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${formatCell(v)}`).join(', ')
    );
    const suffix = output.rows.length > 15 ? `\n…and ${output.rows.length - 15} more.` : '';
    return lines.join('\n') + suffix;
  }
  return JSON.stringify(output);
}

function formatCell(v) {
  if (v === null || v === undefined) return '—';
  // pg returns DATE columns as native JS Date objects — String(date) produces
  // "Wed Jun 10 2026 00:00:00 GMT+0530 (India Standard Time)", which is what
  // an answer_data_question response was showing verbatim to the user.
  if (v instanceof Date) return v.toLocaleDateString('en-IN');
  if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v) && Number(v) >= 1000) {
    return `₹${parseFloat(v).toLocaleString('en-IN')}`;
  }
  return String(v);
}
