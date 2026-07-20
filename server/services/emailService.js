import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
    // Make SMTP TLS certificate verification configurable (default to false to prevent errors)
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED === 'true',
      minVersion: 'TLSv1.2',
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

// Resolve logo path dynamically (works both in development and inside Docker container)
const getLogoPath = (filename) => {
  const paths = [
    path.join(__dirname, '../../public', filename),
    path.join(__dirname, '../../dist', filename),
    path.join(__dirname, '../public', filename),
    path.join(__dirname, '../dist', filename),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
};

export async function sendEmail({ to, cc, subject, html, from }) {
  if (!EMAIL_ENABLED || !transporter) {
    console.log(`📧 [EMAIL SIMULATION] From: ${from || 'Default'} | To: ${to}${cc ? ` | CC: ${cc}` : ''} | Subject: ${subject}`);
    return { success: true, simulated: true };
  }

  try {
    const mailOptions = {
      from: from || process.env.SMTP_FROM || '"Renewals" <renewals@sidcorptech.net>',
      to,
      subject,
      html,
    };
    if (cc) mailOptions.cc = cc;

    // If HTML references logo CIDs, attach them inline
    const attachments = [];
    if (html && html.includes('cid:marslab_logo')) {
      const logoPath = getLogoPath('logo.png');
      if (logoPath) {
        attachments.push({
          filename: 'logo.png',
          path: logoPath,
          cid: 'marslab_logo',
        });
      } else {
        console.warn('⚠️ logo.png not found in public/ or dist/');
      }
    }
    if (html && html.includes('cid:sidcorptech_logo')) {
      const logoPath = getLogoPath('sidcorptech_logo.png');
      if (logoPath) {
        attachments.push({
          filename: 'sidcorptech_logo.png',
          path: logoPath,
          cid: 'sidcorptech_logo',
        });
      } else {
        console.warn('⚠️ sidcorptech_logo.png not found in public/ or dist/');
      }
    }
    if (attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}${cc ? ` (CC: ${cc})` : ''}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Email failed to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}
