import { Router } from 'express';
import db from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { processRenewals } from '../services/scheduler.js';

const router = Router();

// Dashboard KPIs
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const totalReq = db.query('SELECT COUNT(*) as count FROM renewals WHERE is_deleted = false');
    const activeReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE status = 'Active' AND is_deleted = false");
    const pendingReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE status = 'Pending Renewal' AND is_deleted = false");
    const renewedReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE (status = 'Renewed' OR renewal_confirmation = 'renewed') AND is_deleted = false");
    const expiredReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE status = 'Expired' AND is_deleted = false");
    const revenueReq = db.query('SELECT COALESCE(SUM(value), 0) as total FROM renewals WHERE is_deleted = false');
    const profitReq = db.query("SELECT COALESCE(SUM(profit), 0) as total FROM renewals WHERE status != 'Expired' AND is_deleted = false");
    const lossReq = db.query("SELECT COALESCE(SUM(profit), 0) as total FROM renewals WHERE status = 'Expired' AND is_deleted = false");
    
    // Phase 2 Actionable Metrics
    const dueTodayReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE renewal_date = CURRENT_DATE AND is_deleted = false AND status IN ('Active','Pending Renewal') AND (renewal_confirmation IS NULL OR renewal_confirmation != 'renewed')");
    const dueThisWeekReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE renewal_date >= CURRENT_DATE AND renewal_date <= (CURRENT_DATE + INTERVAL '7 days')::date AND is_deleted = false AND status IN ('Active','Pending Renewal') AND (renewal_confirmation IS NULL OR renewal_confirmation != 'renewed')");
    const dueThisMonthReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE to_char(renewal_date, 'YYYY-MM') = to_char(CURRENT_DATE, 'YYYY-MM') AND is_deleted = false AND status IN ('Active','Pending Renewal') AND (renewal_confirmation IS NULL OR renewal_confirmation != 'renewed')");
    const overdueReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE (renewal_date < CURRENT_DATE OR status = 'Expired') AND is_deleted = false AND status != 'Renewed' AND (renewal_confirmation IS NULL OR renewal_confirmation != 'renewed')");
    const pendingClientApprovalReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE (renewal_confirmation = 'pending' OR status = 'Pending Renewal') AND is_deleted = false");
    const quotesSentReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE (invoice_status = 'Sent' OR (invoice_number IS NOT NULL AND invoice_number != '')) AND is_deleted = false");
    const revenueThisMonthReq = db.query("SELECT COALESCE(SUM(value), 0) as total FROM renewals WHERE (status = 'Renewed' OR renewal_confirmation = 'renewed') AND (to_char(updated_at, 'YYYY-MM') = to_char(CURRENT_DATE, 'YYYY-MM') OR to_char(renewal_date, 'YYYY-MM') = to_char(CURRENT_DATE, 'YYYY-MM')) AND is_deleted = false");
    const expectedRevenueReq = db.query("SELECT COALESCE(SUM(value), 0) as total FROM renewals WHERE status IN ('Active','Pending Renewal') AND (renewal_confirmation IS NULL OR renewal_confirmation != 'renewed') AND is_deleted = false");
    const pendingFollowupsReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE follow_up_status != 'Completed' AND status IN ('Active','Pending Renewal') AND (renewal_confirmation IS NULL OR renewal_confirmation != 'renewed') AND is_deleted = false");

    const today = new Date().toISOString().split('T')[0];
    const d30 = new Date(); d30.setDate(d30.getDate() + 30);
    const d30str = d30.toISOString().split('T')[0];
    const upcomingReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE renewal_date BETWEEN $1 AND $2 AND status != 'Renewed' AND is_deleted = false", [today, d30str]);

    const [
      totalRes, activeRes, pendingRes, renewedRes, expiredRes, revenueRes, profitRes, lossRes,
      dueTodayRes, dueThisWeekRes, dueThisMonthRes, overdueRes, pendingApprovalRes, quotesSentRes,
      revenueThisMonthRes, expectedRevenueRes, pendingFollowupsRes, upcomingRes
    ] = await Promise.all([
      totalReq, activeReq, pendingReq, renewedReq, expiredReq, revenueReq, profitReq, lossReq,
      dueTodayReq, dueThisWeekReq, dueThisMonthReq, overdueReq, pendingClientApprovalReq, quotesSentReq,
      revenueThisMonthReq, expectedRevenueReq, pendingFollowupsReq, upcomingReq
    ]);

    const renewedCount = parseInt(renewedRes.rows[0].count);
    const expiredCount = parseInt(expiredRes.rows[0].count);
    const totalFinished = renewedCount + expiredCount;
    const conversionRate = totalFinished > 0 ? parseFloat(((renewedCount / totalFinished) * 100).toFixed(1)) : 0;

    res.json({
      total: parseInt(totalRes.rows[0].count),
      active: parseInt(activeRes.rows[0].count),
      pending: parseInt(pendingRes.rows[0].count),
      renewed: renewedCount,
      expired: expiredCount,
      revenue: parseFloat(revenueRes.rows[0].total),
      profit: parseFloat(profitRes.rows[0].total),
      loss: parseFloat(lossRes.rows[0].total),
      upcoming: parseInt(upcomingRes.rows[0].count),
      
      // Phase 2 Actionable Metrics
      dueToday: parseInt(dueTodayRes.rows[0].count),
      dueThisWeek: parseInt(dueThisWeekRes.rows[0].count),
      dueThisMonth: parseInt(dueThisMonthRes.rows[0].count),
      overdue: parseInt(overdueRes.rows[0].count),
      pendingClientApproval: parseInt(pendingApprovalRes.rows[0].count),
      quotesSent: parseInt(quotesSentRes.rows[0].count),
      revenueThisMonth: parseFloat(revenueThisMonthRes.rows[0].total),
      expectedRevenue: parseFloat(expectedRevenueRes.rows[0].total),
      conversionRate: conversionRate,
      pendingFollowups: parseInt(pendingFollowupsRes.rows[0].count)
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// Actionable items requiring priority attention
router.get('/actionable-items', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const { rows } = await db.query(`
      SELECT r.id, r.unique_id, r.client_name, r.service, r.renewal_date, r.value, r.status, r.follow_up_status, r.invoice_status, r.renewal_confirmation, r.owner
      FROM renewals r
      WHERE r.is_deleted = false 
        AND (
          r.renewal_date <= (CURRENT_DATE + INTERVAL '7 days')::date 
          OR r.status = 'Expired'
          OR r.follow_up_status != 'Completed'
          OR r.renewal_confirmation = 'pending'
        )
        AND (r.renewal_confirmation IS NULL OR r.renewal_confirmation != 'renewed')
      ORDER BY 
        CASE 
          WHEN r.renewal_date = CURRENT_DATE THEN 1
          WHEN r.renewal_date < CURRENT_DATE THEN 2
          WHEN r.renewal_date <= (CURRENT_DATE + INTERVAL '7 days')::date THEN 3
          ELSE 4
        END,
        r.renewal_date ASC
      LIMIT $1
    `, [parseInt(limit)]);
    res.json(rows);
  } catch (err) {
    console.error('Actionable items error:', err);
    res.status(500).json({ error: 'Failed to fetch actionable items.' });
  }
});

// Activity logs (Admin only)
router.get('/activity-logs', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const { rows } = await db.query(`
      SELECT al.*, u.full_name, u.role FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC LIMIT $1
    `, [parseInt(limit)]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity logs.' });
  }
});

// Email logs (Admin only)
router.get('/email-logs', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { limit = 1000, month, date, search } = req.query;
    let query = `
      SELECT 
        el.id,
        el.renewal_id,
        el.recipient_email,
        el.recipient_type,
        el.email_type,
        el.subject,
        el.status,
        el.error_message,
        el.sent_at,
        COALESCE(el.client_name, r.client_name, 'System / Automation') AS client_name,
        COALESCE(el.service, r.service, '') AS service,
        r.unique_id
      FROM email_logs el
      LEFT JOIN renewals r ON el.renewal_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (month) {
      params.push(month);
      query += ` AND to_char(el.sent_at, 'YYYY-MM') = $${params.length}`;
    }

    if (date) {
      params.push(date);
      query += ` AND to_char(el.sent_at, 'YYYY-MM-DD') = $${params.length}`;
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      const searchIdx = params.length;
      query += ` AND (COALESCE(el.client_name, r.client_name) ILIKE $${searchIdx} OR el.recipient_email ILIKE $${searchIdx} OR el.subject ILIKE $${searchIdx} OR el.email_type ILIKE $${searchIdx})`;
    }

    query += ` ORDER BY el.sent_at DESC`;

    if (limit !== 'all') {
      params.push(parseInt(limit) || 1000);
      query += ` LIMIT $${params.length}`;
    }

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Email logs fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch email logs.' });
  }
});

// Notification Center Actionable Categories
router.get('/notification-center', authenticateToken, async (req, res) => {
  try {
    const dueTodayReq = db.query(`
      SELECT id, unique_id, client_name, service, renewal_date, value, status, 'due_today' as category
      FROM renewals
      WHERE is_deleted = false AND renewal_date = CURRENT_DATE AND (renewal_confirmation IS NULL OR renewal_confirmation != 'renewed')
      ORDER BY value DESC
    `);

    const overdueReq = db.query(`
      SELECT id, unique_id, client_name, service, renewal_date, value, status, 'overdue' as category
      FROM renewals
      WHERE is_deleted = false AND (renewal_date < CURRENT_DATE OR status = 'Expired') AND (renewal_confirmation IS NULL OR renewal_confirmation != 'renewed')
      ORDER BY renewal_date ASC
    `);

    const followupsDueTodayReq = db.query(`
      SELECT id, unique_id, client_name, service, renewal_date, value, status, 'followup_today' as category
      FROM renewals
      WHERE is_deleted = false AND follow_up_status != 'Completed' AND (renewal_confirmation IS NULL OR renewal_confirmation != 'renewed')
      ORDER BY renewal_date ASC
    `);

    const clientResponseReq = db.query(`
      SELECT id, unique_id, client_name, service, renewal_date, value, status, renewal_confirmation, 'client_response' as category
      FROM renewals
      WHERE is_deleted = false AND renewal_confirmation IN ('awaiting_client_approval', 'reminder_sent', 'quote_sent')
      ORDER BY updated_at DESC
    `);

    const quotePendingReq = db.query(`
      SELECT id, unique_id, client_name, service, renewal_date, value, status, 'quote_pending' as category
      FROM renewals
      WHERE is_deleted = false AND renewal_confirmation IN ('quote_sent', 'awaiting_client_approval')
      ORDER BY renewal_date ASC
    `);

    const paymentPendingReq = db.query(`
      SELECT id, unique_id, client_name, service, renewal_date, value, status, 'payment_pending' as category
      FROM renewals
      WHERE is_deleted = false AND invoice_status = 'Sent' AND (payment_status = 'No' OR payment_status IS NULL)
      ORDER BY value DESC
    `);

    const [dueToday, overdue, followupsDueToday, clientResponse, quotePending, paymentPending] = await Promise.all([
      dueTodayReq, overdueReq, followupsDueTodayReq, clientResponseReq, quotePendingReq, paymentPendingReq
    ]);

    res.json({
      categories: {
        dueToday: dueToday.rows.length,
        overdue: overdue.rows.length,
        followupsDueToday: followupsDueToday.rows.length,
        clientResponse: clientResponse.rows.length,
        quotePending: quotePending.rows.length,
        paymentPending: paymentPending.rows.length
      },
      items: {
        dueToday: dueToday.rows,
        overdue: overdue.rows,
        followupsDueToday: followupsDueToday.rows,
        clientResponse: clientResponse.rows,
        quotePending: quotePending.rows,
        paymentPending: paymentPending.rows
      }
    });
  } catch (err) {
    console.error('Notification center fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch notification center data.' });
  }
});

// Notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const { rows: notifications } = await db.query(`
      SELECT * FROM notifications
      WHERE (user_id = $1 OR role = $2 OR role IS NULL)
      ORDER BY created_at DESC LIMIT 50
    `, [req.user.id, req.user.role]);
    
    const { rows } = await db.query(`
      SELECT COUNT(*) as count FROM notifications
      WHERE (user_id = $1 OR role = $2 OR role IS NULL) AND read = 0
    `, [req.user.id, req.user.role]);
    
    res.json({ notifications, unread: parseInt(rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// Mark notification read (only the owning user or matching role or system-wide notification can mark it)
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET read = 1 WHERE id = $1 AND (user_id = $2 OR role = $3 OR role IS NULL OR user_id IS NULL)',
      [req.params.id, req.user.id, req.user.role]
    );
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all read
router.put('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET read = 1 WHERE (user_id = $1 OR role = $2 OR role IS NULL OR user_id IS NULL)', [req.user.id, req.user.role]);
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Trigger scheduler manually (admin only)
router.post('/trigger-scheduler', authenticateToken, requireRole('admin'), (req, res) => {
  processRenewals();
  res.json({ message: 'Scheduler triggered.' });
});

// Status distribution for charts
router.get('/charts/status', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT status, COUNT(*) as count FROM renewals WHERE is_deleted = false GROUP BY status");
    // Ensure count is parsed if pg returns strings for bigints
    res.json(rows.map(r => ({ status: r.status, count: parseInt(r.count) })));
  } catch (err) {
    res.status(500).json({ error: 'Failed.' });
  }
});

// Services & Sub-Products distribution for nested pie charts
router.get('/charts/services', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT service, COUNT(*)::int as count, COALESCE(SUM(value), 0)::float as revenue
      FROM renewals 
      WHERE is_deleted = false AND service IS NOT NULL AND service != ''
      GROUP BY service
      ORDER BY count DESC
    `);
    
    const { rows: allRecords } = await db.query(`
      SELECT id, unique_id, service, client_name, value, status, renewal_date AS expiry_date, renewal_date, vendor, purchase_cost, profit, owner, client_email, sales_email, contact_number, invoice_number, quotation_number, reference_id, plan_period, payment_status, edit_status, expiry_reason
      FROM renewals
      WHERE is_deleted = false AND service IS NOT NULL AND service != ''
      ORDER BY renewal_date ASC
    `);

    res.json({
      summary: rows,
      allRecords: allRecords
    });
  } catch (err) {
    console.error('Service chart error:', err);
    res.status(500).json({ error: 'Failed to fetch service chart data.' });
  }
});

// Monthly renewals for charts (Past & Current Actual Client Data)
router.get('/charts/monthly', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        to_char(renewal_date, 'YYYY-MM') as month,
        COUNT(*)::int as count,
        COALESCE(SUM(value), 0)::float as revenue,
        COALESCE(SUM(profit), 0)::float as profit,
        -- How much of this month's revenue actually carries a recorded profit
        -- figure. The UI needs this to say whether a margin is trustworthy
        -- rather than silently averaging over rows that have no profit set.
        COALESCE(SUM(CASE WHEN profit IS NOT NULL THEN value ELSE 0 END), 0)::float as revenue_with_profit
      FROM renewals
      WHERE is_deleted = false
        AND renewal_date IS NOT NULL
        AND renewal_date <= (CURRENT_DATE + INTERVAL '12 months')::date
      GROUP BY month
      ORDER BY month ASC
      LIMIT 16
    `);
    res.json(rows.map(r => ({
      month: r.month,
      count: parseInt(r.count),
      revenue: parseFloat(r.revenue),
      profit: parseFloat(r.profit),
      revenueWithProfit: parseFloat(r.revenue_with_profit)
    })));
  } catch (err) {
    console.error('Monthly chart fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch monthly chart data.' });
  }
});

export default router;
