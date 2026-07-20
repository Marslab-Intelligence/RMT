import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
  next();
};

const VALID_ROLES = ['admin', 'finance', 'sales'];
const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];

// GET /api/admin/users
router.get('/', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, username, email, full_name, role, avatar_color, is_active, created_at
       FROM users ORDER BY is_active DESC, role, full_name`
    );
    res.json(rows);
  } catch (err) {
    console.error('[Admin Users GET]', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// POST /api/admin/users
router.post('/', authenticateToken, adminOnly, async (req, res) => {
  const { email, full_name, role } = req.body;
  if (!email || !full_name || !role) {
    return res.status(400).json({ error: 'Email, full name, and role are required.' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be admin, finance, or sales.' });
  }

  try {
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_');
    const placeholderPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const avatar_color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const { rows } = await db.query(
      `INSERT INTO users (username, email, password, full_name, role, avatar_color, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id, username, email, full_name, role, avatar_color, is_active`,
      [username, email.toLowerCase().trim(), placeholderPassword, full_name.trim(), role, avatar_color]
    );

    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, details) VALUES ($1, 'create', 'user', $2)`,
      [req.user.id, `Admin added new user: ${email} (${role})`]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    console.error('[Admin Users POST]', err);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PUT /api/admin/users/:id/role
router.put('/:id/role', authenticateToken, adminOnly, async (req, res) => {
  const { role } = req.body;
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }
  try {
    const { rows } = await db.query(
      `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
       RETURNING id, email, full_name, role`,
      [role, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, details) VALUES ($1, 'update', 'user', $2)`,
      [req.user.id, `Admin changed ${rows[0].email} role to ${role}`]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('[Admin Users PUT role]', err);
    res.status(500).json({ error: 'Failed to update role.' });
  }
});

// DELETE /api/admin/users/:id  (permanent hard delete)
router.delete('/:id', authenticateToken, adminOnly, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  try {
    const { rows: check } = await db.query(
      `SELECT id, email FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (check.length === 0) return res.status(404).json({ error: 'User not found.' });

    await db.query('BEGIN');

    // Nullify FK references to avoid constraint violations
    await db.query(`UPDATE renewals SET created_by = NULL WHERE created_by = $1`, [req.params.id]);
    await db.query(`UPDATE renewal_history SET performed_by = NULL WHERE performed_by = $1`, [req.params.id]);
    await db.query(`UPDATE activity_logs SET user_id = NULL WHERE user_id = $1`, [req.params.id]);
    await db.query(`UPDATE notifications SET user_id = NULL WHERE user_id = $1`, [req.params.id]);
    await db.query(`UPDATE visits SET cst_id = NULL WHERE cst_id = $1`, [req.params.id]);
    await db.query(`UPDATE automation_logs SET performed_by = NULL WHERE performed_by = $1`, [req.params.id]);
    await db.query(`UPDATE automation_settings SET updated_by = NULL WHERE updated_by = $1`, [req.params.id]);

    // Remove refresh tokens
    await db.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [req.params.id]);

    // Log action before deleting the user
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, details) VALUES ($1, 'delete', 'user', $2)`,
      [req.user.id, `Admin permanently deleted user: ${check[0].email}`]
    );

    // Hard delete
    await db.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);

    await db.query('COMMIT');

    res.json({ message: 'User permanently deleted.' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('[Admin Users DELETE]', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});


// PUT /api/admin/users/:id/reactivate
router.put('/:id/reactivate', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE users SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1
       RETURNING id, email`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, details) VALUES ($1, 'update', 'user', $2)`,
      [req.user.id, `Admin reactivated user: ${rows[0].email}`]
    );

    res.json({ message: 'User reactivated.' });
  } catch (err) {
    console.error('[Admin Users reactivate]', err);
    res.status(500).json({ error: 'Failed to reactivate user.' });
  }
});

// DELETE /api/admin/users/:id/permanent  (hard delete — permanently removes from DB)
router.delete('/:id/permanent', authenticateToken, adminOnly, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot permanently delete your own account.' });
  }
  try {
    // Only allow permanent deletion of deactivated users
    const { rows: check } = await db.query(
      `SELECT id, email, is_active FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (check.length === 0) return res.status(404).json({ error: 'User not found.' });
    if (check[0].is_active) {
      return res.status(400).json({ error: 'User must be deactivated before permanent deletion.' });
    }

    // Start transaction to safely handle referencing tables
    await db.query('BEGIN');

    // Update referencing columns to NULL to avoid constraint violation
    await db.query(`UPDATE renewals SET created_by = NULL WHERE created_by = $1`, [req.params.id]);
    await db.query(`UPDATE renewal_history SET performed_by = NULL WHERE performed_by = $1`, [req.params.id]);
    await db.query(`UPDATE activity_logs SET user_id = NULL WHERE user_id = $1`, [req.params.id]);
    await db.query(`UPDATE notifications SET user_id = NULL WHERE user_id = $1`, [req.params.id]);
    await db.query(`UPDATE visits SET cst_id = NULL WHERE cst_id = $1`, [req.params.id]);
    await db.query(`UPDATE automation_logs SET performed_by = NULL WHERE performed_by = $1`, [req.params.id]);
    await db.query(`UPDATE automation_settings SET updated_by = NULL WHERE updated_by = $1`, [req.params.id]);

    // Revoke all refresh tokens
    await db.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [req.params.id]);

    // Log the permanent deletion action (performed by the current admin)
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, details) VALUES ($1, 'delete', 'user', $2)`,
      [req.user.id, `Admin permanently deleted user: ${check[0].email}`]
    );

    // Permanently delete the user
    await db.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);

    // Commit transaction
    await db.query('COMMIT');

    res.json({ message: 'User permanently deleted.' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('[Admin Users PERMANENT DELETE]', err);
    res.status(500).json({ error: 'Failed to permanently delete user.' });
  }
});

export default router;
