import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sendCliqNotification } from '../services/cliqService.js';
import jwt from 'jsonwebtoken';

const router = Router();

const getEmailFlags = (renewalDate) => {
  if (!renewalDate) {
    return {
      day_30_sent: 'No', day_20_sent: 'No', day_15_sent: 'No',
      day_10_sent: 'No', day_5_sent: 'No', day_3_sent: 'No',
      sales_15_sent: 'No', sales_5_sent: 'No'
    };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rDate = new Date(renewalDate);
  rDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((rDate - today) / (1000 * 60 * 60 * 24));
  return {
    day_30_sent: daysLeft < 30 ? 'Yes' : 'No',
    day_20_sent: daysLeft < 20 ? 'Yes' : 'No',
    day_15_sent: daysLeft < 15 ? 'Yes' : 'No',
    day_10_sent: daysLeft < 10 ? 'Yes' : 'No',
    day_5_sent: daysLeft < 5 ? 'Yes' : 'No',
    day_3_sent: daysLeft < 3 ? 'Yes' : 'No',
    sales_15_sent: daysLeft < 15 ? 'Yes' : 'No',
  };
};

const notifyAdminAndFinance = async (title, message, type = 'info', link = null) => {
  try {
    await db.query(`
      INSERT INTO notifications (role, title, message, type, link)
      VALUES ('admin', $1, $2, $3, $4)
    `, [title, message, type, link]);
    await db.query(`
      INSERT INTO notifications (role, title, message, type, link)
      VALUES ('finance', $1, $2, $3, $4)
    `, [title, message, type, link]);
  } catch (err) {
    console.error('Error creating notifications:', err);
  }
};

// Get all renewals
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Auto-revert renewals marked as 'renewed' back to 'pending' when they have less than 30 days left
    await db.query(`
      UPDATE renewals 
      SET renewal_confirmation = 'pending' 
      WHERE renewal_confirmation = 'renewed' 
        AND renewal_date IS NOT NULL 
        AND (renewal_date - CURRENT_DATE) < 30
    `);

    // Auto-confirm renewals as 'renewed' when they have more than 30 days left
    await db.query(`
      UPDATE renewals 
      SET renewal_confirmation = 'renewed' 
      WHERE renewal_confirmation != 'renewed' 
        AND renewal_date IS NOT NULL 
        AND (renewal_date - CURRENT_DATE) > 30
    `);

    const { search, status, sort, order, page = 1, limit = 50, dateRange, valueRange, renewalConfirmation } = req.query;
    let query = 'SELECT * FROM renewals WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (client_name ILIKE $${paramIndex++} OR service ILIKE $${paramIndex++} OR owner ILIKE $${paramIndex++} OR unique_id ILIKE $${paramIndex++} OR client_email ILIKE $${paramIndex++})`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    if (status && status !== 'all') {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (renewalConfirmation && renewalConfirmation !== 'all') {
      query += ` AND (renewal_confirmation = $${paramIndex++} OR (renewal_confirmation IS NULL AND $${paramIndex - 1} = 'pending'))`;
      params.push(renewalConfirmation);
    }

    // Date range filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const today = now.toISOString().split('T')[0];
      if (dateRange === 'expired') {
        query += ` AND renewal_date < $${paramIndex++}`;
        params.push(today);
      } else if (dateRange === 'today') {
        query += ` AND renewal_date = $${paramIndex++}`;
        params.push(today);
      } else if (dateRange === 'next7') {
        const end = new Date(now); end.setDate(end.getDate() + 7);
        query += ` AND renewal_date >= $${paramIndex++} AND renewal_date <= $${paramIndex++}`;
        params.push(today, end.toISOString().split('T')[0]);
      } else if (dateRange === 'next30') {
        const end = new Date(now); end.setDate(end.getDate() + 30);
        query += ` AND renewal_date >= $${paramIndex++} AND renewal_date <= $${paramIndex++}`;
        params.push(today, end.toISOString().split('T')[0]);
      } else if (dateRange === 'next60') {
        const end = new Date(now); end.setDate(end.getDate() + 60);
        query += ` AND renewal_date >= $${paramIndex++} AND renewal_date <= $${paramIndex++}`;
        params.push(today, end.toISOString().split('T')[0]);
      } else if (dateRange === 'next90') {
        const end = new Date(now); end.setDate(end.getDate() + 90);
        query += ` AND renewal_date >= $${paramIndex++} AND renewal_date <= $${paramIndex++}`;
        params.push(today, end.toISOString().split('T')[0]);
      }
    }

    // Value range filter
    if (valueRange && valueRange !== 'all') {
      if (valueRange === 'under50k') {
        query += ` AND value < $${paramIndex++}`;
        params.push(50000);
      } else if (valueRange === '50k-1l') {
        query += ` AND value >= $${paramIndex++} AND value < $${paramIndex++}`;
        params.push(50000, 100000);
      } else if (valueRange === '1l-5l') {
        query += ` AND value >= $${paramIndex++} AND value < $${paramIndex++}`;
        params.push(100000, 500000);
      } else if (valueRange === 'above5l') {
        query += ` AND value >= $${paramIndex++}`;
        params.push(500000);
      }
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const { rows: countRows } = await db.query(countQuery, params);
    const total = parseInt(countRows[0].total);

    const validSorts = ['client_name', 'renewal_date', 'value', 'status', 'created_at', 'unique_id'];
    const sortCol = validSorts.includes(sort) ? sort : 'renewal_date';
    const sortOrder = order ? (order.toLowerCase() === 'desc' ? 'DESC' : 'ASC') : 'ASC';
    
    if (sortCol === 'renewal_date') {
      query += ` ORDER BY CASE WHEN status = 'Expired' THEN 1 ELSE 0 END ASC, ${sortCol} ${sortOrder} NULLS LAST`;
    } else {
      query += ` ORDER BY CASE WHEN status = 'Expired' THEN 1 ELSE 0 END ASC, ${sortCol} ${sortOrder}`;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), offset);

    const { rows: renewals } = await db.query(query, params);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enriched = renewals.map(r => {
      if (!r.renewal_date) {
        return { ...r, days_left: null, value: parseFloat(r.value) };
      }
      const renewalDate = new Date(r.renewal_date);
      renewalDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24));
      return { ...r, days_left: daysLeft, value: parseFloat(r.value) };
    });

    res.json({
      data: enriched,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Get renewals error:', err);
    res.status(500).json({ error: 'Failed to fetch renewals.' });
  }
});

// Get all record edits by CST (sales) and admin
router.get('/edits-history', authenticateToken, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const { rows } = await db.query(`
      SELECT rh.*, u.full_name as performed_by_name, u.role as performed_by_role,
             r.unique_id, r.client_name, r.service, r.value, r.renewal_date, r.status
      FROM renewal_history rh
      JOIN users u ON rh.performed_by = u.id
      LEFT JOIN renewals r ON rh.renewal_id = r.id
      ORDER BY rh.performed_at DESC
      LIMIT $1
    `, [parseInt(limit)]);
    res.json(rows);
  } catch (err) {
    console.error('Edits history error:', err);
    res.status(500).json({ error: 'Failed to fetch edits history.' });
  }
});

// Manual scheduler trigger - Admin only
router.post('/trigger-scheduler', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { processRenewals } = await import('../services/scheduler.js');
    processRenewals(); // fire async — don't await so HTTP returns immediately
    res.json({ message: 'Scheduler triggered. Check server logs for email send status.' });
  } catch (err) {
    console.error('Manual scheduler trigger error:', err);
    res.status(500).json({ error: 'Failed to trigger scheduler.' });
  }
});

// Get all deleted renewals (Trash) - Admin only
router.get('/trash', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { rows: trash } = await db.query(`
      SELECT * FROM trash_renewals 
      ORDER BY deleted_at DESC
    `);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enriched = trash.map(r => {
      if (!r.renewal_date) return { ...r, days_left: null, value: parseFloat(r.value) };
      const renewalDate = new Date(r.renewal_date);
      renewalDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24));
      return { ...r, days_left: daysLeft, value: parseFloat(r.value) };
    });

    res.json({ data: enriched });
  } catch (err) {
    console.error('Fetch trash error:', err);
    res.status(500).json({ error: 'Failed to fetch trash data.' });
  }
});

// Restore multiple renewals - Admin only
router.post('/trash/restore-batch', authenticateToken, requireRole('admin'), async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No IDs provided for restore.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Get all records to restore
    const { rows: renewals } = await client.query(
      'SELECT * FROM trash_renewals WHERE id = ANY($1)',
      [ids]
    );

    if (renewals.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No deleted renewals found for provided IDs.' });
    }

    for (const renewal of renewals) {
      // Insert back into renewals with original ID
      await client.query(`
        INSERT INTO renewals (
          id, unique_id, client_name, service, renewal_date, value, owner, client_email, sales_email, status, 
          locked, follow_up_status, follow_up_remarks, day_30_sent, day_20_sent, day_15_sent, day_10_sent, 
          day_5_sent, day_3_sent, sales_15_sent, sales_5_sent, created_by, created_at, updated_at, 
          edit_status, edit_reason, renewal_confirmation, contact_number, reference_id, invoice_status,
          invoice_number, invoice_value, invoice_sent_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
          $11, $12, $13, $14, $15, $16, $17, 
          $18, $19, $20, $21, $22, $23, $24, 
          $25, $26, $27, $28, $29, $30, $31, $32, $33
        )
      `, [
        renewal.original_id, renewal.unique_id, renewal.client_name, renewal.service, renewal.renewal_date, renewal.value, renewal.owner, renewal.client_email, renewal.sales_email, renewal.status,
        renewal.locked, renewal.follow_up_status, renewal.follow_up_remarks, renewal.day_30_sent, renewal.day_20_sent, renewal.day_15_sent, renewal.day_10_sent,
        renewal.day_5_sent, renewal.day_3_sent, renewal.sales_15_sent, renewal.sales_5_sent, renewal.created_by, renewal.created_at, renewal.updated_at,
        renewal.edit_status, renewal.edit_reason, renewal.renewal_confirmation, renewal.contact_number, renewal.reference_id, renewal.invoice_status,
        renewal.invoice_number, renewal.invoice_value, renewal.invoice_sent_date
      ]);

      // Remove from trash_renewals
      await client.query('DELETE FROM trash_renewals WHERE id = $1', [renewal.id]);

      await client.query(`
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
        VALUES ($1, 'restore', 'renewal', $2, $3)
      `, [req.user.id, renewal.unique_id, `Restored renewal (bulk): ${renewal.client_name} - ${renewal.service}`]);
    }

    // Update ID sequence to prevent serial collision
    await client.query(`SELECT setval('renewals_id_seq', COALESCE((SELECT MAX(id) FROM renewals), 1), true)`);

    await client.query('COMMIT');
    res.json({ message: `${renewals.length} renewals restored successfully.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Batch restore error:', err);
    res.status(500).json({ error: 'Failed to restore renewals in batch.' });
  } finally {
    client.release();
  }
});

// Permanent delete multiple renewals - Admin only
router.post('/trash/delete-batch', authenticateToken, requireRole('admin'), async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No IDs provided for deletion.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Get unique_ids/names for activity logs before deleting
    const { rows: renewals } = await client.query(
      'SELECT unique_id, client_name, service FROM trash_renewals WHERE id = ANY($1)',
      [ids]
    );

    if (renewals.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No deleted renewals found for provided IDs.' });
    }

    // Delete permanently from trash_renewals
    await client.query('DELETE FROM trash_renewals WHERE id = ANY($1)', [ids]);

    for (const renewal of renewals) {
      await client.query(`
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
        VALUES ($1, 'permanent_delete', 'renewal', $2, $3)
      `, [req.user.id, renewal.unique_id, `Permanently deleted renewal (bulk): ${renewal.client_name} - ${renewal.service}`]);
    }

    await client.query('COMMIT');
    res.json({ message: `${renewals.length} renewals permanently deleted.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Batch delete error:', err);
    res.status(500).json({ error: 'Failed to permanently delete renewals in batch.' });
  } finally {
    client.release();
  }
});

// Update invoice status - Finance and Admin
router.patch('/:id/invoice', authenticateToken, requireRole('finance', 'admin'), async (req, res) => {
  const { invoice_status, invoice_number, invoice_value, invoice_sent_date } = req.body;
  if (!['Sent', 'Not'].includes(invoice_status)) {
    return res.status(400).json({ error: 'Invalid invoice_status. Must be "Sent" or "Not".' });
  }
  try {
    let query, params;
    if (invoice_status === 'Sent') {
      if (!invoice_number || invoice_value === undefined || invoice_value === null || !invoice_sent_date) {
        return res.status(400).json({ error: 'Invoice Number, Invoice Value, and Invoice Sent Date are required.' });
      }
      query = `
        UPDATE renewals 
        SET invoice_status = $1, 
            invoice_number = $2, 
            invoice_value = $3, 
            invoice_sent_date = $4, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = $5 
        RETURNING *
      `;
      params = [invoice_status, invoice_number, parseFloat(invoice_value), invoice_sent_date, req.params.id];
    } else {
      query = `
        UPDATE renewals 
        SET invoice_status = $1, 
            invoice_number = NULL, 
            invoice_value = NULL, 
            invoice_sent_date = NULL, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2 
        RETURNING *
      `;
      params = [invoice_status, req.params.id];
    }

    const { rows } = await db.query(query, params);
    if (rows.length === 0) return res.status(404).json({ error: 'Renewal not found.' });

    const r = rows[0];
    const message = invoice_status === 'Sent'
      ? `Invoice details updated for client "${r.client_name}" (${r.service}): Invoice #${invoice_number}, Value: ₹${parseFloat(invoice_value).toLocaleString('en-IN')}.`
      : `Invoice marked as not sent for client "${r.client_name}" (${r.service}).`;
    await notifyAdminAndFinance('Invoice Updated', message, 'info', `/renewals?search=${r.unique_id}`);

    res.json(rows[0]);
  } catch (err) {
    console.error('Invoice status update error:', err);
    res.status(500).json({ error: 'Failed to update invoice status.' });
  }
});

// Restore renewal - Admin only
router.put('/:id/restore', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM trash_renewals WHERE id = $1', [req.params.id]);
    const renewal = rows[0];
    if (!renewal) return res.status(404).json({ error: 'Deleted renewal not found.' });

    // Insert back into renewals with original ID
    await db.query(`
      INSERT INTO renewals (
        id, unique_id, client_name, service, renewal_date, value, owner, client_email, sales_email, status, 
        locked, follow_up_status, follow_up_remarks, day_30_sent, day_20_sent, day_15_sent, day_10_sent, 
        day_5_sent, day_3_sent, sales_15_sent, sales_5_sent, created_by, created_at, updated_at, 
        edit_status, edit_reason, renewal_confirmation, contact_number, reference_id, invoice_status,
        invoice_number, invoice_value, invoice_sent_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
        $11, $12, $13, $14, $15, $16, $17, 
        $18, $19, $20, $21, $22, $23, $24, 
        $25, $26, $27, $28, $29, $30, $31, $32, $33
      )
    `, [
      renewal.original_id, renewal.unique_id, renewal.client_name, renewal.service, renewal.renewal_date, renewal.value, renewal.owner, renewal.client_email, renewal.sales_email, renewal.status,
      renewal.locked, renewal.follow_up_status, renewal.follow_up_remarks, renewal.day_30_sent, renewal.day_20_sent, renewal.day_15_sent, renewal.day_10_sent,
      renewal.day_5_sent, renewal.day_3_sent, renewal.sales_15_sent, renewal.sales_5_sent, renewal.created_by, renewal.created_at, renewal.updated_at,
      renewal.edit_status, renewal.edit_reason, renewal.renewal_confirmation, renewal.contact_number, renewal.reference_id, renewal.invoice_status,
      renewal.invoice_number, renewal.invoice_value, renewal.invoice_sent_date
    ]);

    // Update ID sequence to prevent serial collision
    await db.query(`SELECT setval('renewals_id_seq', COALESCE((SELECT MAX(id) FROM renewals), 1), true)`);

    // Remove from trash_renewals
    await db.query('DELETE FROM trash_renewals WHERE id = $1', [req.params.id]);

    await db.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
      VALUES ($1, 'restore', 'renewal', $2, $3)
    `, [req.user.id, renewal.unique_id, `Restored renewal: ${renewal.client_name} - ${renewal.service}`]);

    res.json({ message: 'Renewal restored successfully.' });
  } catch (err) {
    console.error('Restore renewal error:', err);
    res.status(500).json({ error: 'Failed to restore renewal.' });
  }
});

// Permanent delete renewal - Admin only
router.delete('/:id/permanent', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM trash_renewals WHERE id = $1', [req.params.id]);
    const renewal = rows[0];
    if (!renewal) return res.status(404).json({ error: 'Deleted renewal not found.' });

    // Since it was already deleted from renewals, related history/logs were cascade-deleted.
    // We just delete from trash_renewals.
    await db.query('DELETE FROM trash_renewals WHERE id = $1', [req.params.id]);

    await db.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
      VALUES ($1, 'delete_permanent', 'renewal', $2, $3)
    `, [req.user.id, renewal.unique_id, `Permanently deleted renewal: ${renewal.client_name} - ${renewal.service}`]);

    res.json({ message: 'Renewal permanently deleted.' });
  } catch (err) {
    console.error('Permanent delete error:', err);
    res.status(500).json({ error: 'Failed to permanently delete renewal.' });
  }
});

// Get single renewal
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    // Auto-revert if renewed but less than 30 days left
    await db.query(`
      UPDATE renewals 
      SET renewal_confirmation = 'pending' 
      WHERE id = $1
        AND renewal_confirmation = 'renewed' 
        AND renewal_date IS NOT NULL 
        AND (renewal_date - CURRENT_DATE) < 30
    `, [req.params.id]);

    // Auto-confirm if more than 30 days left
    await db.query(`
      UPDATE renewals 
      SET renewal_confirmation = 'renewed' 
      WHERE id = $1
        AND renewal_confirmation != 'renewed' 
        AND renewal_date IS NOT NULL 
        AND (renewal_date - CURRENT_DATE) > 30
    `, [req.params.id]);

    const { rows } = await db.query('SELECT * FROM renewals WHERE id = $1', [req.params.id]);
    const renewal = rows[0];
    if (!renewal) return res.status(404).json({ error: 'Renewal not found.' });

    if (!renewal.renewal_date) {
      renewal.days_left = null;
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const renewalDate = new Date(renewal.renewal_date);
      renewalDate.setHours(0, 0, 0, 0);
      renewal.days_left = Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24));
    }
    renewal.value = parseFloat(renewal.value);

    res.json(renewal);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch renewal.' });
  }
});

// Create renewal
router.post('/', authenticateToken, requireRole('sales', 'admin'), async (req, res) => {
  try {
    const { client_name, service, renewal_date, value, owner, client_email, sales_email, contact_number, reference_id, plan_period } = req.body;

    if (!client_name || !service || !renewal_date || !owner || !client_email || !contact_number || !reference_id) {
      return res.status(400).json({ error: 'Client Name, Service, Renewal Date, Contact Person, Client Email, Contact Number, and Reference ID are required.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rDate = new Date(renewal_date);
    rDate.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((rDate - today) / (1000 * 60 * 60 * 24));
    const computedStatus = daysLeft < 0 ? 'Expired' : daysLeft <= 30 ? 'Pending Renewal' : 'Active';
    const computedRenewalConfirmation = daysLeft > 30 ? 'renewed' : 'pending';

    // Generate sequential RMT ID (e.g. RMT-01, RMT-02...)
    const { rows: lastRecord } = await db.query(
      "SELECT unique_id FROM renewals WHERE unique_id LIKE 'RMT-%' ORDER BY id DESC LIMIT 1"
    );
    let nextNum = 1;
    if (lastRecord.length > 0) {
      const match = lastRecord[0].unique_id.match(/RMT-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const padNum = String(nextNum).padStart(2, '0');
    const unique_id = `RMT-${padNum}`;

    const flags = getEmailFlags(renewal_date);
    const { rows: result } = await db.query(`
      INSERT INTO renewals (
        unique_id, client_name, service, renewal_date, value, owner, client_email, sales_email, contact_number, reference_id, status, locked, created_by,
        day_30_sent, day_20_sent, day_15_sent, day_10_sent, day_5_sent, day_3_sent, sales_15_sent, sales_5_sent, plan_period, renewal_confirmation
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING id
    `, [
      unique_id, client_name, service, renewal_date, value || 0, owner, client_email, sales_email || '', contact_number || '', reference_id || '', computedStatus, req.user.id,
      flags.day_30_sent, flags.day_20_sent, flags.day_15_sent, flags.day_10_sent, flags.day_5_sent, flags.day_3_sent, flags.sales_15_sent, flags.sales_5_sent,
      plan_period || 'yearly_plan', computedRenewalConfirmation
    ]);

    const newId = result[0].id;

    await db.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
      VALUES ($1, 'create', 'renewal', $2, $3)
    `, [req.user.id, unique_id, `Created renewal for ${client_name} - ${service}`]);

    await db.query(`
      INSERT INTO renewal_history (renewal_id, action, new_data, performed_by)
      VALUES ($1, 'created', $2, $3)
    `, [newId, JSON.stringify({ client_name, service, renewal_date, value, owner, client_email, sales_email, contact_number, reference_id, status: computedStatus, plan_period: plan_period || 'yearly_plan' }), req.user.id]);

    await db.query(`
      INSERT INTO notifications (role, title, message, type)
      VALUES ('sales', 'New Renewal Added', $1, 'info')
    `, [`New renewal created for ${client_name} (${service}). Renewal date: ${renewal_date}`]);

    await notifyAdminAndFinance(
      'New Renewal Added',
      `New renewal created for ${client_name} (${service}). Renewal date: ${renewal_date}`,
      'info',
      `/renewals?search=${unique_id}`
    );

    await sendCliqNotification(`🆕 *New Renewal Added*\n*Client ID:* ${unique_id}\n*Client:* ${client_name}\n*Service:* ${service}\n*Renewal Date:* ${new Date(renewal_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}\n*Value:* ₹${parseFloat(value).toLocaleString('en-IN')}`);

    const { rows: createdRows } = await db.query('SELECT * FROM renewals WHERE id = $1', [newId]);
    const created = createdRows[0];
    created.value = parseFloat(created.value);
    res.status(201).json(created);
  } catch (err) {
    console.error('Create renewal error:', err);
    res.status(500).json({ error: 'Failed to create renewal.' });
  }
});

// Bulk Import renewals from CSV JSON
router.post('/import', authenticateToken, requireRole('admin'), async (req, res) => {
  const client = await db.connect();
  try {
    const { records } = req.body;
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'No records provided for import.' });
    }

    await client.query('BEGIN');

    // Get current max RMT ID number
    const { rows: lastRecord } = await client.query(
      "SELECT unique_id FROM renewals WHERE unique_id LIKE 'RMT-%' ORDER BY id DESC LIMIT 1"
    );
    let nextNum = 1;
    if (lastRecord.length > 0) {
      const match = lastRecord[0].unique_id.match(/RMT-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    const importedIds = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const record of records) {
      const {
        client_name,
        service,
        renewal_date,
        value,
        owner,
        client_email,
        sales_email,
        contact_number,
        reference_id,
        renewal_confirmation
      } = record;

      // Validate required fields
      if (!client_name || !service || !renewal_date || !owner || !client_email || !contact_number || !reference_id) {
        throw new Error(`Row validation failed: Client Name, Service, Renewal Date, Contact Person, Client Email, Contact Number, and Reference ID are required.`);
      }

      // Parse date and calculate status
      const rDate = new Date(renewal_date);
      if (isNaN(rDate.getTime())) {
        throw new Error(`Invalid date format for client ${client_name}: ${renewal_date}`);
      }
      rDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((rDate - today) / (1000 * 60 * 60 * 24));
      
      let computedStatus = daysLeft < 0 ? 'Expired' : daysLeft <= 30 ? 'Pending Renewal' : 'Active';
      let insertValue = parseFloat(value) || 0;
      let insertDate = renewal_date;
      const confVal = renewal_confirmation || 'pending';

      if (confVal === 'service_discontinued') {
        computedStatus = '-';
        insertValue = 0;
        insertDate = null;
      }

      const padNum = String(nextNum).padStart(2, '0');
      const unique_id = `RMT-${padNum}`;
      nextNum++;

      const flags = getEmailFlags(insertDate);
      const { rows: result } = await client.query(`
        INSERT INTO renewals (
          unique_id, client_name, service, renewal_date, value, owner, client_email, sales_email, contact_number, reference_id, status, renewal_confirmation, locked, created_by,
          day_30_sent, day_20_sent, day_15_sent, day_10_sent, day_5_sent, day_3_sent, sales_15_sent, sales_5_sent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING id
      `, [
        unique_id, client_name, service, insertDate, insertValue, owner, client_email, sales_email || '', contact_number || '', reference_id || '', computedStatus, confVal, req.user.id,
        flags.day_30_sent, flags.day_20_sent, flags.day_15_sent, flags.day_10_sent, flags.day_5_sent, flags.day_3_sent, flags.sales_15_sent, flags.sales_5_sent
      ]);

      const newId = result[0].id;
      importedIds.push(newId);

      await client.query(`
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
        VALUES ($1, 'create', 'renewal', $2, $3)
      `, [req.user.id, unique_id, `Created renewal via CSV import for ${client_name} - ${service}`]);

      await client.query(`
        INSERT INTO renewal_history (renewal_id, action, new_data, performed_by)
        VALUES ($1, 'created', $2, $3)
      `, [newId, JSON.stringify({ client_name, service, renewal_date: insertDate, value: insertValue, owner, client_email, sales_email, contact_number, reference_id, status: computedStatus, renewal_confirmation: confVal, imported: true }), req.user.id]);
    }

    await client.query('COMMIT');
    res.json({ message: `Successfully imported ${importedIds.length} records.`, count: importedIds.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('CSV import error:', err);
    res.status(500).json({ error: err.message || 'Failed to import CSV records.' });
  } finally {
    client.release();
  }
});

// Renew client
router.put('/:id/renew', authenticateToken, requireRole('finance', 'admin'), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM renewals WHERE id = $1', [req.params.id]);
    const renewal = rows[0];
    if (!renewal) return res.status(404).json({ error: 'Renewal not found.' });

    const { renewal_date, service, value, status } = req.body;

    if (!renewal_date) {
      return res.status(400).json({ error: 'New renewal date is required.' });
    }

    const previousData = JSON.stringify({
      renewal_date: renewal.renewal_date,
      service: renewal.service,
      value: renewal.value,
      status: renewal.status,
    });

    const flags = getEmailFlags(renewal_date);
    await db.query(`
      UPDATE renewals SET
        renewal_date = $1,
        service = COALESCE($2, service),
        value = COALESCE($3, value),
        status = COALESCE($4, 'Active'),
        day_30_sent = $5,
        day_20_sent = $6,
        day_15_sent = $7,
        day_10_sent = $8,
        day_5_sent = $9,
        day_3_sent = $10,
        sales_15_sent = $11,
        sales_5_sent = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
    `, [
      renewal_date, service || null, value || null, status || null,
      flags.day_30_sent, flags.day_20_sent, flags.day_15_sent, flags.day_10_sent, flags.day_5_sent, flags.day_3_sent, flags.sales_15_sent, flags.sales_5_sent,
      req.params.id
    ]);

    await db.query(`
      INSERT INTO renewal_history (renewal_id, action, previous_data, new_data, performed_by)
      VALUES ($1, 'renewed', $2, $3, $4)
    `, [
      req.params.id,
      previousData,
      JSON.stringify({ renewal_date, service: service || renewal.service, value: value || renewal.value, status: status || 'Active' }),
      req.user.id
    ]);

    await db.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
      VALUES ($1, 'renew', 'renewal', $2, $3)
    `, [req.user.id, renewal.unique_id, `Renewed ${renewal.client_name} - ${renewal.service}. New date: ${renewal_date}`]);

    await db.query(`
      INSERT INTO notifications (role, title, message, type)
      VALUES ('sales', 'Client Renewed', $1, 'success')
    `, [`${renewal.client_name} has renewed ${renewal.service}. New renewal date: ${renewal_date}`]);

    await sendCliqNotification(`✅ *Client Renewed*\n*Client ID:* ${renewal.unique_id}\n*Client:* ${renewal.client_name}\n*Service:* ${renewal.service}\n*New Renewal Date:* ${new Date(renewal_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`);

    const { rows: updatedRows } = await db.query('SELECT * FROM renewals WHERE id = $1', [req.params.id]);
    res.json(updatedRows[0]);
  } catch (err) {
    console.error('Renew error:', err);
    res.status(500).json({ error: 'Failed to renew client.' });
  }
});

// Update follow-up
router.put('/:id/follow-up', authenticateToken, requireRole('sales', 'admin'), async (req, res) => {
  try {
    const { follow_up_status, follow_up_remarks } = req.body;
    const { rows } = await db.query('SELECT * FROM renewals WHERE id = $1', [req.params.id]);
    const renewal = rows[0];
    if (!renewal) return res.status(404).json({ error: 'Renewal not found.' });

    await db.query(`
      UPDATE renewals SET follow_up_status = $1, follow_up_remarks = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3
    `, [follow_up_status || '', follow_up_remarks || '', req.params.id]);

    await db.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
      VALUES ($1, 'follow_up', 'renewal', $2, $3)
    `, [req.user.id, renewal.unique_id, `Updated follow-up for ${renewal.client_name}: ${follow_up_status}`]);

    const { rows: updatedRows } = await db.query('SELECT * FROM renewals WHERE id = $1', [req.params.id]);
    res.json(updatedRows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update follow-up.' });
  }
});

// Edit renewal basic details
router.put('/:id', authenticateToken, requireRole('finance', 'sales', 'admin'), async (req, res) => {
  try {
    const { client_name, service, renewal_date, value, owner, client_email, sales_email, contact_number, reference_id, plan_period } = req.body;
    const { rows } = await db.query('SELECT * FROM renewals WHERE id = $1', [req.params.id]);
    const renewal = rows[0];
    
    if (!renewal) return res.status(404).json({ error: 'Renewal not found.' });

    if (!client_name || !service || !owner || !client_email || !contact_number || !reference_id) {
      return res.status(400).json({ error: 'Client Name, Service, Contact Person, Client Email, Contact Number, and Reference ID are required.' });
    }

    const isDiscontinued = renewal.status === '-' || req.body.status === '-';
    if (!isDiscontinued && (!renewal_date || value === undefined || value === null)) {
      return res.status(400).json({ error: 'Renewal Date and Contract Value are required.' });
    }

    let computedStatus = '-';
    let computedRenewalDate = renewal_date || null;
    let computedRenewalConfirmation = renewal.renewal_confirmation;
    if (computedRenewalDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const rDate = new Date(computedRenewalDate);
      rDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((rDate - today) / (1000 * 60 * 60 * 24));
      computedStatus = daysLeft < 0 ? 'Expired' : daysLeft <= 30 ? 'Pending Renewal' : 'Active';
      
      if (daysLeft > 30) {
        computedRenewalConfirmation = 'renewed';
      } else if (daysLeft <= 30 && computedRenewalConfirmation === 'renewed') {
        computedRenewalConfirmation = 'pending';
      }
    }

    const previousData = JSON.stringify({
      client_name: renewal.client_name,
      service: renewal.service,
      renewal_date: renewal.renewal_date,
      value: renewal.value,
      owner: renewal.owner,
      client_email: renewal.client_email,
      sales_email: renewal.sales_email,
      contact_number: renewal.contact_number,
      reference_id: renewal.reference_id,
      status: renewal.status,
      plan_period: renewal.plan_period
    });

    // Check if renewal_date has changed
    const oldDate = renewal.renewal_date ? new Date(renewal.renewal_date).toISOString().split('T')[0] : null;
    const newDate = computedRenewalDate ? new Date(computedRenewalDate).toISOString().split('T')[0] : null;
    const dateChanged = oldDate !== newDate;

    await db.query(`
      UPDATE renewals SET 
        client_name = $1, service = $2, renewal_date = $3, value = $4, 
        owner = $5, client_email = $6, sales_email = $7, contact_number = $8, reference_id = $9, status = $10, edit_status = NULL, edit_reason = $11, plan_period = $12, renewal_confirmation = $13, updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
    `, [client_name, service, computedRenewalDate, value || 0, owner, client_email, sales_email || '', contact_number || '', reference_id || '', computedStatus, req.body.reason || null, plan_period || 'yearly_plan', computedRenewalConfirmation, req.params.id]);

    // If renewal date changed, recalculate email flags
    if (dateChanged) {
      if (!computedRenewalDate) {
        // Reset all email flags if date becomes null
        await db.query(`
          UPDATE renewals SET 
            day_30_sent = 'No', day_20_sent = 'No', day_15_sent = 'No',
            day_10_sent = 'No', day_5_sent = 'No', day_3_sent = 'No'
          WHERE id = $1
        `, [req.params.id]);
      } else {
        const flags = getEmailFlags(computedRenewalDate);

        await db.query(`
          UPDATE renewals SET 
            day_30_sent = $1, day_20_sent = $2, day_15_sent = $3,
            day_10_sent = $4, day_5_sent = $5, day_3_sent = $6,
            sales_15_sent = $7, sales_5_sent = $8
          WHERE id = $9
        `, [
          flags.day_30_sent, flags.day_20_sent, flags.day_15_sent, 
          flags.day_10_sent, flags.day_5_sent, flags.day_3_sent,
          flags.sales_15_sent, flags.sales_5_sent,
          req.params.id
        ]);

        const daysLeft = computedRenewalDate ? Math.ceil((new Date(computedRenewalDate).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)) : 'N/A';
        console.log(`📅 Renewal date changed for ${client_name}: ${oldDate} → ${newDate} (${daysLeft} days left). Email flags recalculated.`);
      }
    }

    await db.query(`
      INSERT INTO renewal_history (renewal_id, action, previous_data, new_data, performed_by)
      VALUES ($1, 'edited', $2, $3, $4)
    `, [
      req.params.id, 
      previousData, 
      JSON.stringify({ client_name, service, renewal_date, value, owner, client_email, sales_email, contact_number, reference_id, status: computedStatus, reason: req.body.reason, plan_period }), 
      req.user.id
    ]);

    await db.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
      VALUES ($1, 'edit', 'renewal', $2, $3)
    `, [req.user.id, renewal.unique_id, `Edited renewal details for ${client_name}. Reason: ${req.body.reason || 'Not provided'}`]);

    const editActorRole = req.user.role ? (req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)) : 'Unknown';
    await notifyAdminAndFinance(
      'Renewal Details Updated',
      `Renewal details updated for client "${client_name}" (${service}) by ${editActorRole.toLowerCase()} team. Reason: ${req.body.reason || 'Not provided'}.`,
      'info',
      `/renewals?search=${renewal.unique_id}`
    );

    // Send Zoho Cliq notifications to both sales and finance channels
    try {
      const formattedDate = computedRenewalDate 
        ? new Date(computedRenewalDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '-';
      const formattedValue = value !== undefined && value !== null
        ? `₹${parseFloat(value).toLocaleString('en-IN')}`
        : '-';
      const actorRole = req.user.role ? (req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)) : 'Unknown';

      const cliqMessage = `📝 *Renewal Details Updated*\n` +
        `*Client ID:* ${renewal.unique_id}\n` +
        `*Client:* ${client_name}\n` +
        `*Service:* ${service}\n` +
        `*Renewal Date:* ${formattedDate}\n` +
        `*Value:* ${formattedValue}\n` +
        `*Updated By:* ${req.user.fullName || 'User'} (${actorRole} Team)\n` +
        `*Reason for Update:* ${req.body.reason || 'Not provided'}`;

      await sendCliqNotification(cliqMessage, false); // Finance channel
      await sendCliqNotification(cliqMessage, true);  // Sales channel
    } catch (cliqErr) {
      console.error('Failed to send edit cliq notifications:', cliqErr);
    }

    // If date changed, trigger scheduler to send emails for the new date immediately
    if (dateChanged) {
      const { processRenewals } = await import('../services/scheduler.js');
      setTimeout(() => processRenewals(), 1000);
    }

    const { rows: updatedRows } = await db.query('SELECT * FROM renewals WHERE id = $1', [req.params.id]);
    res.json(updatedRows[0]);
  } catch (err) {
    console.error('Edit error:', err);
    res.status(500).json({ error: 'Failed to edit renewal.' });
  }
});

// Delete renewal (move to trash table)
router.delete('/:id', authenticateToken, requireRole('finance', 'admin'), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM renewals WHERE id = $1', [req.params.id]);
    const renewal = rows[0];
    if (!renewal) return res.status(404).json({ error: 'Renewal not found.' });

    // Move to trash_renewals table
    await db.query(`
      INSERT INTO trash_renewals (
        original_id, unique_id, client_name, service, renewal_date, value, owner, client_email, sales_email, status, 
        locked, follow_up_status, follow_up_remarks, day_30_sent, day_20_sent, day_15_sent, day_10_sent, 
        day_5_sent, day_3_sent, sales_15_sent, sales_5_sent, created_by, created_at, updated_at, 
        edit_status, edit_reason, renewal_confirmation, contact_number, reference_id, invoice_status,
        invoice_number, invoice_value, invoice_sent_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
        $11, $12, $13, $14, $15, $16, $17, 
        $18, $19, $20, $21, $22, $23, $24, 
        $25, $26, $27, $28, $29, $30, $31, $32, $33
      )
    `, [
      renewal.id, renewal.unique_id, renewal.client_name, renewal.service, renewal.renewal_date, renewal.value, renewal.owner, renewal.client_email, renewal.sales_email, renewal.status,
      renewal.locked, renewal.follow_up_status, renewal.follow_up_remarks, renewal.day_30_sent, renewal.day_20_sent, renewal.day_15_sent, renewal.day_10_sent,
      renewal.day_5_sent, renewal.day_3_sent, renewal.sales_15_sent, renewal.sales_5_sent, renewal.created_by, renewal.created_at, renewal.updated_at,
      renewal.edit_status, renewal.edit_reason, renewal.renewal_confirmation, renewal.contact_number, renewal.reference_id, renewal.invoice_status,
      renewal.invoice_number, renewal.invoice_value, renewal.invoice_sent_date
    ]);

    // Delete from renewals table
    await db.query('DELETE FROM renewals WHERE id = $1', [req.params.id]);

    await db.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
      VALUES ($1, 'delete_soft', 'renewal', $2, $3)
    `, [req.user.id, renewal.unique_id, `Moved renewal to trash: ${renewal.client_name} - ${renewal.service}`]);

    await notifyAdminAndFinance(
      'Renewal Deleted',
      `Renewal for client "${renewal.client_name}" (${renewal.service}) has been moved to trash by ${req.user.role}.`,
      'warning',
      '/trash'
    );

    res.json({ message: 'Renewal moved to trash successfully.' });
  } catch (err) {
    console.error('Delete renewal error:', err);
    res.status(500).json({ error: 'Failed to delete renewal.' });
  }
});

// Get renewal history
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const { rows: history } = await db.query(`
      SELECT rh.*, u.full_name as performed_by_name
      FROM renewal_history rh
      LEFT JOIN users u ON rh.performed_by = u.id
      WHERE rh.renewal_id = $1
      ORDER BY rh.performed_at DESC
    `, [req.params.id]);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

// Request Edit
router.put('/:id/request-edit', authenticateToken, requireRole('sales'), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM renewals WHERE id = $1', [req.params.id]);
    const renewal = rows[0];
    if (!renewal) return res.status(404).json({ error: 'Renewal not found.' });

    await db.query('UPDATE renewals SET edit_status = $1 WHERE id = $2', ['requested', req.params.id]);
    
    await db.query(`
      INSERT INTO notifications (role, title, message, type)
      VALUES ('admin', 'Edit Access Requested', $1, 'info')
    `, [`CST team requested edit access for ${renewal.client_name}`]);

    // Send email notification to all admins with a direct approval link
    const { sendEmail } = await import('../services/emailService.js');
    const { rows: adminUsers } = await db.query("SELECT email FROM users WHERE role = 'admin'");
    
    // Generate direct email approval token valid for 7 days
    const approveToken = jwt.sign(
      { renewalId: renewal.id, action: 'approve-edit' },
      process.env.JWT_SECRET || 'rms-default-secret-key',
      { expiresIn: '7d' }
    );
    const approveUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/api/renewals/${renewal.id}/approve-edit-email?token=${approveToken}`;

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:36px 40px;text-align:center;">
                <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">🔒 Edit Access Requested</h1>
                <p style="color:#ffffffcc;margin:8px 0 0;font-size:14px;">CST Team Request</p>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 20px;">Dear <strong>Admin</strong>,</p>
                <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
                  The CST team has requested edit access for the following client:
                </p>
                <div style="background:#f8fafc;border-left:4px solid #f59e0b;border-radius:8px;padding:20px;margin:0 0 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Client ID</td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${renewal.unique_id}</td></tr>
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Client</td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${renewal.client_name}</td></tr>
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Service</td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${renewal.service}</td></tr>
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Requested By</td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">CST Team</td></tr>
                  </table>
                </div>
                <div style="text-align:center;margin:30px 0 10px;">
                  <a href="${approveUrl}" style="background-color:#f59e0b;color:#ffffff;padding:12px 28px;text-decoration:none;font-weight:700;border-radius:8px;display:inline-block;box-shadow:0 4px 12px rgba(245,158,11,0.2);">Approve Edit Request</a>
                </div>
                <p style="color:#94a3b8;font-size:13px;margin:32px 0 0;padding-top:20px;border-top:1px solid #e2e8f0;">
                  Regards,<br><strong style="color:#1e293b;">MarsLab Renewals</strong>
                </p>
              </td>
            </tr>
            <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;"><p style="color:#94a3b8;font-size:12px;margin:0;">Powered by MarsLab Renewal Management System</p></td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;

    for (const adminUser of adminUsers) {
      await sendEmail({
        to: adminUser.email,
        subject: `🔒 Edit Access Requested: ${renewal.client_name} — ${renewal.service}`,
        html: emailHtml,
      });
    }

    res.json({ message: 'Edit request sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to request edit.' });
  }
});

// Direct email approval endpoint (no login required, token protected)
router.get('/:id/approve-edit-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send('<h1>Error</h1><p>Missing verification token.</p>');
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'rms-default-secret-key');
    } catch (jwtErr) {
      return res.status(401).send('<h1>Invalid or Expired Link</h1><p>The approval link is invalid or has expired.</p>');
    }

    if (decoded.renewalId !== parseInt(req.params.id) || decoded.action !== 'approve-edit') {
      return res.status(400).send('<h1>Invalid Request</h1><p>The approval token does not match this renewal request.</p>');
    }

    const { rows } = await db.query('SELECT * FROM renewals WHERE id = $1', [req.params.id]);
    const renewal = rows[0];
    if (!renewal) {
      return res.status(404).send('<h1>Not Found</h1><p>Renewal not found.</p>');
    }

    if (renewal.edit_status === 'approved') {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Already Approved</title></head>
        <body style="font-family:'Segoe UI',Arial,sans-serif;text-align:center;padding:50px;background-color:#f0f4f8;">
          <div style="background:white;padding:40px;border-radius:12px;max-width:500px;margin:0 auto;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <h1 style="color:#10b981;margin-top:0;">✅ Already Approved</h1>
            <p style="color:#475569;font-size:16px;">This edit request has already been approved.</p>
            <p style="color:#94a3b8;font-size:14px;margin-top:20px;">You can close this tab now.</p>
          </div>
        </body>
        </html>
      `);
    }

    await db.query("UPDATE renewals SET edit_status = 'approved' WHERE id = $1", [req.params.id]);

    await db.query(`
      INSERT INTO notifications (role, title, message, type)
      VALUES ('sales', 'Edit Access Approved', $1, 'success')
    `, [`Admin approved edit access for ${renewal.client_name}`]);

    // Send email notification to sales team
    const { sendEmail } = await import('../services/emailService.js');
    const { rows: salesUsers } = await db.query("SELECT email FROM users WHERE role = 'sales'");
    
    const salesEmails = new Set();
    for (const u of salesUsers) {
      if (u.email) salesEmails.add(u.email);
    }

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#10b981,#059669);padding:36px 40px;text-align:center;">
                <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">🔓 Edit Access Approved</h1>
                <p style="color:#ffffffcc;margin:8px 0 0;font-size:14px;">Renewal System Update</p>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 20px;">Dear <strong>CST Team</strong>,</p>
                <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
                  The admin has approved your edit request for the following client. You now have access to edit the details of this renewal:
                </p>
                <div style="background:#f8fafc;border-left:4px solid #10b981;border-radius:8px;padding:20px;margin:0 0 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Client ID</td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${renewal.unique_id}</td></tr>
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Client</td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${renewal.client_name}</td></tr>
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Service</td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${renewal.service}</td></tr>
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Status</td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">Approved for Edit</td></tr>
                  </table>
                </div>
                <div style="text-align:center;margin:30px 0 10px;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/renewals?status=all" style="background-color:#10b981;color:#ffffff;padding:12px 28px;text-decoration:none;font-weight:700;border-radius:8px;display:inline-block;box-shadow:0 4px 12px rgba(16,185,129,0.2);">Go to Renewals List</a>
                </div>
                <p style="color:#94a3b8;font-size:13px;margin:32px 0 0;padding-top:20px;border-top:1px solid #e2e8f0;">
                  Regards,<br><strong style="color:#1e293b;">MarsLab Renewals</strong>
                </p>
              </td>
            </tr>
            <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;"><p style="color:#94a3b8;font-size:12px;margin:0;">Powered by MarsLab Renewal Management System</p></td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;

    for (const email of salesEmails) {
      await sendEmail({
        to: email,
        subject: `🔓 Edit Access Approved: ${renewal.client_name} — ${renewal.service}`,
        html: emailHtml,
      });
    }

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Approved Successfully</title></head>
      <body style="font-family:'Segoe UI',Arial,sans-serif;text-align:center;padding:50px;background-color:#f0f4f8;">
        <div style="background:white;padding:40px;border-radius:12px;max-width:500px;margin:0 auto;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
          <h1 style="color:#10b981;margin-top:0;">✅ Approved Successfully</h1>
          <p style="color:#475569;font-size:16px;">The edit request for <strong>${renewal.client_name}</strong> has been successfully approved.</p>
          <p style="color:#64748b;font-size:14px;margin-top:10px;">The CST team has been notified via email.</p>
          <p style="color:#94a3b8;font-size:14px;margin-top:30px;">You can safely close this tab now.</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Email approval error:', err);
    return res.status(500).send('<h1>Error</h1><p>Internal server error occurred.</p>');
  }
});

// Approve Edit
router.put('/:id/approve-edit', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM renewals WHERE id = $1', [req.params.id]);
    const renewal = rows[0];
    if (!renewal) return res.status(404).json({ error: 'Renewal not found.' });

    await db.query('UPDATE renewals SET edit_status = $1 WHERE id = $2', ['approved', req.params.id]);
    
    await db.query(`
      INSERT INTO notifications (role, title, message, type)
      VALUES ('sales', 'Edit Access Approved', $1, 'success')
    `, [`Admin approved edit access for ${renewal.client_name}`]);

    // Send email notification to sales team
    const { sendEmail } = await import('../services/emailService.js');
    const { rows: salesUsers } = await db.query("SELECT email FROM users WHERE role = 'sales'");
    
    const salesEmails = new Set();
    for (const u of salesUsers) {
      if (u.email) salesEmails.add(u.email);
    }

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#10b981,#059669);padding:36px 40px;text-align:center;">
                <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">🔓 Edit Access Approved</h1>
                <p style="color:#ffffffcc;margin:8px 0 0;font-size:14px;">Renewal System Update</p>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 20px;">Dear <strong>CST Team</strong>,</p>
                <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
                  The admin has approved your edit request for the following client. You now have access to edit the details of this renewal:
                </p>
                <div style="background:#f8fafc;border-left:4px solid #10b981;border-radius:8px;padding:20px;margin:0 0 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Client ID</td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${renewal.unique_id}</td></tr>
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Client</td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${renewal.client_name}</td></tr>
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Service</td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${renewal.service}</td></tr>
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Status</td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">Approved for Edit</td></tr>
                  </table>
                </div>
                <div style="text-align:center;margin:30px 0 10px;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/renewals?status=all" style="background-color:#10b981;color:#ffffff;padding:12px 28px;text-decoration:none;font-weight:700;border-radius:8px;display:inline-block;box-shadow:0 4px 12px rgba(16,185,129,0.2);">Go to Renewals List</a>
                </div>
                <p style="color:#94a3b8;font-size:13px;margin:32px 0 0;padding-top:20px;border-top:1px solid #e2e8f0;">
                  Regards,<br><strong style="color:#1e293b;">MarsLab Renewals</strong>
                </p>
              </td>
            </tr>
            <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;"><p style="color:#94a3b8;font-size:12px;margin:0;">Powered by MarsLab Renewal Management System</p></td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;

    for (const email of salesEmails) {
      await sendEmail({
        to: email,
        subject: `🔓 Edit Access Approved: ${renewal.client_name} — ${renewal.service}`,
        html: emailHtml,
      });
    }

    res.json({ message: 'Edit request approved.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve edit.' });
  }
});

// Renewal Confirmation — Sales team updates renewal status
router.put('/:id/confirm-renewal', authenticateToken, requireRole('sales', 'admin'), async (req, res) => {
  try {
    const { renewal_confirmation, remarks } = req.body;
    const validOptions = [
      'pending',
      'quotation_confirmation',
      'awaiting_client_approval',
      'awaiting_with_vendor',
      'renewed',
      'service_discontinued'
    ];
    
    if (!validOptions.includes(renewal_confirmation)) {
      return res.status(400).json({ error: 'Invalid renewal confirmation option.' });
    }

    const { rows } = await db.query('SELECT * FROM renewals WHERE id = $1', [req.params.id]);
    const renewal = rows[0];
    if (!renewal) return res.status(404).json({ error: 'Renewal not found.' });

    if (renewal_confirmation === 'pending') {
      await db.query(`
        UPDATE renewals SET renewal_confirmation = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
      `, [renewal_confirmation, req.params.id]);
      return res.json({ message: 'Renewal confirmation reset to pending.' });
    }

    // Update renewal confirmation (and renewal_date if 'renewed')
    const { new_renewal_date } = req.body;
    if (renewal_confirmation === 'renewed') {
      if (!new_renewal_date) {
        return res.status(400).json({ error: 'New renewal date is required when status is Renewed.' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const rDate = new Date(new_renewal_date);
      rDate.setHours(0, 0, 0, 0);
      const computedStatus = 'Active';

      const flags = getEmailFlags(new_renewal_date);
      await db.query(`
        UPDATE renewals SET 
          renewal_confirmation = $1, 
          renewal_date = $2,
          status = $3,
          day_30_sent = $4,
          day_20_sent = $5,
          day_15_sent = $6,
          day_10_sent = $7,
          day_5_sent = $8,
          day_3_sent = $9,
          sales_15_sent = $10,
          sales_5_sent = $11,
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = $12
      `, [
        renewal_confirmation, new_renewal_date, computedStatus,
        flags.day_30_sent, flags.day_20_sent, flags.day_15_sent, flags.day_10_sent, flags.day_5_sent, flags.day_3_sent, flags.sales_15_sent, flags.sales_5_sent,
        req.params.id
      ]);

      const previousData = JSON.stringify({
        renewal_date: renewal.renewal_date,
        service: renewal.service,
        value: renewal.value,
        status: renewal.status,
      });

      await db.query(`
        INSERT INTO renewal_history (renewal_id, action, previous_data, new_data, performed_by)
        VALUES ($1, 'renewed', $2, $3, $4)
      `, [
        req.params.id,
        previousData,
        JSON.stringify({ renewal_date: new_renewal_date, service: renewal.service, value: renewal.value, status: computedStatus }),
        req.user.id
      ]);
    } else if (renewal_confirmation === 'service_discontinued') {
      await db.query(`
        UPDATE renewals SET 
          renewal_confirmation = $1, 
          renewal_date = NULL,
          status = '-',
          value = 0,
          day_30_sent = 'No',
          day_20_sent = 'No',
          day_15_sent = 'No',
          day_10_sent = 'No',
          day_5_sent = 'No',
          day_3_sent = 'No',
          sales_15_sent = 'No',
          sales_5_sent = 'No',
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [renewal_confirmation, req.params.id]);

      const previousData = JSON.stringify({
        renewal_date: renewal.renewal_date,
        service: renewal.service,
        value: renewal.value,
        status: renewal.status,
      });

      await db.query(`
        INSERT INTO renewal_history (renewal_id, action, previous_data, new_data, performed_by)
        VALUES ($1, 'edited', $2, $3, $4)
      `, [
        req.params.id,
        previousData,
        JSON.stringify({ renewal_date: null, service: renewal.service, value: 0, status: '-' }),
        req.user.id
      ]);
    } else {
      await db.query(`
        UPDATE renewals SET renewal_confirmation = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
      `, [renewal_confirmation, req.params.id]);
    }

    // Format label for display
    const labelMap = {
      quotation_confirmation: 'Order Confirmation',
      awaiting_client_approval: 'Awaiting Client Approval',
      awaiting_with_vendor: 'Awaiting with Vendor',
      renewed: 'Renewed',
      service_discontinued: 'Service Discontinued'
    };
    const label = labelMap[renewal_confirmation];

    const roleLabels = {
      admin: 'Admin',
      finance: 'Finance team',
      sales: 'CST team'
    };
    const actorRole = roleLabels[req.user.role] || 'CST team';

    const colorMap = { 
      quotation_confirmation: '#f59e0b', 
      awaiting_client_approval: '#3b82f6', 
      awaiting_with_vendor: '#8b5cf6', 
      renewed: '#10b981', 
      service_discontinued: '#ef4444' 
    };
    const iconMap = { 
      quotation_confirmation: '📋', 
      awaiting_client_approval: '👤', 
      awaiting_with_vendor: '🏢', 
      renewed: '✅', 
      service_discontinued: '❌' 
    };
    const statusColor = colorMap[renewal_confirmation] || '#6b7280';
    const statusIcon = iconMap[renewal_confirmation] || '📋';

    // Log activity
    await db.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
      VALUES ($1, 'renewal_confirmation', 'renewal', $2, $3)
    `, [req.user.id, renewal.unique_id, `${actorRole} marked ${renewal.client_name} (${renewal.service}) as "${label}". ${remarks ? 'Remarks: ' + remarks : ''}`]);

    // Determine warning/success type
    const notifType = (renewal_confirmation === 'renewed') 
      ? 'success' 
      : (renewal_confirmation === 'service_discontinued') 
        ? 'error' 
        : 'warning';

    // Create notification for finance team and admin team
    await db.query(`
      INSERT INTO notifications (role, title, message, type, link)
      VALUES ('finance', 'Renewal Update', $1, $2, $3)
    `, [
      `${renewal.client_name} (${renewal.service}) has been marked as "${label}" by ${actorRole.toLowerCase()}.${remarks ? ' Remarks: ' + remarks : ''}`,
      notifType,
      `/renewals?search=${renewal.unique_id}`
    ]);

    await db.query(`
      INSERT INTO notifications (role, title, message, type, link)
      VALUES ('admin', 'Renewal Update', $1, $2, $3)
    `, [
      `${renewal.client_name} (${renewal.service}) has been marked as "${label}" by ${actorRole.toLowerCase()}.${remarks ? ' Remarks: ' + remarks : ''}`,
      notifType,
      `/renewals?search=${renewal.unique_id}`
    ]);

    await sendCliqNotification(`${statusIcon} *Renewal Status Update*\n*Client ID:* ${renewal.unique_id}\n*Client:* ${renewal.client_name}\n*Service:* ${renewal.service}\n*New Status:* ${label}\n*Updated By:* ${actorRole}\n${remarks ? `*Remarks:* ${remarks}` : ''}`);

    // Send email notification to finance team
    const { sendEmail } = await import('../services/emailService.js');
    
    // Get finance team email(s)
    const { rows: financeUsers } = await db.query("SELECT email FROM users WHERE role = 'finance'");

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,${statusColor},${statusColor}dd);padding:36px 40px;text-align:center;">
                <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">${statusIcon} Renewal Status Update</h1>
                <p style="color:#ffffffcc;margin:8px 0 0;font-size:14px;">CST Team Confirmation</p>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 20px;">Dear <strong>Finance Team</strong>,</p>
                <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
                  The CST team has updated the renewal status for the following client:
                </p>
                <div style="background:#f8fafc;border-left:4px solid ${statusColor};border-radius:8px;padding:20px;margin:0 0 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Client</td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${renewal.client_name}</td></tr>
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Service</td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${renewal.service}</td></tr>
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Renewal Date</td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${new Date(renewal.renewal_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>
                    <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Status</td><td style="padding:6px 0;color:${statusColor};font-size:14px;font-weight:700;text-align:right;">${label}</td></tr>
                    ${remarks ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Remarks</td><td style="padding:6px 0;color:#1e293b;font-size:14px;text-align:right;">${remarks}</td></tr>` : ''}
                  </table>
                </div>
                <p style="color:#94a3b8;font-size:13px;margin:32px 0 0;padding-top:20px;border-top:1px solid #e2e8f0;">
                  Regards,<br><strong style="color:#1e293b;">MarsLab Renewals</strong>
                </p>
              </td>
            </tr>
            <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;"><p style="color:#94a3b8;font-size:12px;margin:0;">Powered by MarsLab Renewal Management System</p></td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;

    for (const finUser of financeUsers) {
      await sendEmail({
        to: finUser.email,
        subject: `${statusIcon} Renewal Update: ${renewal.client_name} — ${label}`,
        html: emailHtml,
      });
    }

    console.log(`🔔 Renewal confirmation: ${renewal.client_name} → "${label}" | Notified finance team.`);

    const { rows: updatedRows } = await db.query('SELECT * FROM renewals WHERE id = $1', [req.params.id]);
    res.json(updatedRows[0]);
  } catch (err) {
    console.error('Renewal confirmation error:', err);
    res.status(500).json({ error: 'Failed to update renewal confirmation.' });
  }
});

export default router;
