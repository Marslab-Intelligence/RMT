import express from 'express';
import db from '../db.js';
import { sendCliqNotification } from '../services/cliqService.js';
import { broadcastEvent } from '../services/realtime.js';

const router = express.Router();

router.post('/zoho-books', async (req, res) => {
  try {
    const { invoice } = req.body;
    if (!invoice) {
      return res.status(400).json({ error: 'Missing invoice payload' });
    }

    const { invoice_number, status, total, date, custom_fields } = invoice;

    // Process only if the status indicates the invoice has been issued/sent
    const activeStatuses = ['sent', 'overdue', 'paid', 'partially_paid'];
    if (!status || !activeStatuses.includes(status.toLowerCase())) {
      return res.status(200).json({ message: `Ignored status change: status is "${status}"` });
    }

    // Extract RMT ID from custom fields
    const rmtIdField = custom_fields?.find(field => field.label === 'RMT ID');
    const rmtId = rmtIdField ? rmtIdField.value : null;

    if (!rmtId) {
      console.warn(`[Zoho Webhook] Received invoice ${invoice_number} but no RMT ID custom field found.`);
      return res.status(400).json({ error: 'RMT ID is required in custom fields for mapping.' });
    }

    // Query the record first to capture previous data
    const getRes = await db.query('SELECT * FROM renewals WHERE unique_id = $1', [rmtId]);
    if (getRes.rows.length === 0) {
      console.warn(`[Zoho Webhook] No matching RMT record found for RMT ID: ${rmtId}`);
      return res.status(404).json({ error: `RMT record ${rmtId} not found` });
    }

    const renewal = getRes.rows[0];

    // Find and update the corresponding renewal record
    const query = `
      UPDATE renewals 
      SET invoice_status = 'Sent',
          invoice_number = $1,
          invoice_value = $2,
          invoice_sent_date = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE unique_id = $4
      RETURNING *
    `;

    const { rows } = await db.query(query, [invoice_number, parseFloat(total), date, rmtId]);
    const updated = rows[0];

    // Log to renewal_history
    const previousData = JSON.stringify({
      invoice_status: renewal.invoice_status,
      invoice_number: renewal.invoice_number,
      invoice_value: renewal.invoice_value,
      invoice_sent_date: renewal.invoice_sent_date
    });

    const newData = JSON.stringify({
      invoice_status: updated.invoice_status,
      invoice_number: updated.invoice_number,
      invoice_value: updated.invoice_value,
      invoice_sent_date: updated.invoice_sent_date
    });

    await db.query(`
      INSERT INTO renewal_history (renewal_id, action, previous_data, new_data, performed_by)
      VALUES ($1, 'edited', $2, $3, NULL)
    `, [updated.id, previousData, newData]);

    // Insert notifications for Admin and Finance
    const notificationMsg = `Invoice #${invoice_number} (₹${parseFloat(total).toLocaleString('en-IN')}) has been automatically synced from Zoho Books for client "${updated.client_name}" (${updated.service}).`;
    await db.query(`
      INSERT INTO notifications (role, title, message, type, link)
      VALUES ('admin', 'Invoice Synced via Zoho', $1, 'info', $2),
             ('finance', 'Invoice Synced via Zoho', $1, 'info', $2)
    `, [notificationMsg, `/renewals?search=${updated.unique_id}`]);

    // Send Zoho Cliq notifications
    const cliqMessage = `🧾 *Invoice Automatically Synced (Zoho)*\n*Client ID:* ${updated.unique_id}\n*Client:* ${updated.client_name}\n*Service:* ${updated.service}\n*Invoice #:* ${invoice_number}\n*Invoice Value:* ₹${parseFloat(total).toLocaleString('en-IN')}\n*Invoice Sent Date:* ${new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    await sendCliqNotification(cliqMessage, false); // Finance channel
    await sendCliqNotification(cliqMessage, true);  // Sales channel

    console.log(`[Zoho Webhook] Successfully mapped and updated RMT record: ${rmtId} with Invoice #${invoice_number}`);
    broadcastEvent('renewals_updated', updated);
    return res.status(200).json({ message: 'Success', updated_record: updated });

  } catch (error) {
    console.error('[Zoho Webhook Error]:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
