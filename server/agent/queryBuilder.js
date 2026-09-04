import db from '../db.js';

/**
 * Allow-listed parameterized SQL query builder for AI agent
 * Enforces user role scoping for sales team members (owner/sales_email filter)
 */
export async function executeAgentQuery({ queryName, params = [], user }) {
  let sql = '';
  const queryParams = [];

  switch (queryName) {
    case 'get_expiring_renewals': {
      const days = parseInt(params[0], 10) || 30;
      sql = `
        SELECT id, unique_id, client_name, service, owner, sales_email, renewal_date, value, status, payment_state, renewal_confirmation
        FROM renewals
        WHERE is_deleted = FALSE
          AND status IN ('Active', 'Pending Renewal')
          AND renewal_date IS NOT NULL
          AND (renewal_date - CURRENT_DATE) <= $1
      `;
      queryParams.push(days);
      if (user?.role === 'sales') {
        sql += ` AND (LOWER(owner) = LOWER($2) OR LOWER(sales_email) = LOWER($3))`;
        queryParams.push(user.full_name || '', user.email || '');
      }
      sql += ` ORDER BY renewal_date ASC LIMIT 50`;
      break;
    }

    case 'get_renewal_by_id': {
      const rawId = String(params[0] || '').trim();
      const digitsMatch = rawId.match(/\d+/);
      const numericId = digitsMatch ? digitsMatch[0] : rawId;
      const formattedRmt = `RMT-${numericId}`;

      sql = `
        SELECT *, (renewal_date - CURRENT_DATE)::int as days_left
        FROM renewals
        WHERE (
          id::text = $1 
          OR LOWER(unique_id) = LOWER($1) 
          OR LOWER(unique_id) = LOWER($2) 
          OR unique_id ILIKE $3
        ) 
        AND is_deleted = FALSE
      `;
      queryParams.push(rawId, formattedRmt, `%${numericId}%`);
      if (user?.role === 'sales') {
        sql += ` AND (LOWER(owner) = LOWER($4) OR LOWER(sales_email) = LOWER($5))`;
        queryParams.push(user.full_name || '', user.email || '');
      }
      break;
    }

    case 'get_portfolio_summary': {
      sql = `
        SELECT 
          COUNT(*)::int as total_active,
          COUNT(DISTINCT client_name)::int as total_clients,
          COALESCE(SUM(value), 0)::numeric as total_value,
          COALESCE(SUM(profit), 0)::numeric as total_profit,
          COUNT(CASE WHEN payment_state = 'overdue' THEN 1 END)::int as overdue_count,
          COUNT(CASE WHEN (renewal_date - CURRENT_DATE) <= 15 THEN 1 END)::int as urgent_count
        FROM renewals
        WHERE is_deleted = FALSE AND status IN ('Active', 'Pending Renewal')
      `;
      if (user?.role === 'sales') {
        sql += ` AND (LOWER(owner) = LOWER($1) OR LOWER(sales_email) = LOWER($2))`;
        queryParams.push(user.full_name || '', user.email || '');
      }
      break;
    }

    case 'get_client_stats': {
      sql = `
        SELECT 
          COUNT(DISTINCT client_name)::int as total_unique_clients,
          COUNT(*)::int as total_contracts,
          COALESCE(SUM(value), 0)::numeric as total_portfolio_value,
          COALESCE(AVG(value), 0)::numeric as avg_contract_value
        FROM renewals
        WHERE is_deleted = FALSE AND status IN ('Active', 'Pending Renewal')
      `;
      if (user?.role === 'sales') {
        sql += ` AND (LOWER(owner) = LOWER($1) OR LOWER(sales_email) = LOWER($2))`;
        queryParams.push(user.full_name || '', user.email || '');
      }
      break;
    }

    case 'get_top_clients_by_value': {
      const limit = Math.min(parseInt(params[0], 10) || 10, 50);
      sql = `
        SELECT id, unique_id, client_name, service, owner, renewal_date, value, profit, status
        FROM renewals
        WHERE is_deleted = FALSE AND status IN ('Active', 'Pending Renewal')
      `;
      if (user?.role === 'sales') {
        sql += ` AND (LOWER(owner) = LOWER($1) OR LOWER(sales_email) = LOWER($2))`;
        queryParams.push(user.full_name || '', user.email || '');
      }
      sql += ` ORDER BY value DESC NULLS LAST LIMIT ${limit}`;
      break;
    }

    case 'get_top_clients_by_profit': {
      const limit = Math.min(parseInt(params[0], 10) || 10, 50);
      sql = `
        SELECT id, unique_id, client_name, service, owner, value, profit, status
        FROM renewals
        WHERE is_deleted = FALSE AND status IN ('Active', 'Pending Renewal')
      `;
      if (user?.role === 'sales') {
        sql += ` AND (LOWER(owner) = LOWER($1) OR LOWER(sales_email) = LOWER($2))`;
        queryParams.push(user.full_name || '', user.email || '');
      }
      sql += ` ORDER BY profit DESC NULLS LAST LIMIT ${limit}`;
      break;
    }

    case 'get_overdue_renewals': {
      sql = `
        SELECT unique_id, client_name, service, owner, value, renewal_date, payment_state, payment_status
        FROM renewals
        WHERE is_deleted = FALSE 
          AND (payment_state = 'overdue' OR LOWER(status) = 'overdue' OR LOWER(payment_status) LIKE '%overdue%')
      `;
      if (user?.role === 'sales') {
        sql += ` AND (LOWER(owner) = LOWER($1) OR LOWER(sales_email) = LOWER($2))`;
        queryParams.push(user.full_name || '', user.email || '');
      }
      sql += ` ORDER BY value DESC NULLS LAST LIMIT 25`;
      break;
    }

    case 'get_pending_invoices': {
      sql = `
        SELECT unique_id, client_name, service, owner, value, renewal_date, invoice_status
        FROM renewals
        WHERE is_deleted = FALSE AND (invoice_status = 'Not' OR invoice_status IS NULL OR LOWER(invoice_status) = 'pending')
      `;
      if (user?.role === 'sales') {
        sql += ` AND (LOWER(owner) = LOWER($1) OR LOWER(sales_email) = LOWER($2))`;
        queryParams.push(user.full_name || '', user.email || '');
      }
      sql += ` ORDER BY value DESC NULLS LAST LIMIT 25`;
      break;
    }

    case 'search_client_renewals': {
      const rawTerm = String(params[0] || '').trim();
      const searchTerm = `%${rawTerm}%`;
      sql = `
        SELECT unique_id, client_name, service, owner, value, renewal_date, status, payment_state, invoice_status
        FROM renewals
        WHERE is_deleted = FALSE AND (
          LOWER(client_name) LIKE LOWER($1) 
          OR LOWER(service) LIKE LOWER($1) 
          OR LOWER(vendor) LIKE LOWER($1)
          OR LOWER(unique_id) LIKE LOWER($1)
          OR id::text LIKE $1
        )
      `;
      queryParams.push(searchTerm);
      if (user?.role === 'sales') {
        sql += ` AND (LOWER(owner) = LOWER($2) OR LOWER(sales_email) = LOWER($3))`;
        queryParams.push(user.full_name || '', user.email || '');
      }
      sql += ` ORDER BY renewal_date DESC LIMIT 25`;
      break;
    }

    case 'get_service_breakdown': {
      sql = `
        SELECT
          service,
          COUNT(*)::int as count,
          COALESCE(SUM(value), 0)::numeric as total_value,
          COALESCE(SUM(profit), 0)::numeric as total_profit
        FROM renewals
        WHERE is_deleted = FALSE AND status IN ('Active', 'Pending Renewal')
      `;
      if (user?.role === 'sales') {
        sql += ` AND (LOWER(owner) = LOWER($1) OR LOWER(sales_email) = LOWER($2))`;
        queryParams.push(user.full_name || '', user.email || '');
      }
      sql += ` GROUP BY service ORDER BY total_value DESC`;
      break;
    }

    case 'get_vendor_breakdown': {
      sql = `
        SELECT
          COALESCE(vendor, 'Unspecified') as vendor,
          COUNT(*)::int as count,
          COALESCE(SUM(value), 0)::numeric as total_value
        FROM renewals
        WHERE is_deleted = FALSE AND status IN ('Active', 'Pending Renewal')
      `;
      if (user?.role === 'sales') {
        sql += ` AND (LOWER(owner) = LOWER($1) OR LOWER(sales_email) = LOWER($2))`;
        queryParams.push(user.full_name || '', user.email || '');
      }
      sql += ` GROUP BY vendor ORDER BY total_value DESC`;
      break;
    }

    case 'get_owner_breakdown': {
      sql = `
        SELECT
          COALESCE(owner, 'Unassigned') as owner,
          COUNT(*)::int as count,
          COALESCE(SUM(value), 0)::numeric as total_value
        FROM renewals
        WHERE is_deleted = FALSE AND status IN ('Active', 'Pending Renewal')
      `;
      if (user?.role === 'sales') {
        sql += ` AND (LOWER(owner) = LOWER($1) OR LOWER(sales_email) = LOWER($2))`;
        queryParams.push(user.full_name || '', user.email || '');
      }
      sql += ` GROUP BY owner ORDER BY total_value DESC`;
      break;
    }

    default:
      throw new Error(`Query '${queryName}' is not in the agent allow-list.`);
  }

  const { rows } = await db.query(sql, queryParams);
  return rows;
}
