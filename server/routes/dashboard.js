import { Router } from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { processRenewals } from '../services/scheduler.js';

const router = Router();

// Dashboard KPIs
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const totalReq = db.query('SELECT COUNT(*) as count FROM renewals');
    const activeReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE status = 'Active'");
    const pendingReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE status = 'Pending Renewal'");
    const renewedReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE status = 'Renewed'");
    const expiredReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE status = 'Expired'");
    const revenueReq = db.query('SELECT COALESCE(SUM(value), 0) as total FROM renewals');
    const pendingFollowupsReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE follow_up_status != 'Completed' AND status IN ('Active','Pending Renewal')");

    const today = new Date().toISOString().split('T')[0];
    const d30 = new Date(); d30.setDate(d30.getDate() + 30);
    const d30str = d30.toISOString().split('T')[0];
    const upcomingReq = db.query("SELECT COUNT(*) as count FROM renewals WHERE renewal_date BETWEEN $1 AND $2 AND status != 'Renewed'", [today, d30str]);

    const [totalRes, activeRes, pendingRes, renewedRes, expiredRes, revenueRes, pendingFollowupsRes, upcomingRes] = await Promise.all([
      totalReq, activeReq, pendingReq, renewedReq, expiredReq, revenueReq, pendingFollowupsReq, upcomingReq
    ]);

    res.json({
      total: parseInt(totalRes.rows[0].count),
      active: parseInt(activeRes.rows[0].count),
      pending: parseInt(pendingRes.rows[0].count),
      renewed: parseInt(renewedRes.rows[0].count),
      expired: parseInt(expiredRes.rows[0].count),
      revenue: parseFloat(revenueRes.rows[0].total),
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

// Email logs
router.get('/email-logs', authenticateToken, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const { rows } = await db.query(`
      SELECT el.*, r.client_name, r.service, r.unique_id FROM email_logs el
      LEFT JOIN renewals r ON el.renewal_id = r.id
      ORDER BY el.sent_at DESC LIMIT $1
    `, [parseInt(limit)]);
    res.json(rows);
  } catch (err) {
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

// Mark notification read
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET read = 1 WHERE id = $1', [req.params.id]);
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

// Trigger scheduler manually
router.post('/trigger-scheduler', authenticateToken, (req, res) => {
  processRenewals();
  res.json({ message: 'Scheduler triggered.' });
});

// Status distribution for charts
router.get('/charts/status', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT status, COUNT(*) as count FROM renewals GROUP BY status");
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
      FROM renewals GROUP BY month ORDER BY month DESC LIMIT 12
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
