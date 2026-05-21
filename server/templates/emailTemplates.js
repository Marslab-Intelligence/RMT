export function clientReminderEmail({ clientName, service, renewalDate, daysLeft }) {
  return {
    subject: `Renewal Reminder – ${service}`,
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
            <td style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:36px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">🔔 Renewal Reminder</h1>
              <p style="color:#c7d2fe;margin:8px 0 0;font-size:14px;">${daysLeft} days until your renewal</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 20px;">Dear <strong>${clientName}</strong>,</p>
              <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
                This is a friendly reminder that your <strong style="color:#4f46e5;">${service}</strong> renewal is due on 
                <strong style="color:#1e293b;">${renewalDate}</strong>.
              </p>
              <div style="background:#f8fafc;border-left:4px solid #6366f1;border-radius:8px;padding:20px;margin:0 0 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:4px 0;color:#64748b;font-size:13px;">Service</td>
                    <td style="padding:4px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${service}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#64748b;font-size:13px;">Renewal Date</td>
                    <td style="padding:4px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${renewalDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#64748b;font-size:13px;">Days Remaining</td>
                    <td style="padding:4px 0;color:#ef4444;font-size:14px;font-weight:600;text-align:right;">${daysLeft} days</td>
                  </tr>
                </table>
              </div>
              <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 32px;">
                Please contact us at your earliest convenience to ensure uninterrupted service.
              </p>
              <p style="color:#94a3b8;font-size:13px;margin:32px 0 0;padding-top:20px;border-top:1px solid #e2e8f0;">
                Warm regards,<br><strong style="color:#1e293b;">MarsLab Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">Powered by MarsLab Renewal Management System</p>
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

export function salesReminderEmail({ clientName, service, renewalDate, daysLeft }) {
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
              <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 20px;">Dear <strong>CST Team</strong>,</p>
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
