import express from 'express';
import db from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { processRenewals } from '../services/scheduler.js';
import { sendEmail } from '../services/emailService.js';
import { automationToggleEmail } from '../templates/emailTemplates.js';

const router = express.Router();

// Get automation status and log history
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const { rows: settings } = await db.query(`SELECT value FROM automation_settings WHERE key = 'email_automation'`);
    const status = settings.length > 0 ? settings[0].value : 'start';

    const { rows: logs } = await db.query(`
      SELECT al.*, u.full_name as performed_by_name 
      FROM automation_logs al 
      LEFT JOIN users u ON al.performed_by = u.id 
      ORDER BY al.performed_at DESC
    `);

    res.json({ status, logs });
  } catch (err) {
    console.error('Error fetching automation status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update automation status (Admin only)
router.post('/toggle', authenticateToken, requireRole('admin'), async (req, res) => {
  const { action, note } = req.body;

  if (!action || !['start', 'stop'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Must be start or stop.' });
  }

  if (!note || note.trim() === '') {
    return res.status(400).json({ error: 'A note explaining the reason is required.' });
  }

  try {
    // Update setting in db
    await db.query(`
      INSERT INTO automation_settings (key, value, updated_by, updated_at)
      VALUES ('email_automation', $1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE 
      SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at
    `, [action, req.user.id]);

    if (action === 'start') {
      setTimeout(() => {
        processRenewals().catch(err => console.error('Error in triggered processRenewals:', err));
      }, 500);
    }

    // Insert log
    await db.query(`
      INSERT INTO automation_logs (action, note, performed_by)
      VALUES ($1, $2, $3)
    `, [action, note, req.user.id]);

    // Send email notifications to finances and sales teams
    try {
      const { rows: recipients } = await db.query(`
        SELECT email FROM users 
        WHERE role IN ('finance', 'sales') 
          AND email IS NOT NULL 
          AND email != ''
      `);
      
      const toEmails = recipients.map(r => r.email).filter(Boolean);
      if (toEmails.length > 0) {
        const adminName = req.user.fullName || 'Admin';
        const { subject, html } = automationToggleEmail({ action, note, adminName });
        
        const emailResult = await sendEmail({
          to: toEmails.join(','),
          subject,
          html
        });
        await db.query(`
          INSERT INTO email_logs (renewal_id, client_name, service, recipient_email, recipient_type, email_type, subject, status, error_message)
          VALUES (NULL, 'System / Automation', 'Email Automation Toggle', $1, 'sales', 'automation_toggle', $2, $3, $4)
        `, [toEmails.join(','), subject, emailResult.success ? 'sent' : 'failed', emailResult.error || null]);
        console.log(`✉️ Automation toggle notification email sent to: ${toEmails.join(', ')}`);
      }
    } catch (emailErr) {
      console.error('Failed to send automation toggle email:', emailErr);
    }

    // Create system notification for all users
    await db.query(`
      INSERT INTO notifications (title, message, type)
      VALUES ($1, $2, 'info')
    `, [
      `Email Automation ${action === 'start' ? 'Resumed' : 'Paused'}`,
      `Email automation has been ${action === 'start' ? 'started' : 'stopped'} by admin ${req.user.fullName}. Reason: ${note}`
    ]);

    // Fetch updated status and logs
    const { rows: settings } = await db.query(`SELECT value FROM automation_settings WHERE key = 'email_automation'`);
    const status = settings.length > 0 ? settings[0].value : 'start';

    const { rows: logs } = await db.query(`
      SELECT al.*, u.full_name as performed_by_name 
      FROM automation_logs al 
      LEFT JOIN users u ON al.performed_by = u.id 
      ORDER BY al.performed_at DESC
    `);

    res.json({ status, logs });
  } catch (err) {
    console.error('Error toggling automation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
