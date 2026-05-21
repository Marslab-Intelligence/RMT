import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'rms-default-secret-key';
const BASE = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.in';
const CLIENT_ID = process.env.ZOHO_CLIENT_ID || '';
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.ZOHO_REDIRECT_URI || 'http://localhost:3001/api/auth/zoho/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// ==========================================
// ZOHO SSO IMPLEMENTATION (Primary Login)
// ==========================================

// 1. Redirect to Zoho Login
router.get('/zoho', (req, res) => {
  console.log('📥 GET /api/auth/zoho - Initiating Zoho SSO redirect');
  if (!CLIENT_ID) {
    console.error('❌ ZOHO_CLIENT_ID is not configured.');
    return res.status(500).json({ error: 'ZOHO_CLIENT_ID is not configured.' });
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'AaaServer.profile.Read,email',
    access_type: 'online',
  });

  const zohoAuthUrl = `${BASE}/oauth/v2/auth?${params}`;
  console.log(`🔗 Redirecting to: ${zohoAuthUrl}`);
  res.redirect(zohoAuthUrl);
});

// 1b. Redirect to Zoho Logout to clear SSO session cache
router.get('/zoho/logout', (req, res) => {
  console.log('📥 GET /api/auth/zoho/logout - Redirecting to Zoho logout');
  const logoutUrl = `${BASE}/logout?serviceurl=${encodeURIComponent(FRONTEND_URL + '/login')}`;
  res.redirect(logoutUrl);
});

// 2. Handle Zoho Callback
router.get('/zoho/callback', async (req, res) => {
  const { code, error } = req.query;
  console.log(`📥 GET /api/auth/zoho/callback - code: ${code ? 'PRESENT' : 'MISSING'}, error: ${error || 'none'}`);

  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}/login?error=sso_failed`);
  }

  try {
    // Exchange authorization code for access token
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
    });

    const { data: tokens } = await axios.post(
      `${BASE}/oauth/v2/token`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    console.log('✅ Token exchange successful');

    if (tokens.error) {
      console.error('❌ Zoho Token Error:', tokens);
      return res.redirect(`${FRONTEND_URL}/login?error=token_exchange_failed`);
    }

    // Fetch user profile from Zoho
    const { data: profile } = await axios.get(
      `${BASE}/oauth/v2/userinfo`,
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );

    console.log('✅ Profile fetched:', profile.email || profile.Email);

    const zohoEmail = profile.email || profile.Email;
    const zohoName = profile.name || profile.Display_Name || '';

    if (!zohoEmail) {
      console.error('❌ Could not retrieve email from Zoho profile:', profile);
      return res.redirect(`${FRONTEND_URL}/login?error=no_email`);
    }

    // Find user in our database
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [zohoEmail]);
    const user = rows[0];

    if (!user) {
      console.log(`❌ User not found in DB for email: ${zohoEmail}`);
      return res.redirect(`${FRONTEND_URL}/login?error=access_denied`);
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Log activity
    await db.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, details)
      VALUES ($1, 'login', 'user', $2)
    `, [user.id, `${user.full_name} logged in via Zoho SSO.`]);

    console.log(`✅ SSO login successful for ${user.email} (${user.role})`);

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}/?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('[SSO Error]', err.message);
    if (err.response) {
      console.error('[SSO Response]', err.response.status, err.response.data);
    }
    res.redirect(`${FRONTEND_URL}/login?error=sso_error`);
  }
});

// ==========================================
// STANDARD AUTH ROUTES
// ==========================================

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, username, email, full_name, role, avatar_color FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      avatarColor: user.avatar_color,
    });
  } catch(err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];

    if (!await bcrypt.compare(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hash, req.user.id]);

    await db.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, details)
      VALUES ($1, 'password_change', 'user', 'Password changed successfully.')
    `, [req.user.id]);

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
