import cron from 'node-cron';
import db from '../db.js';
import { sendEmail } from './emailService.js';
import { sendCliqNotification } from './cliqService.js';
import { clientReminderEmail, salesReminderEmail } from '../templates/emailTemplates.js';

// Sales team email for special reminders
const SALES_TEAM_EMAIL = 'sakthivel.k@marslab.work';

function getDaysLeft(renewalDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewal = new Date(renewalDate);
  renewal.setHours(0, 0, 0, 0);
  const diff = renewal.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
}

async function processRenewals() {
  console.log(`\n⏰ [${new Date().toISOString()}] Running renewal email scheduler...`);

  try {
    const { rows: renewals } = await db.query(`
      SELECT * FROM renewals 
      WHERE status IN ('Active', 'Pending Renewal')
    `);

    console.log(`   Found ${renewals.length} active renewals to check.`);

    for (const renewal of renewals) {
      const daysLeft = getDaysLeft(renewal.renewal_date);
      const emailData = {
        clientName: renewal.client_name,
        service: renewal.service,
        renewalDate: formatDate(renewal.renewal_date),
        daysLeft,
      };

      // Auto-update status based on days left
      if (daysLeft < 0) {
        if (renewal.status !== 'Expired') {
          await db.query(`UPDATE renewals SET status = 'Expired', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [renewal.id]);
          await db.query(`
            INSERT INTO notifications (role, title, message, type)
            VALUES ('finance', 'Renewal Expired', $1, 'error')
          `, [`${renewal.client_name}'s ${renewal.service} renewal has expired.`]);
          
          await sendCliqNotification(`❌ *Renewal Expired*\n*Client ID:* ${renewal.unique_id}\n*Client:* ${renewal.client_name}\n*Service:* ${renewal.service}\n*Status:* Has expired.`);
        }
        continue;
      } else if (daysLeft <= 30) {
        if (renewal.status !== 'Pending Renewal') {
          await db.query(`UPDATE renewals SET status = 'Pending Renewal', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [renewal.id]);
        }
      } else {
        if (renewal.status !== 'Active') {
          await db.query(`UPDATE renewals SET status = 'Active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [renewal.id]);
        }
      }

      // ==========================================
      // SECTION 3: AUTOMATED EMAIL REMINDERS
      // Sends to BOTH client_email AND sales_email
      // ==========================================
      const schedule = [
        { days: 30, column: 'day_30_sent' },
        { days: 20, column: 'day_20_sent' },
        { days: 15, column: 'day_15_sent' },
        { days: 10, column: 'day_10_sent' },
        { days: 5,  column: 'day_5_sent' },
        { days: 3,  column: 'day_3_sent' },
      ];

      // Find which tier this renewal falls into
      const currentTier = schedule.find(s => daysLeft === s.days);

      if (currentTier && renewal[currentTier.column] === 'No') {
        const template = clientReminderEmail(emailData);

        // --- Send to Client Email with Sales Team CC'd ---
        const clientResult = await sendEmail({
          to: renewal.client_email,
          cc: SALES_TEAM_EMAIL,
          subject: template.subject,
          html: template.html,
        });

        await db.query(`
          INSERT INTO email_logs (renewal_id, recipient_email, recipient_type, email_type, subject, status, error_message)
          VALUES ($1, $2, 'client', $3, $4, $5, $6)
        `, [
          renewal.id, renewal.client_email, `${currentTier.days}_day_reminder`,
          template.subject, clientResult.success ? 'sent' : 'failed',
          clientResult.error || null
        ]);

        console.log(`   📧 ${currentTier.days}-day reminder → ${renewal.client_email} (CC: ${SALES_TEAM_EMAIL}) (${clientResult.success ? '✅' : '❌'})`);

        // Mark this tier AND all previous (larger) tiers as sent
        const tiersToMark = schedule.filter(s => s.days >= currentTier.days);
        const setClauses = tiersToMark.map(t => `${t.column} = 'Yes'`).join(', ');
        await db.query(`UPDATE renewals SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [renewal.id]);

        // Create notification
        await db.query(`
          INSERT INTO notifications (role, title, message, type)
          VALUES ('finance', 'Email Sent', $1, 'info')
        `, [`${currentTier.days}-day reminder sent for ${renewal.client_name} (${renewal.service}).`]);

        await sendCliqNotification(`📧 *Client Reminder Sent* (${currentTier.days} Days Remaining)\n*Client ID:* ${renewal.unique_id}\n*Client:* ${renewal.client_name}\n*Service:* ${renewal.service}\n*Renewal Date:* ${formatDate(renewal.renewal_date)}\n*Email Sent To:* ${renewal.client_email}\n*CC:* ${SALES_TEAM_EMAIL}`);

        console.log(`   ✅ ${currentTier.days}-day reminder complete for ${renewal.client_name}`);
      }

      // ==========================================
      // SECTION 5: SALES TEAM SPECIAL REMINDERS
      // Separate emails ONLY at 15 and 5 days
      // Sent to: sakthivel.k@marslab.work
      // "Please meet the client regarding upcoming renewal."
      // ==========================================
      const salesSpecialSchedule = [
        { days: 15, column: 'sales_15_sent' },
        { days: 5,  column: 'sales_5_sent' },
      ];

      const salesTier = salesSpecialSchedule.find(s => daysLeft === s.days);

      if (salesTier && renewal[salesTier.column] === 'No') {
        const salesTemplate = salesReminderEmail(emailData);

        const salesResult = await sendEmail({
          to: SALES_TEAM_EMAIL,
          subject: salesTemplate.subject,
          html: salesTemplate.html,
        });

        await db.query(`UPDATE renewals SET ${salesTier.column} = 'Yes', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [renewal.id]);

        await db.query(`
          INSERT INTO email_logs (renewal_id, recipient_email, recipient_type, email_type, subject, status, error_message)
          VALUES ($1, $2, 'sales', $3, $4, $5, $6)
        `, [
          renewal.id, SALES_TEAM_EMAIL, `sales_special_${salesTier.days}_day`,
          salesTemplate.subject, salesResult.success ? 'sent' : 'failed',
          salesResult.error || null
        ]);

        await db.query(`
          INSERT INTO notifications (role, title, message, type)
          VALUES ('sales', 'Follow-Up Required', $1, 'warning')
        `, [`Please meet ${renewal.client_name} regarding ${renewal.service} renewal (${salesTier.days} days left).`]);

        await sendCliqNotification(
          `⚡ *Sales Action Required* (${salesTier.days} Days Left)\n*Client ID:* ${renewal.unique_id}\n*Client:* ${renewal.client_name}\n*Service:* ${renewal.service}\n*Action:* Please meet the client regarding upcoming renewal.\n*Email Sent To:* ${SALES_TEAM_EMAIL}`,
          true
        );

        console.log(`   ⚡ SALES SPECIAL ${salesTier.days}-day → ${SALES_TEAM_EMAIL} (${salesResult.success ? '✅' : '❌'})`);
      }
    }
  } catch (err) {
    console.error('Scheduler error:', err);
  }

  console.log(`   ✅ Scheduler run complete.\n`);
}

export function startScheduler() {
  // Run every day at 9:00 AM IST (3:30 AM UTC)
  cron.schedule('30 3 * * *', () => {
    processRenewals();
  });

  // Also run immediately on startup
  setTimeout(() => {
    processRenewals();
  }, 3000);

  console.log('🕐 Email scheduler started (runs daily at 9:00 AM IST)');
}

// Export for manual trigger
export { processRenewals };
