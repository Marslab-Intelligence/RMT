// SECURITY: Escape HTML entities to prevent XSS in user-generated content within email templates
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function isEmpty(val) {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  return s === '' || s === 'null' || s === 'undefined' || s === 'n/a' || s === '-';
}

export function clientReminderEmail({ clientName, service, renewalDate, daysLeft, product, description }) {
  // Sanitize user-provided values for safe HTML inclusion
  clientName = escapeHtml(clientName);
  service = escapeHtml(service);
  product = escapeHtml(product);
  description = escapeHtml(description);

  const cleanProduct = isEmpty(product) ? '' : String(product).trim();
  const cleanDesc = isEmpty(description) ? '' : String(description).trim();
  let productText = '';
  if (cleanProduct && cleanDesc) {
    productText = ` for the product - <strong>${cleanProduct}_${cleanDesc}</strong>`;
  } else if (cleanProduct) {
    productText = ` for the product - <strong>${cleanProduct}</strong>`;
  } else if (cleanDesc) {
    productText = ` for the product - <strong>${cleanDesc}</strong>`;
  }

  let subject = '';
  let bodyParagraphs = [];

  if (daysLeft === 30) {
    subject = 'Renewal Reminder – Service Expiry in 30 Days';
    bodyParagraphs = [
      `Dear ${clientName},`,
      `We hope you are doing well.`,
      `This is a friendly reminder that your subscription/service for ${service}${productText} is due for renewal on <strong>${renewalDate}</strong>.`,
      `To ensure uninterrupted access and continued support, we recommend initiating the renewal process at your earliest convenience.`,
      `If you require a renewal quotation, purchase order details, or any assistance regarding the renewal process, please feel free to contact us.`,
      `We appreciate your business and look forward to continuing our partnership.`
    ];
  } else if (daysLeft === 20) {
    subject = 'Follow-Up: Renewal Due in 20 Days';
    bodyParagraphs = [
      `Dear ${clientName},`,
      `We would like to follow up regarding the renewal of your ${service}${productText}, which is scheduled to expire on <strong>${renewalDate}</strong>.`,
      `To avoid any last-minute delays, we kindly request that you review and process the renewal at your earliest convenience.`,
      `Should you require any additional information, quotations, or support to complete the renewal, our team is available to assist.`,
      `Thank you for your continued trust in our services.`
    ];
  } else if (daysLeft === 15) {
    subject = 'Action Required – Service Renewal Due in 15 Days';
    bodyParagraphs = [
      `Dear ${clientName},`,
      `This is a reminder that your ${service}${productText} subscription will expire on <strong>${renewalDate}</strong>, which is now 15 days away.`,
      `To ensure uninterrupted service and support coverage, we kindly request that the renewal process be completed before the expiry date.`,
      `Please note that failure to renew before expiration may result in service interruptions and the suspension of support services.`,
      `If you require any assistance with the renewal process, please contact us.`
    ];
  } else if (daysLeft === 10) {
    subject = 'Reminder – Service Renewal Due in 10 Days';
    bodyParagraphs = [
      `Dear ${clientName},`,
      `We would like to remind you that your ${service}${productText} subscription is scheduled to expire on <strong>${renewalDate}</strong>, which is now 10 days away.`,
      `To ensure uninterrupted access to services, support, and product benefits, we kindly request that you complete the renewal process before the expiry date.`,
      `We encourage you to review any pending renewal requirements and initiate the necessary steps at your earliest convenience to avoid any potential service disruption. If you require a renewal quotation, purchase order information, or assistance with the renewal process, our team is available to support you.`,
      `Thank you for your continued partnership and trust in our services.`
    ];
  } else if (daysLeft === 5) {
    subject = 'Renewal Reminder – Service Expiry in 5 Days';
    bodyParagraphs = [
      `Dear ${clientName},`,
      `We would like to remind you that your ${service}${productText} subscription is due to expire on <strong>${renewalDate}</strong>, which is now only 5 days away.`,
      `To avoid any disruption to your services, please ensure that the renewal is completed before the expiration date.`,
      `Please note that services and support may be discontinued upon expiry if the renewal is not processed in time.`,
      `If the renewal has already been initiated, kindly disregard this message and accept our thanks.`
    ];
  } else if (daysLeft === 3) {
    subject = 'Final Renewal Reminder – Service Expires in 3 Days';
    bodyParagraphs = [
      `Dear ${clientName},`,
      `This is our final reminder that your ${service}${productText} subscription will expire on <strong>${renewalDate}</strong>, which is just 3 days away.`,
      `To maintain uninterrupted service availability, technical support, and product access, we strongly recommend completing the renewal immediately.`,
      `Please be advised that if the renewal is not completed before the expiry date, the associated services may be suspended or discontinued in accordance with the service terms.`,
      `Should you require any assistance to expedite the renewal process, please contact us immediately.`,
      `Thank you for your prompt attention to this matter.`
    ];
  } else if (daysLeft === 0) {
    subject = 'CRITICAL: Your Service Renewal is Due Today';
    bodyParagraphs = [
      `Dear ${clientName},`,
      `This is a critical reminder that your subscription/service for ${service}${productText} is due for renewal <strong>today, ${renewalDate}</strong>.`,
      `To prevent any immediate service interruption, suspension of technical support, or loss of access, please complete your renewal as soon as possible today.`,
      `If you need urgent assistance, a fast-track invoice/quotation, or wish to confirm payment details, please contact us immediately.`
    ];
  } else {
    subject = `Renewal Reminder – ${service}`;
    bodyParagraphs = [
      `Dear ${clientName},`,
      `This is a friendly reminder that your subscription/service for ${service}${productText} is due for renewal on <strong>${renewalDate}</strong> (${daysLeft} days remaining).`,
      `Please contact us at your earliest convenience to ensure uninterrupted service.`
    ];
  }

  let gradient = 'linear-gradient(135deg, #0f172a, #1e293b)';
  let pillText = 'RENEWAL NOTIFICATION';
  let cardIconBg = 'rgba(15, 23, 42, 0.08)';

  if (daysLeft === 0) {
    gradient = 'linear-gradient(135deg, #dc2626, #7f1d1d)';
    pillText = '⚠️ DUE TODAY';
    cardIconBg = 'rgba(220, 38, 38, 0.08)';
  } else if (daysLeft === 3) {
    gradient = 'linear-gradient(135deg, #ef4444, #b91c1c)';
    pillText = 'RENEWAL NOTIFICATION';
    cardIconBg = 'rgba(239, 68, 68, 0.08)';
  } else if (daysLeft === 5) {
    gradient = 'linear-gradient(135deg, #f97316, #c2410c)';
    pillText = 'RENEWAL NOTIFICATION';
    cardIconBg = 'rgba(249, 115, 22, 0.08)';
  } else if (daysLeft === 10) {
    gradient = 'linear-gradient(135deg, #eab308, #ca8a04)';
    pillText = 'RENEWAL NOTIFICATION';
    cardIconBg = 'rgba(234, 179, 8, 0.08)';
  } else if (daysLeft === 15) {
    gradient = 'linear-gradient(135deg, #14b8a6, #0d9488)';
    pillText = '📅 RENEWAL UPDATE';
    cardIconBg = 'rgba(20, 184, 166, 0.08)';
  } else if (daysLeft === 20) {
    gradient = 'linear-gradient(135deg, #a855f7, #9333ea)';
    pillText = '✉️ RENEWAL NOTICE';
    cardIconBg = 'rgba(168, 85, 247, 0.08)';
  } else if (daysLeft === 30) {
    gradient = 'linear-gradient(135deg, #22c55e, #16a34a)';
    pillText = '👋 FRIENDLY REMINDER';
    cardIconBg = 'rgba(34, 197, 94, 0.08)';
  }

  const percentFilled = Math.max(5, Math.min(100, Math.round((daysLeft / 30) * 100)));
  const dearPara = bodyParagraphs[0] || `Dear Client,`;
  const otherParas = bodyParagraphs.slice(1);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="550" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.06);border:1px solid #eef1f6;">

          <!-- Header Banner -->
          <tr>
            <td style="background:${gradient};padding:40px 40px 36px 40px;color:#ffffff;border-top-left-radius:24px;border-top-right-radius:24px;">
              <!-- Logos and Pill Badge -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;padding:8px 16px;display:inline-block;border:0;">
                      <tr>
                        <td style="vertical-align:middle;height:28px;">
                          <img src="cid:sidcorptech_logo" alt="SidCorpTech Logo" style="height:28px;display:block;border:0;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;padding:8px 16px;display:inline-block;border:0;">
                      <tr>
                        <td style="vertical-align:middle;height:28px;">
                          <img src="cid:marslab_logo" alt="MarsLab Logo" style="height:24px;display:block;border:0;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td align="left">
                    <span style="background-color:rgba(255,255,255,0.18);border-radius:100px;padding:6px 14px;font-size:11px;font-weight:700;color:#ffffff;letter-spacing:0.8px;text-transform:uppercase;display:inline-block;">
                      ${pillText}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Service Title -->
              <h1 style="margin:0 0 8px 0;font-size:28px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                ${service} Subscription Renewal
              </h1>

              <!-- Subtitle -->
              <p style="margin:0 0 28px 0;font-size:14px;color:rgba(255,255,255,0.85);line-height:1.4;font-weight:400;">
                Critical update regarding your service renewal status.
              </p>

              <!-- Progress Bar -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td align="left" style="color:#ffffff;font-size:12px;font-weight:600;opacity:0.95;">
                    ${daysLeft} Days Remaining
                  </td>
                  <td align="right" style="color:#ffffff;font-size:12px;font-weight:600;opacity:0.95;">
                    Expires ${renewalDate}
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.25);border-radius:100px;height:6px;overflow:hidden;">
                <tr>
                  <td width="${percentFilled}%" style="background-color:#ffffff;border-radius:100px;height:6px;"></td>
                  <td width="${100 - percentFilled}%" style="height:6px;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 30px 40px;">
              <p style="margin:0 0 18px 0;font-size:16px;font-weight:700;color:#1e293b;">
                ${dearPara}
              </p>

              ${otherParas.map(para => `<p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.65;font-weight:400;">${para}</p>`).join('')}

              <!-- Info Cards -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                <tr>
                  <td width="48%" style="vertical-align:top;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:18px;">
                      <tr>
                        <td width="40" style="vertical-align:middle;padding-right:12px;">
                          <div style="background-color:${cardIconBg};border-radius:10px;width:38px;height:38px;text-align:center;line-height:38px;font-size:18px;display:block;">
                            📅
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-size:10px;font-weight:700;color:#64748b;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:3px;">
                            Expiry Date
                          </div>
                          <div style="font-size:15px;font-weight:700;color:#1e293b;">
                            ${renewalDate}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="vertical-align:top;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:18px;">
                      <tr>
                        <td width="40" style="vertical-align:middle;padding-right:12px;">
                          <div style="background-color:${cardIconBg};border-radius:10px;width:38px;height:38px;text-align:center;line-height:38px;font-size:18px;display:block;">
                            ⏱️
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-size:10px;font-weight:700;color:#64748b;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:3px;">
                            Time Left
                          </div>
                          <div style="font-size:15px;font-weight:700;color:#1e293b;">
                            ${daysLeft} Days
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Footer Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:36px;padding-top:24px;border-top:1px solid #eef1f6;">
                <tr>
                  <td style="color:#94a3b8;font-size:12px;line-height:1.6;font-weight:400;">
                    <p style="margin:0 0 4px 0;">This is an automated workflow notification from Renewal management system.</p>
                    <p style="margin:0;">Please do not reply directly to this system-generated email.</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

export function salesReminderEmail({ clientName, service, renewalDate, daysLeft }) {
  clientName = escapeHtml(clientName);
  service = escapeHtml(service);
  return {
    subject: `Client Renewal Follow-Up Required – ${clientName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:36px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">⚡ Action Required</h1>
              <p style="color:#fef3c7;margin:8px 0 0;font-size:14px;">Client Follow-Up Needed</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 20px;">Dear <strong>CST/Sales Team</strong>,</p>
              <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
                Please meet client <strong style="color:#d97706;">${clientName}</strong> regarding their upcoming renewal.
              </p>
              <div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:8px;padding:20px;margin:0 0 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;color:#92400e;font-size:13px;">Client</td>
                    <td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${clientName}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#92400e;font-size:13px;">Service</td>
                    <td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${service}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#92400e;font-size:13px;">Renewal Date</td>
                    <td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${renewalDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#92400e;font-size:13px;">Days Left</td>
                    <td style="padding:6px 0;color:#ef4444;font-size:14px;font-weight:700;text-align:right;">${daysLeft} days</td>
                  </tr>
                </table>
              </div>
              <p style="color:#94a3b8;font-size:13px;margin:32px 0 0;padding-top:20px;border-top:1px solid #e2e8f0;">
                Regards,<br><strong style="color:#1e293b;">MarsLab Renewals</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#fffbeb;padding:20px 40px;text-align:center;">
              <p style="color:#92400e;font-size:12px;margin:0;">Powered by MarsLab Renewal Management System</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  };
}

export function renewalExpiredAdminEmail({ clientName, service, renewalDate, uniqueId, owner, secondaryEmail }) {
  clientName = escapeHtml(clientName);
  service = escapeHtml(service);
  uniqueId = escapeHtml(uniqueId);
  owner = escapeHtml(owner || 'N/A');
  secondaryEmail = escapeHtml(secondaryEmail || 'N/A');
  return {
    subject: `🚨 Renewal Expired – ${clientName} (${service})`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#fef2f2;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(239,68,68,0.15);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#ef4444,#b91c1c);padding:36px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;">🚨 Renewal Expired</h1>
              <p style="color:#fecaca;margin:10px 0 0;font-size:14px;">Immediate attention required — client renewal date has passed</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 8px;">Dear <strong>Admin</strong>,</p>
              <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 28px;">
                The following client's renewal has <strong style="color:#dc2626;">expired</strong>.
                Please review and take the necessary action. The CST team has been notified and
                is expected to provide a reason for the expiry through the RMT portal.
              </p>

              <!-- Detail Card -->
              <div style="background:#fff5f5;border:1px solid #fecaca;border-left:5px solid #ef4444;border-radius:10px;padding:24px;margin:0 0 28px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;color:#7f1d1d;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Client Name</td>
                    <td style="padding:8px 0;color:#1e293b;font-size:15px;font-weight:700;text-align:right;">${clientName}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="border-bottom:1px solid #fee2e2;padding:0;"></td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#7f1d1d;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Service</td>
                    <td style="padding:8px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${service}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="border-bottom:1px solid #fee2e2;padding:0;"></td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#7f1d1d;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Renewal Date (Expired)</td>
                    <td style="padding:8px 0;color:#dc2626;font-size:14px;font-weight:700;text-align:right;">${renewalDate}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="border-bottom:1px solid #fee2e2;padding:0;"></td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#7f1d1d;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Record ID</td>
                    <td style="padding:8px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;font-family:monospace;">${uniqueId}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="border-bottom:1px solid #fee2e2;padding:0;"></td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#7f1d1d;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">CST Owner</td>
                    <td style="padding:8px 0;color:#1e293b;font-size:14px;text-align:right;">${owner}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="border-bottom:1px solid #fee2e2;padding:0;"></td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#7f1d1d;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Client Secondary Mail</td>
                    <td style="padding:8px 0;color:#1e293b;font-size:14px;text-align:right;">${secondaryEmail}</td>
                  </tr>
                </table>
              </div>

              <!-- Status Badge -->
              <div style="text-align:center;margin:0 0 28px;">
                <span style="display:inline-block;background:#fee2e2;color:#b91c1c;font-size:13px;font-weight:700;padding:8px 24px;border-radius:99px;border:1.5px solid #fca5a5;letter-spacing:0.3px;">
                  ● STATUS: EXPIRED
                </span>
              </div>

              <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px;background:#f8fafc;border-radius:8px;padding:16px;">
                📌 <strong>Next Steps:</strong> Please log in to the
                <a href="${process.env.FRONTEND_URL || 'https://rmt.marslabintel.com'}/renewals" style="color:#dc2626;font-weight:600;">RMT Portal</a>
                to review the record and follow up with the CST team on the expiry reason.
              </p>

              <p style="color:#94a3b8;font-size:13px;margin:32px 0 0;padding-top:20px;border-top:1px solid #fee2e2;">
                This is an automated alert from the Renewal Management System.<br>
                <strong style="color:#1e293b;">MarsLab Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#fff5f5;padding:20px 40px;text-align:center;">
              <p style="color:#b91c1c;font-size:12px;margin:0;">MarsLab Renewal Management System &nbsp;|&nbsp; Automated Alert</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  };
}

export function automationToggleEmail({ action, note, adminName }) {
  note = escapeHtml(note);
  adminName = escapeHtml(adminName);
  const isStart = action === 'start';
  const color = isStart ? '#10b981' : '#ef4444';
  const gradient = isStart 
    ? 'linear-gradient(135deg, #10b981, #059669)' 
    : 'linear-gradient(135deg, #ef4444, #b91c1c)';
  const statusLabel = isStart ? 'STARTED / ACTIVE' : 'STOPPED / PAUSED';
  const subject = `⚠️ Email Automation has been ${isStart ? 'STARTED' : 'STOPPED'} for Renewal Management`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="550" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.05);border:1px solid #e2e8f0;">
          <!-- Header Banner -->
          <tr>
            <td style="background:${gradient};padding:36px 40px;color:#ffffff;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px auto;">
                <tr>
                  <td style="background-color:rgba(255,255,255,0.25);border-radius:100px;padding:6px 16px;font-size:11px;font-weight:700;color:#ffffff;letter-spacing:1px;text-transform:uppercase;">
                    ${isStart ? '⚙️ Automation Active' : '🛑 Automation Paused'}
                  </td>
                </tr>
              </table>
              <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">
                Email Automation ${isStart ? 'Resumed' : 'Suspended'}
              </h1>
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);">
                Renewal Management System Update
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.6;color:#1e293b;font-weight:500;">
                Hello Team,
              </p>
              <p style="margin:0 0 24px 0;font-size:15px;color:#475569;line-height:1.6;">
                This is to notify you that the automated renewal notification emails have been <strong>${isStart ? 'started' : 'stopped'}</strong> by the administrator. Please find the action details below:
              </p>

              <!-- Details Card -->
              <div style="background:#f8fafc;border-left:4px solid ${color};border-radius:8px;padding:20px;margin-bottom:24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:13px;width:35%;">Action</td>
                    <td style="padding:6px 0;color:${color};font-size:14px;font-weight:700;text-align:right;">${statusLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:13px;">Performed By</td>
                    <td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${adminName}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:13px;">Reason / Note</td>
                    <td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;word-break:break-word;">${note}</td>
                  </tr>
                </table>
              </div>

              ${isStart 
                ? `<p style="margin:0 0 24px 0;font-size:14px;color:#047857;background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px;line-height:1.5;">
                     ✅ <strong>Notice:</strong> Automated daily checks are now running. Clients with upcoming renewals (30, 20, 15, 10, 5, or 3 days left) will receive reminder notifications as scheduled.
                   </p>`
                : `<p style="margin:0 0 24px 0;font-size:14px;color:#b91c1c;background-color:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px;line-height:1.5;">
                     ⚠️ <strong>Important:</strong> Automated daily checks are currently paused. No client reminder notifications or sales team alerts will be sent out until this is resumed.
                   </p>`
              }

              <!-- CTA / Link -->
              <div style="text-align:center;margin:30px 0 10px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard" style="background-color:${color};color:#ffffff;padding:12px 28px;text-decoration:none;font-weight:700;border-radius:8px;display:inline-block;box-shadow:0 4px 12px ${isStart ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'};">Go to Dashboard</a>
              </div>

              <p style="color:#94a3b8;font-size:13px;margin:32px 0 0;padding-top:20px;border-top:1px solid #e2e8f0;line-height:1.5;">
                Regards,<br>
                <strong style="color:#1e293b;">MarsLab Renewal System</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">Powered by MarsLab Renewal Management System &nbsp;|&nbsp; Automated Alert</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

