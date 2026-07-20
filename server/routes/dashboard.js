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
    const pendingFollowupsReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE follow_up_status != 'Completed' AND status IN ('Active','Pending Renewal') AND renewal_confirmation != 'renewed' AND is_deleted = false");

    const today = new Date().toISOString().split('T')[0];
    const d30 = new Date(); d30.setDate(d30.getDate() + 30);
    const d30str = d30.toISOString().split('T')[0];
    const upcomingReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE renewal_date BETWEEN $1 AND $2 AND status != 'Renewed' AND is_deleted = false", [today, d30str]);

    const [totalRes, activeRes, pendingRes, renewedRes, expiredRes, revenueRes, profitRes, lossRes, pendingFollowupsRes, upcomingRes] = await Promise.all([
      totalReq, activeReq, pendingReq, renewedReq, expiredReq, revenueReq, profitReq, lossReq, pendingFollowupsReq, upcomingReq
    ]);

    res.json({
      total: parseInt(totalRes.rows[0].count),
      active: parseInt(activeRes.rows[0].count),
      pending: parseInt(pendingRes.rows[0].count),
      renewed: parseInt(renewedRes.rows[0].count),
      expired: parseInt(expiredRes.rows[0].count),
      revenue: parseFloat(revenueRes.rows[0].total),
      profit: parseFloat(profitRes.rows[0].total),
      loss: parseFloat(lossRes.rows[0].total),
      pendingFollowups: parseInt(pendingFollowupsRes.rows[0].count),
      upcoming: parseInt(upcomingRes.rows[0].count)
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// Activity logs
router.get('/activity-logs', authenticateToken, async (req, res) => {
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

// Email logs (Preserves all historical logs even for deleted clients)
router.get('/email-logs', authenticateToken, async (req, res) => {
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

// Mark notification read (only the owning user or matching role can mark it)
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET read = 1 WHERE id = $1 AND (user_id = $2 OR role = $3)',
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
    await db.query('UPDATE notifications SET read = 1 WHERE (user_id = $1 OR role = $2)', [req.user.id, req.user.role]);
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

// Monthly renewals for charts
router.get('/charts/monthly', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT to_char(renewal_date, 'YYYY-MM') as month, COUNT(*) as count, SUM(value) as revenue
      FROM renewals WHERE is_deleted = false GROUP BY month ORDER BY month DESC LIMIT 12
    `);
    res.json(rows.map(r => ({
      month: r.month,
      count: parseInt(r.count),
      revenue: parseFloat(r.revenue)
    })).reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed.' });
  }
});

export default router;
