import { GoogleGenAI } from '@google/genai';

/**
 * Single entry point for every Gemini call the agent makes.
 *
 * Two tiers, per design: gemini-2.5-flash for classification/extraction
 * (cheap, thinking disabled — it's picking from a fixed enum, no reasoning
 * needed), gemini-2.5-pro for drafting and narrative phrasing (the one place
 * tone and judgment matter). Neither tier is ever trusted blindly — callers
 * re-validate structured output against the same allow-lists/enums the old
 * regex code used, and safetyGate.js's numeric-grounding check independently
 * re-verifies drafted prose after the fact regardless of what the model was
 * told to do.
 *
 * Fails closed, not open: if the API key is missing or a call errors, every
 * exported function here returns { ok: false } rather than throwing, so a
 * quota outage or missing key degrades the agent to "nothing proposed this
 * run" instead of crashing the sweep for every remaining renewal.
 */

const MODEL_FLASH = 'gemini-2.5-flash';
// Verified live against the actual key in use: gemini-2.5-pro is deprecated
// (404, "no longer available to new users"), and its suggested replacements
// (gemini-3.1-pro-preview, gemini-pro-latest) report free-tier quota
// limit: 0 for this key — not a transient rate limit. Pointing the "capable"
// tier at flash until the key is upgraded to a paid plan; flash still
// handles short factual drafting and one-sentence risk narratives well, and
// this is a one-line change back to a real pro model once quota exists.
const MODEL_PRO = 'gemini-2.5-flash';

const MAX_DAILY_USD = parseFloat(process.env.AGENT_MAX_DAILY_USD || '10');
// Rough per-token cost, blended enough for a soft budget gate — not a billing system.
// MODEL_PRO currently equals MODEL_FLASH (see note above), so both keys
// would collide in an object literal — real flash pricing for both avoids
// silently mispricing classification calls at the old pro rate.
const COST_PER_1K_INPUT = { 'gemini-2.5-flash': 0.0003, 'gemini-2.5-pro': 0.00125 };
const COST_PER_1K_OUTPUT = { 'gemini-2.5-flash': 0.0025, 'gemini-2.5-pro': 0.01 };

// Verified empirically against the actual key in use: the Gemini free tier
// caps at 20 generateContent requests/day, per project, per model — a hard
// wall independent of the dollar-budget check below (20 cheap flash calls
// cost fractions of a cent, so MAX_DAILY_USD would never trip first). Without
// this, every call past #20 still goes out, gets a 429 from Google, and the
// user sees confusing, seemingly-random "temporarily unavailable" answers —
// this makes the failure deterministic and lets the UI show it honestly.
const DAILY_REQUEST_LIMIT = parseInt(process.env.AGENT_MAX_REQUESTS_PER_DAY || '20', 10);

let client = null;
let spendToday = 0;
let requestsToday = 0;
let usageDateBucket = new Date().toISOString().slice(0, 10);

function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

function rolloverIfNewDay() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== usageDateBucket) {
    usageDateBucket = today;
    spendToday = 0;
    requestsToday = 0;
  }
}

function trackUsage(model, usageMetadata) {
  rolloverIfNewDay();
  requestsToday += 1;
  const promptTokens = usageMetadata?.promptTokenCount || 0;
  // Output cost covers both the visible answer and any thinking tokens spent
  // getting there — both are billed by Gemini even when thinking is on.
  const outputTokens = (usageMetadata?.candidatesTokenCount || 0) + (usageMetadata?.thoughtsTokenCount || 0);
  const inputCost = (promptTokens / 1000) * (COST_PER_1K_INPUT[model] || 0);
  const outputCost = (outputTokens / 1000) * (COST_PER_1K_OUTPUT[model] || 0);
  spendToday += inputCost + outputCost;
}

/**
 * The single gate every exported call below passes through first. Checked
 * BEFORE any network call — once the daily request count is known to be
 * exhausted, there is no point sending #21 to Google just to have it
 * rejected; failing locally is instant and deterministic instead of an
 * unpredictable round-trip that sometimes 429s and sometimes doesn't
 * (Google's own per-minute limits made the failures look random on top of
 * the daily cap, which is exactly what made this confusing to diagnose from
 * the outside).
 */
function gateStatus() {
  const c = getClient();
  if (!c) return { blocked: true, reason: 'no_api_key' };
  rolloverIfNewDay();
  if (requestsToday >= DAILY_REQUEST_LIMIT) return { blocked: true, reason: 'daily_limit_reached' };
  if (spendToday >= MAX_DAILY_USD) return { blocked: true, reason: 'budget_exceeded' };
  return { blocked: false, client: c };
}

/**
 * Classify a free-text prompt into one of a fixed set of tool calls.
 * Replaces regex keyword matching — same bounded tool surface, judged by a
 * model instead of an if/else chain. `allowedTools` must be the exact same
 * enum the caller's approval-tier map already enforces; a name outside it
 * is rejected here before the caller ever sees it.
 */
export async function classifyIntent({ prompt, allowedTools, fallbackTool }) {
  const gate = gateStatus();
  if (gate.blocked) return { ok: false, reason: gate.reason };
  const c = gate.client;

  try {
    const response = await c.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        systemInstruction: `You route user requests to exactly one tool for a renewal-management agent. ` +
          `Reply with ONLY a JSON object, no prose, no markdown fences: ` +
          `{"toolName": "<one of: ${allowedTools.join(', ')}>", "params": {...}}. ` +
          `If the request names a record like "RMT-273", extract it into params.id for get_renewal_by_id. ` +
          `If the request asks to update/change/set a field, use parse_nl_edit with params.utterance set to the full original request text. ` +
          `If nothing else fits, use ${fallbackTool}.`,
        responseMimeType: 'application/json',
        maxOutputTokens: 300,
        thinkingConfig: { thinkingBudget: 0 }, // classification needs no reasoning, keep it cheap
      },
    });

    trackUsage(MODEL_FLASH, response.usageMetadata);

    if (!response.text) return { ok: false, reason: 'empty_response' };
    const parsed = JSON.parse(response.text.trim());
    if (!allowedTools.includes(parsed.toolName)) {
      return { ok: false, reason: 'tool_not_allowed', raw: parsed.toolName };
    }
    return { ok: true, toolName: parsed.toolName, params: parsed.params || {} };
  } catch (err) {
    return { ok: false, reason: 'call_failed', error: err.message };
  }
}

/**
 * Extract field/value edits from a free-text instruction, constrained to a
 * caller-supplied allow-list and (optionally) an enum of valid values for
 * enum-typed fields. This is a proposal only — the caller re-validates every
 * field name against its own allow-list before writing anything, exactly as
 * it did with the regex extraction this replaces.
 */
export async function extractFieldEdits({ utterance, allowedFields, enums = {}, currentRecord }) {
  const gate = gateStatus();
  if (gate.blocked) return { ok: false, reason: gate.reason };
  const c = gate.client;

  const enumHints = Object.entries(enums)
    .map(([field, values]) => `${field} must be exactly one of: ${values.join(', ')}`)
    .join('\n');

  try {
    const response = await c.models.generateContent({
      model: MODEL_FLASH,
      contents: `Current record (for context, e.g. to know a phone number is actually changing): ${JSON.stringify(currentRecord || {})}\n\nInstruction: ${utterance}`,
      config: {
        systemInstruction: `Extract field edits from an instruction about a renewal record. ` +
          `Only these fields may be changed: ${allowedFields.join(', ')}. ` +
          `Never propose a field outside this list, even if the instruction asks for one. ` +
          (enumHints ? `${enumHints}\n` : '') +
          `Reply with ONLY a JSON array, no prose: [{"field": "...", "value": "..."}]. ` +
          `Return [] if nothing in the allow-list can be confidently extracted.`,
        responseMimeType: 'application/json',
        maxOutputTokens: 400,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    trackUsage(MODEL_FLASH, response.usageMetadata);

    if (!response.text) return { ok: false, reason: 'empty_response' };
    const parsed = JSON.parse(response.text.trim());
    if (!Array.isArray(parsed)) return { ok: false, reason: 'malformed_response' };

    // Defense in depth: even though the prompt says field-only, still drop
    // anything outside the allow-list here rather than trust the model.
    const edits = parsed.filter((e) => e && allowedFields.includes(e.field) && e.value !== undefined);
    return { ok: true, edits };
  } catch (err) {
    return { ok: false, reason: 'call_failed', error: err.message };
  }
}

/**
 * Draft short outreach prose around code-supplied facts. The model never
 * invents the number, date, or name slots — it's told what they are and
 * asked to write around them. safetyGate.checkNumericGrounding re-checks
 * the result independently; this function does not replace that check.
 */
export async function draftOutreach({ clientName, service, uniqueId, renewalDate, value, daysLeft }) {
  const gate = gateStatus();
  if (gate.blocked) return { ok: false, reason: gate.reason };
  const c = gate.client;

  const facts = `Client: ${clientName}\nService: ${service}\nRecord ID: ${uniqueId}\n` +
    `Renewal date: ${renewalDate}\nContract value: ₹${value.toLocaleString('en-IN')}\nDays left: ${daysLeft}`;

  try {
    const response = await c.models.generateContent({
      model: MODEL_PRO,
      contents: facts,
      config: {
        systemInstruction: 'You write short, professional renewal-reminder emails for a B2B software reseller. ' +
          'Use ONLY the facts given below — never state a number, date, or name that is not listed here. ' +
          'Two to four sentences. No subject line, no greeting boilerplate beyond addressing the client by name, ' +
          'no sign-off. Plain, calm, factual tone — this may be the fourth reminder this client has received.',
        maxOutputTokens: 500,
        thinkingConfig: { thinkingBudget: 0 }, // short templated prose, no reasoning depth needed
      },
    });

    trackUsage(MODEL_PRO, response.usageMetadata);

    if (!response.text || !response.text.trim()) return { ok: false, reason: 'empty_response' };
    // Report the real model that served the request, not the tier label —
    // MODEL_PRO currently points at flash (see the constant's comment), and
    // agent_episodes.model_version is an audit field callers should be able
    // to trust literally.
    return { ok: true, text: response.text.trim(), model: MODEL_PRO };
  } catch (err) {
    return { ok: false, reason: 'call_failed', error: err.message };
  }
}

/**
 * Turn a deterministic risk-score breakdown into one plain-language sentence.
 * Constrained to the factors already computed by riskScorer.js — the model
 * is not allowed to introduce a factor that isn't in the list.
 */
export async function explainRiskScore({ score, tier, factors }) {
  if (factors.length === 0) return { ok: false, reason: 'no_factors' };
  const gate = gateStatus();
  if (gate.blocked) return { ok: false, reason: gate.reason };
  const c = gate.client;

  const factorList = factors.map((f) => `- ${f.note}`).join('\n');

  try {
    const response = await c.models.generateContent({
      model: MODEL_PRO,
      contents: `Risk tier: ${tier} (${score}/100)\nFactors:\n${factorList}`,
      config: {
        systemInstruction: 'Summarize this risk assessment in exactly one plain sentence for a sales dashboard. ' +
          'Reference only the factors listed — do not invent any additional reason. No preamble.',
        maxOutputTokens: 150,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    trackUsage(MODEL_PRO, response.usageMetadata);

    if (!response.text || !response.text.trim()) return { ok: false, reason: 'empty_response' };
    return { ok: true, text: response.text.trim() };
  } catch (err) {
    return { ok: false, reason: 'call_failed', error: err.message };
  }
}

/**
 * Translate a free-text question into the structured query spec consumed by
 * queryEngine.js. This is the "answer anything" fallback — the model never
 * writes SQL, only picks column names, an operator, and a value from the
 * schema described below. queryEngine.js re-validates every one of those
 * against its own allow-list before compiling anything; this function's
 * output is a proposal, never trusted directly.
 */
const QUERY_SPEC_SCHEMA_DESC = `Available columns on the renewals table: unique_id, client_name, service, ` +
  `renewal_date, value, owner, client_email, sales_email, contact_number, status (Active/Pending Renewal/` +
  `Renewed/Expired), follow_up_status, follow_up_remarks, renewal_confirmation, expiry_reason, invoice_status ` +
  `(Sent/Not), invoice_number, invoice_value, invoice_sent_date, plan_period, plan_duration, product, ` +
  `description, quantity, purchase_cost, total_purchase_cost, sales_cost, total_sales_cost, profit, vendor, ` +
  `entity, payment_state (unpaid/partially_paid/paid/overdue/disputed/unknown), payment_status, payment_amount, ` +
  `payment_received_date, quotation_number, created_at, updated_at.

Reply with ONLY a JSON object, no prose, matching this shape:
{
  "select": ["column", ...],            // omit for a sensible default projection
  "aggregate": [{"fn": "COUNT|SUM|AVG|MIN|MAX", "column": "column or * for COUNT", "as": "alias"}],
  "where": [{"field": "column", "op": "=|!=|>|<|>=|<=|LIKE|IN", "value": <string|number|array>}],
  "groupBy": ["column", ...],           // every non-aggregated select column must also appear here
  "orderBy": {"field": "column or an aggregate alias", "direction": "ASC|DESC"},
  "limit": <integer, max 100>
}

Only ever use column names from the list above — never invent one. If the question cannot be answered with
these columns (e.g. it asks about something not tracked here), reply with exactly {"unanswerable": true,
"reason": "<short reason>"} instead.`;

export async function generateQuerySpec(question) {
  const gate = gateStatus();
  if (gate.blocked) return { ok: false, reason: gate.reason };
  const c = gate.client;

  try {
    const response = await c.models.generateContent({
      model: MODEL_PRO,
      contents: question,
      config: {
        systemInstruction: QUERY_SPEC_SCHEMA_DESC,
        responseMimeType: 'application/json',
        maxOutputTokens: 600,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    trackUsage(MODEL_PRO, response.usageMetadata);

    if (!response.text) return { ok: false, reason: 'empty_response' };
    const parsed = JSON.parse(response.text.trim());
    if (parsed.unanswerable) {
      return { ok: false, reason: 'unanswerable', explanation: parsed.reason || 'Not something I can look up.' };
    }
    return { ok: true, spec: parsed };
  } catch (err) {
    return { ok: false, reason: 'call_failed', error: err.message };
  }
}

export function getAgentBudgetStatus() {
  rolloverIfNewDay();
  // Google doesn't publish the exact reset boundary for this quota; UTC
  // midnight is the common convention for daily API limits and matches what
  // was observed empirically, but treat this as an estimate, not a
  // guarantee — the UI should say "around" rather than promise an exact time.
  const resetsAt = new Date();
  resetsAt.setUTCHours(24, 0, 0, 0);
  return {
    requestsToday,
    dailyRequestLimit: DAILY_REQUEST_LIMIT,
    spendToday: Math.round(spendToday * 10000) / 10000,
    maxDailyUsd: MAX_DAILY_USD,
    dateBucket: usageDateBucket,
    limitReached: requestsToday >= DAILY_REQUEST_LIMIT || spendToday >= MAX_DAILY_USD,
    resetsAt: resetsAt.toISOString(),
    hasApiKey: !!process.env.GEMINI_API_KEY,
  };
}
