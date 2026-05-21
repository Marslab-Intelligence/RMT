import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';

let transporter = null;

if (EMAIL_ENABLED) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.in',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // STARTTLS on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // Verify connection on startup
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ SMTP connection failed:', error.message);
      console.error('   → Emails will be simulated until SMTP is fixed.');
    } else {
      console.log('✅ SMTP connection verified — real emails enabled.');
    }
  });
}

export async function sendEmail({ to, cc, subject, html }) {
  if (!EMAIL_ENABLED || !transporter) {
    console.log(`📧 [EMAIL SIMULATION] To: ${to}${cc ? ` | CC: ${cc}` : ''} | Subject: ${subject}`);
    return { success: true, simulated: true };
  }

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || `"MarsLab Renewals" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    };
    if (cc) mailOptions.cc = cc;

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}${cc ? ` (CC: ${cc})` : ''}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Email failed to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}
