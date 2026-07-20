import db from '../db.js';
import { sendEmail } from './emailService.js';
import { sendCliqNotification } from './cliqService.js';
import { clientReminderEmail, salesReminderEmail, renewalExpiredAdminEmail } from '../templates/emailTemplates.js';

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
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
}

const getSenderEmail = () => process.env.SMTP_FROM || '"Renewals" <renewals@sidcorptech.net>';

async function processRenewals() {
  console.log(`\n⏰ [${new Date().toISOString()}] Running renewal email scheduler...`);

  try {
    // Check if email automation is stopped
    const { rows: settings } = await db.query(`SELECT value FROM automation_settings WHERE key = 'email_automation'`);
    const isRunning = settings.length > 0 ? settings[0].value === 'start' : true;
    if (!isRunning) {
      console.log(`   🚫 Email automation is currently STOPPED. Skipping scheduled checks.`);
      return;
    }

    // Fetch active users with admin or sales/cst roles
    const { rows: activeUsers } = await db.query(`
      SELECT email, role FROM users 
      WHERE role IN ('sales', 'admin', 'cst') 
        AND is_active = true
    `);

    const adminEmailsList = activeUsers.filter(u => u.role === 'admin').map(u => u.email).filter(Boolean);
    const salesEmailsList = activeUsers.filter(u => u.role === 'sales' || u.role === 'cst').map(u => u.email).filter(Boolean);

    const adminEmails = adminEmailsList.join(',') || 'renewals@sidcorptech.net';
    const salesEmails = salesEmailsList.join(',') || 'renewals@sidcorptech.net';

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
        product: renewal.product,
        description: renewal.description,
      };

      // Auto-update status based on days left
      if (daysLeft < 0) {
        if (renewal.status !== 'Expired') {
          await db.query(`UPDATE renewals SET status = 'Expired', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [renewal.id]);
          
          // Notification to Finance
          await db.query(`
            INSERT INTO notifications (role, title, message, type)
            VALUES ('finance', 'Renewal Expired', $1, 'error')
          `, [`${renewal.client_name}'s ${renewal.service} renewal has expired.`]);

          // Notification to Sales (CST team)
          await db.query(`
            INSERT INTO notifications (role, title, message, type)
            VALUES ('sales', 'Renewal Expired - Reason Required', $1, 'error')
          `, [`${renewal.client_name}'s ${renewal.service} renewal has expired. Please provide a reason for the expiry.`]);
          
          await sendCliqNotification(`❌ *Renewal Expired*\n*Client ID:* ${renewal.unique_id}\n*Client:* ${renewal.client_name}\n*Service:* ${renewal.service}\n*Status:* Has expired.`, false);
          await sendCliqNotification(`❌ *Renewal Expired*\n*Client:* ${renewal.client_name}\n*Service:* ${renewal.service}\nClient renewal is expired. Update the reason in RMT application.`, true);

          // Send expiry alert email from renewals@sidcorptech.net to all Admin(s) with CC to ALL CST/Sales team (NOT client)
          try {
            const expiredTemplate = renewalExpiredAdminEmail({
              clientName: renewal.client_name,
              service: renewal.service,
              renewalDate: formatDate(renewal.renewal_date),
              uniqueId: renewal.unique_id,
              owner: renewal.owner,
              secondaryEmail: renewal.sales_email,
            });
            const emailResult = await sendEmail({
              from: getSenderEmail(),
              to: adminEmails,
              cc: salesEmails,
              subject: expiredTemplate.subject,
              html: expiredTemplate.html,
            });
            console.log(`   📧 Expiry alert → Admin(s): ${adminEmails} | CC CST/Sales: ${salesEmails} (${emailResult.success ? '✅' : '❌ ' + emailResult.error})`);

            await db.query(`
              INSERT INTO email_logs (renewal_id, client_name, service, recipient_email, recipient_type, email_type, subject, status, error_message)
              VALUES ($1, $2, $3, $4, 'admin', 'renewal_expired', $5, $6, $7)
            `, [renewal.id, renewal.client_name, renewal.service, adminEmails, expiredTemplate.subject, emailResult.success ? 'sent' : 'failed', emailResult.error || null]);
          } catch (emailErr) {
            console.error(`   ❌ Failed to send expiry alert email:`, emailErr.message);
          }
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
      // SECTION 3: AUTOMATED CLIENT EMAIL REMINDERS
      // Triggers ONLY on exact client reminder days: 30, 20, 15, 10, 5, 3, 0
      // From: renewals@sidcorptech.net
      // To: client_email
      // CC: All CST / Sales team users (ONLY)
      // ==========================================
      const schedule = [
        { days: 30, column: 'day_30_sent' },
        { days: 20, column: 'day_20_sent' },
        { days: 15, column: 'day_15_sent' },
        { days: 10, column: 'day_10_sent' },
        { days: 5,  column: 'day_5_sent' },
        { days: 3,  column: 'day_3_sent' },
        { days: 0,  column: 'day_0_sent' },
      ];

      const currentTier = schedule.find(s => 
        daysLeft === s.days && renewal[s.column] === 'No'
      ) || null;

      if (currentTier) {
        const template = clientReminderEmail(emailData);

        // Send to Client Email from renewals@sidcorptech.net with All Sales/CST Team CC'd
        const clientResult = await sendEmail({
          from: getSenderEmail(),
          to: renewal.client_email,
          cc: salesEmails,
          subject: template.subject,
          html: template.html,
        });

        await db.query(`
          INSERT INTO email_logs (renewal_id, client_name, service, recipient_email, recipient_type, email_type, subject, status, error_message)
          VALUES ($1, $2, $3, $4, 'client', $5, $6, $7, $8)
        `, [
          renewal.id, renewal.client_name, renewal.service, renewal.client_email, `${currentTier.days}_day_reminder`,
          template.subject, clientResult.success ? 'sent' : 'failed',
          clientResult.error || null
        ]);

        console.log(`   📧 ${currentTier.days}-day reminder → ${renewal.client_email} (CC: ${salesEmails}) (${clientResult.success ? '✅' : '❌'})`);

        // Mark current tier and higher tiers as sent
        await db.query(
          `UPDATE renewals SET 
             day_30_sent = CASE WHEN 30 >= $2 THEN 'Yes' ELSE day_30_sent END,
             day_20_sent = CASE WHEN 20 >= $2 THEN 'Yes' ELSE day_20_sent END,
             day_15_sent = CASE WHEN 15 >= $2 THEN 'Yes' ELSE day_15_sent END,
             day_10_sent = CASE WHEN 10 >= $2 THEN 'Yes' ELSE day_10_sent END,
             day_5_sent  = CASE WHEN 5  >= $2 THEN 'Yes' ELSE day_5_sent  END,
             day_3_sent  = CASE WHEN 3  >= $2 THEN 'Yes' ELSE day_3_sent  END,
             day_0_sent  = CASE WHEN 0  >= $2 THEN 'Yes' ELSE day_0_sent  END,
             updated_at  = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [renewal.id, currentTier.days]
        );

        // Create notification
        await db.query(`
          INSERT INTO notifications (role, title, message, type)
          VALUES ('finance', 'Email Sent', $1, 'info')
        `, [`${currentTier.days}-day reminder sent for ${renewal.client_name} (${renewal.service}).`]);

        const cliqMsg = `📧 *Client Reminder Sent* (${currentTier.days} Days Remaining)\n*Client ID:* ${renewal.unique_id}\n*Client:* ${renewal.client_name}\n*Service:* ${renewal.service}\n*Renewal Date:* ${formatDate(renewal.renewal_date)}\n*Email Sent To:* ${renewal.client_email}\n*CC:* ${salesEmails}`;
        await sendCliqNotification(cliqMsg, false);
        await sendCliqNotification(cliqMsg, true);

        try {
          const { broadcastEvent } = await import('./realtime.js');
          const { rows: updatedRows } = await db.query('SELECT * FROM renewals WHERE id = $1', [renewal.id]);
          if (updatedRows.length > 0) {
            broadcastEvent('renewals_updated', updatedRows[0]);
          }
        } catch (bErr) {
          console.error('Failed to broadcast updated renewal event:', bErr.message);
        }

        console.log(`   ✅ ${currentTier.days}-day reminder complete for ${renewal.client_name}`);
      }

      // ==========================================
      // SECTION 5: FOLLOWUP MAIL / CST SALES SPECIAL REMINDERS
      // Triggers ONLY on EXACT 15th day and 5th day (daysLeft === 15 || daysLeft === 5)
      // From: renewals@sidcorptech.net
      // To: CST/Sales team users (ONLY)
      // CC: Admin users
      // ==========================================
      const salesSpecialSchedule = [
        { days: 15, column: 'sales_15_sent' },
        { days: 5,  column: 'sales_5_sent' },
      ];

      const salesTier = salesSpecialSchedule.find(s => 
        daysLeft === s.days && renewal[s.column] === 'No'
      ) || null;

      if (salesTier) {
        const salesTemplate = salesReminderEmail(emailData);

        const salesResult = await sendEmail({
          from: getSenderEmail(),
          to: salesEmails,
          cc: adminEmails,
          subject: salesTemplate.subject,
          html: salesTemplate.html,
        });

        await db.query(`
          UPDATE renewals SET 
            sales_15_sent = CASE WHEN 15 >= $2 THEN 'Yes' ELSE sales_15_sent END,
            sales_5_sent  = CASE WHEN 5  >= $2 THEN 'Yes' ELSE sales_5_sent  END,
            sales_3_sent  = CASE WHEN 3  >= $2 THEN 'Yes' ELSE sales_3_sent  END,
            updated_at    = CURRENT_TIMESTAMP 
          WHERE id = $1`, [renewal.id, salesTier.days]);

        await db.query(`
          INSERT INTO email_logs (renewal_id, client_name, service, recipient_email, recipient_type, email_type, subject, status, error_message)
          VALUES ($1, $2, $3, $4, 'sales', $5, $6, $7, $8)
        `, [
          renewal.id, renewal.client_name, renewal.service, salesEmails, `sales_special_${salesTier.days}_day`,
          salesTemplate.subject, salesResult.success ? 'sent' : 'failed',
          salesResult.error || null
        ]);

        await db.query(`
          INSERT INTO notifications (role, title, message, type)
          VALUES ('sales', 'Follow-Up Required', $1, 'warning')
        `, [`Please meet ${renewal.client_name} regarding ${renewal.service} renewal (${salesTier.days} days left).`]);

        await sendCliqNotification(
          `⚡ *CST Action Required* (${salesTier.days} Days Left)\n*Client ID:* ${renewal.unique_id}\n*Client:* ${renewal.client_name}\n*Service:* ${renewal.service}\n*Action:* Please meet the client regarding upcoming renewal.\n*Email Sent To:* ${salesEmails}`,
          true
        );

        console.log(`   ⚡ SALES SPECIAL ${salesTier.days}-day → ${salesEmails} (CC: ${adminEmails}) (${salesResult.success ? '✅' : '❌'})`);
      }
    }
  } catch (err) {
    console.error('Scheduler error:', err);
  }

  console.log(`   ✅ Scheduler run complete.\n`);
}

const FIFTEEN_MIN_MS = 15 * 60 * 1000;

export function startScheduler() {
  setTimeout(() => {
    processRenewals();
    setInterval(() => {
      processRenewals();
    }, FIFTEEN_MIN_MS);
  }, 3000);

  console.log('🕐 Email scheduler started (runs on startup, then every 15 minutes)');
}

export { processRenewals };
