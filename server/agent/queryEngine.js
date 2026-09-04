import db from '../db.js';

/**
 * Constrained, structured query engine for the agent's "answer anything about
 * the data" capability.
 *
 * The model NEVER writes SQL text. It produces a structured JSON spec —
 * column names, an operator, a value — and this file is the only thing that
 * turns that into SQL. Every identifier (table, column, aggregate function,
 * operator, sort direction) is resolved through a fixed allow-list constant;
 * a name that isn't in the list is rejected, never interpolated. Every VALUE
 * goes in as a bound parameter — nothing from the spec is ever concatenated
 * into the query string. Row-level scoping for a 'sales' user is appended by
 * this code unconditionally, after the model's WHERE clause and regardless
 * of it — the model has no way to see, omit, or override it.
 */

// Only one table is queryable this way, and it carries no secrets (unlike
// `users`, which has password hashes, or `refresh_tokens`). Keeping this to
// a single table is deliberate — a second table means join logic, which is
// a much larger validation surface for a first version of this.
const TABLE = 'renewals';

const COLUMNS = new Set([
  'id', 'unique_id', 'client_name', 'service', 'renewal_date', 'value', 'owner',
  'client_email', 'sales_email', 'contact_number', 'reference_id', 'status',
  'locked', 'follow_up_status', 'follow_up_remarks',
  'day_30_sent', 'day_20_sent', 'day_15_sent', 'day_10_sent', 'day_5_sent', 'day_3_sent', 'day_0_sent',
  'sales_15_sent', 'sales_5_sent', 'sales_3_sent',
  'renewal_confirmation', 'edit_status', 'edit_reason', 'expiry_reason',
  'invoice_status', 'invoice_number', 'invoice_value', 'invoice_sent_date', 'invoice_type',
  'plan_period', 'plan_duration', 'product', 'description', 'quantity',
  'purchase_cost', 'total_purchase_cost', 'sales_cost', 'total_sales_cost', 'profit',
  'vendor', 'entity', 'payment_state', 'payment_status', 'payment_amount', 'payment_received_date',
  'last_reminder_sent_date', 'quotation_number', 'created_at', 'updated_at',
]);

const OPERATORS = new Set(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN']);
const AGGREGATE_FNS = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']);
const NUMERIC_COLUMNS = new Set([
  'value', 'invoice_value', 'purchase_cost', 'total_purchase_cost', 'sales_cost',
  'total_sales_cost', 'profit', 'payment_amount', 'quantity', 'plan_duration',
]);

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

class QuerySpecError extends Error {}

function assertColumn(name, context) {
  if (typeof name !== 'string' || !COLUMNS.has(name)) {
    throw new QuerySpecError(`Unknown or disallowed column "${name}" in ${context}.`);
  }
  return name;
}

/**
 * Compiles a validated spec into parameterized SQL. Throws QuerySpecError on
 * anything that doesn't resolve through the allow-lists — the caller is
 * expected to turn that into an honest "I can't answer that" rather than a
 * best-effort guess.
 */
export function compileQuerySpec(spec, user) {
  if (!spec || typeof spec !== 'object') throw new QuerySpecError('Empty query spec.');

  const params = [];
  const selectParts = [];

  // ── SELECT ──────────────────────────────────────────────────────────────
  const rawSelect = Array.isArray(spec.select) ? spec.select : [];
  const rawAggregate = Array.isArray(spec.aggregate) ? spec.aggregate : [];

  for (const col of rawSelect) {
    selectParts.push(`"${assertColumn(col, 'select')}"`);
  }

  const aggregateAliases = new Set();
  for (const agg of rawAggregate) {
    if (!agg || !AGGREGATE_FNS.has(agg.fn)) {
      throw new QuerySpecError(`Unknown aggregate function "${agg?.fn}".`);
    }
    const alias = typeof agg.as === 'string' && /^[a-z_][a-z0-9_]*$/i.test(agg.as) ? agg.as : `${agg.fn.toLowerCase()}_value`;
    if (agg.fn === 'COUNT' && (agg.column === '*' || !agg.column)) {
      selectParts.push(`COUNT(*) as "${alias}"`);
    } else {
      const col = assertColumn(agg.column, 'aggregate');
      selectParts.push(`${agg.fn}("${col}") as "${alias}"`);
    }
    aggregateAliases.add(alias);
  }

  if (selectParts.length === 0) {
    // No explicit projection — a safe, generally-useful default rather than
    // SELECT * (which would include every column, more than most questions
    // need and more than is worth returning to the model to summarize).
    selectParts.push('"unique_id"', '"client_name"', '"service"', '"value"', '"renewal_date"', '"status"');
  }

  // ── WHERE ───────────────────────────────────────────────────────────────
  const whereClauses = [`is_deleted = FALSE`]; // hardcoded — never from the spec
  const rawWhere = Array.isArray(spec.where) ? spec.where : [];

  for (const cond of rawWhere) {
    if (!cond || typeof cond !== 'object') continue;
    const col = assertColumn(cond.field, 'where');
    if (!OPERATORS.has(cond.op)) {
      throw new QuerySpecError(`Unknown operator "${cond.op}" in where clause.`);
    }
    if (cond.op === 'IN') {
      if (!Array.isArray(cond.value) || cond.value.length === 0 || cond.value.length > 50) {
        throw new QuerySpecError('IN operator requires a non-empty array value (max 50 items).');
      }
      const placeholders = cond.value.map((v) => { params.push(v); return `$${params.length}`; });
      whereClauses.push(`"${col}" IN (${placeholders.join(', ')})`);
    } else {
      if (cond.value === undefined || cond.value === null || typeof cond.value === 'object') {
        throw new QuerySpecError(`Invalid value for column "${col}".`);
      }
      if (NUMERIC_COLUMNS.has(col) && cond.op !== 'LIKE') {
        const n = Number(cond.value);
        if (Number.isNaN(n)) throw new QuerySpecError(`Non-numeric value for numeric column "${col}".`);
        params.push(n);
      } else {
        params.push(cond.op === 'LIKE' ? `%${cond.value}%` : cond.value);
      }
      whereClauses.push(`"${col}" ${cond.op} $${params.length}`);
    }
  }

  // Row-level scoping — appended here, unconditionally, after everything the
  // model produced. Nothing above this point can remove or weaken it.
  if (user?.role === 'sales') {
    params.push(user.full_name || '');
    const ownerIdx = params.length;
    params.push(user.email || '');
    const emailIdx = params.length;
    whereClauses.push(`(LOWER(owner) = LOWER($${ownerIdx}) OR LOWER(sales_email) = LOWER($${emailIdx}))`);
  }

  // ── GROUP BY ────────────────────────────────────────────────────────────
  const groupByParts = [];
  const rawGroupBy = Array.isArray(spec.groupBy) ? spec.groupBy : [];
  for (const col of rawGroupBy) {
    groupByParts.push(`"${assertColumn(col, 'groupBy')}"`);
  }
  if (rawAggregate.length > 0 && rawSelect.length > 0) {
    // Every non-aggregated selected column must also be grouped, or Postgres
    // rejects the query outright — checked whenever aggregates and plain
    // columns are mixed, including when groupBy is empty or omitted
    // entirely (that case must still fail, not silently skip validation).
    for (const col of rawSelect) {
      if (!rawGroupBy.includes(col)) {
        throw new QuerySpecError(`Column "${col}" is selected but not grouped — add it to groupBy or remove it from select.`);
      }
    }
  }

  // ── ORDER BY ────────────────────────────────────────────────────────────
  let orderByClause = '';
  if (spec.orderBy && typeof spec.orderBy === 'object') {
    const direction = String(spec.orderBy.direction || 'DESC').toUpperCase();
    if (direction !== 'ASC' && direction !== 'DESC') {
      throw new QuerySpecError(`Invalid sort direction "${spec.orderBy.direction}".`);
    }
    const field = spec.orderBy.field;
    if (aggregateAliases.has(field)) {
      orderByClause = ` ORDER BY "${field}" ${direction}`;
    } else {
      orderByClause = ` ORDER BY "${assertColumn(field, 'orderBy')}" ${direction}`;
    }
  }

  // ── LIMIT ───────────────────────────────────────────────────────────────
  const limit = Math.min(Math.max(parseInt(spec.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  const sql = `SELECT ${selectParts.join(', ')} FROM ${TABLE} WHERE ${whereClauses.join(' AND ')}` +
    (groupByParts.length ? ` GROUP BY ${groupByParts.join(', ')}` : '') +
    orderByClause +
    ` LIMIT ${limit}`;

  return { sql, params };
}

/**
 * Validates and executes a query spec. Never throws to the caller — a
 * malformed or disallowed spec is a normal, expected outcome (the model
 * misunderstood the question, or the question genuinely can't be answered
 * from this table), not an application error.
 */
export async function runQuerySpec(spec, user) {
  try {
    const { sql, params } = compileQuerySpec(spec, user);
    const { rows } = await db.query(sql, params);
    return { ok: true, rows, sql };
  } catch (err) {
    if (err instanceof QuerySpecError) {
      return { ok: false, reason: 'invalid_spec', error: err.message };
    }
    return { ok: false, reason: 'query_failed', error: err.message };
  }
}
