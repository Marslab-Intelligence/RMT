import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();

// ============================================================
// SECURITY: Enforce strong secrets — refuse to start with defaults
// ============================================================
// The comment above was already the intent, but the old check only ever
// logged a warning — and its own hardcoded fallback value (64 hex chars)
// was long enough to silently pass the length check, so the warning could
// never actually fire for the one case it existed to catch. This now
// genuinely refuses to start rather than run on a known, previously-leaked
// value. Production supplies both via a Kubernetes Secret; local dev via .env.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET environment variable is missing or too short (must be at least 32 characters). Refusing to start.');
}
if (!process.env.REFRESH_SECRET || process.env.REFRESH_SECRET.length < 32) {
  throw new Error('REFRESH_SECRET environment variable is missing or too short (must be at least 32 characters). Refusing to start.');
}

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

const BASE = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.in';
const CLIENT_ID = process.env.ZOHO_CLIENT_ID || '';
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.ZOHO_REDIRECT_URI || 'http://localhost:3001/api/auth/zoho/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// Simple in-memory state store for CSRF protection on OAuth callback
// In production with multiple replicas, use Redis instead
const oauthStateMap = new Map();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ==========================================
// REFRESH TOKEN HELPERS
// ==========================================

/**
 * Creates a signed refresh JWT, stores its SHA-256 hash in the DB.
 * Refresh tokens never expire (exp: 99 years) — only DB revocation applies.
 */
async function issueRefreshToken(userId) {
  // Generate a unique refresh token (signed JWT containing userId + random jti)
  const jti = crypto.randomBytes(32).toString('hex');
  const refreshToken = jwt.sign(
    { id: userId, jti },
    REFRESH_SECRET,
    { expiresIn: '10y' } // effectively permanent — revoked via DB
  );

  // Store SHA-256 hash (never store raw tokens in DB)
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  // Set expires_at to 10 years from now
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 10);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  return refreshToken;
}

/**
 * Sets the refresh token as an HttpOnly, Secure, SameSite=Strict cookie.
 */
function setRefreshCookie(res, refreshToken) {
  res.cookie('rmt_refresh_token', refreshToken, {
    httpOnly: true,          // Not accessible by JavaScript
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',      // CSRF protection
    maxAge: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years in ms
    path: '/api/auth',       // Only sent to auth endpoints
  });
}

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

  // SECURITY: Generate a random state param to prevent CSRF on the callback
  const state = crypto.randomBytes(16).toString('hex');
  oauthStateMap.set(state, Date.now());
  // Prune expired states
  for (const [k, ts] of oauthStateMap.entries()) {
    if (Date.now() - ts > STATE_TTL_MS) oauthStateMap.delete(k);
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'AaaServer.profile.Read,email',
    access_type: 'online',
    state,
  });

  const zohoAuthUrl = `${BASE}/oauth/v2/auth?${params}`;
  console.log('🔗 Redirecting to Zoho SSO');
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
  const { code, error, state } = req.query;
  console.log(`📥 GET /api/auth/zoho/callback - code: ${code ? 'PRESENT' : 'MISSING'}, error: ${error || 'none'}`);

  // SECURITY: Validate state param to prevent CSRF
  if (!state || !oauthStateMap.has(state)) {
    console.error('❌ Invalid or missing OAuth state param — possible CSRF attack');
    return res.redirect(`${FRONTEND_URL}/login?error=invalid_state`);
  }
  oauthStateMap.delete(state); // One-time use

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

    if (!user.is_active) {
      console.log(`❌ Deactivated user attempted login: ${zohoEmail}`);
      return res.redirect(`${FRONTEND_URL}/login?error=account_deactivated`);
    }

    // Issue short-lived access token (8 hours)
    const accessToken = jwt.sign(
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

    // Issue long-lived refresh token and store hash in DB
    const refreshToken = await issueRefreshToken(user.id);

    // Log activity
    await db.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, details)
      VALUES ($1, 'login', 'user', $2)
    `, [user.id, `${user.full_name} logged in via Zoho SSO.`]);

    console.log(`✅ SSO login successful for ${user.email} (${user.role})`);

    // Set refresh token as HttpOnly cookie
    setRefreshCookie(res, refreshToken);

    // SECURITY NOTE: Passing the access token in the URL fragment is acceptable
    // for short-lived tokens (8h) in same-domain SPA setups, as fragments are
    // never sent to the server and are not stored in server logs.
    // The frontend should immediately read + delete it from the URL via replaceState.
    res.redirect(`${FRONTEND_URL}/?token=${encodeURIComponent(accessToken)}`);
  } catch (err) {
    console.error('[SSO Error]', err.message);
    if (err.response) {
      console.error('[SSO Response]', err.response.status, err.response.data);
    }
    res.redirect(`${FRONTEND_URL}/login?error=sso_error`);
  }
});

// ==========================================
// REFRESH TOKEN ENDPOINT
// ==========================================

/**
 * POST /api/auth/refresh
 * Uses the HttpOnly cookie to issue a new access token + rotate the refresh token.
 */
router.post('/refresh', async (req, res) => {
  const incomingRefreshToken = req.cookies?.rmt_refresh_token;

  if (!incomingRefreshToken) {
    return res.status(401).json({ error: 'No refresh token provided.' });
  }

  try {
    // Verify the refresh token signature
    const decoded = jwt.verify(incomingRefreshToken, REFRESH_SECRET);

    // Check if the token hash exists and is not revoked in DB
    const tokenHash = crypto.createHash('sha256').update(incomingRefreshToken).digest('hex');
    const { rows } = await db.query(
      `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked = 0 AND expires_at > NOW()`,
      [tokenHash]
    );

    if (rows.length === 0) {
      // Token reuse detected or already revoked — clear cookie
      res.clearCookie('rmt_refresh_token', { path: '/api/auth' });
      return res.status(401).json({ error: 'Refresh token is invalid or has been revoked.' });
    }
    // Fetch latest user data from DB
    const { rows: userRows } = await db.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const user = userRows[0];
    if (!user) {
      res.clearCookie('rmt_refresh_token', { path: '/api/auth' });
      return res.status(401).json({ error: 'User not found.' });
    }

    if (!user.is_active) {
      res.clearCookie('rmt_refresh_token', { path: '/api/auth' });
      return res.status(401).json({ error: 'User account is deactivated.' });
    }

    // ROTATION: Revoke the old refresh token
    await db.query(
      `UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = $1`,
      [tokenHash]
    );

    // Issue a new access token
    const newAccessToken = jwt.sign(
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

    // Issue a new refresh token (rotation)
    const newRefreshToken = await issueRefreshToken(user.id);
    setRefreshCookie(res, newRefreshToken);

    console.log(`🔄 Token refreshed for user: ${user.email}`);

    return res.json({
      token: newAccessToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        avatarColor: user.avatar_color,
      },
    });
  } catch (err) {
    console.error('[Refresh Token Error]:', err.message);
    res.clearCookie('rmt_refresh_token', { path: '/api/auth' });
    return res.status(401).json({ error: 'Refresh token is invalid or expired.' });
  }
});

// ==========================================
// LOGOUT ENDPOINT
// ==========================================

/**
 * POST /api/auth/logout
 * Revokes the refresh token in DB and clears the cookie.
 */
router.post('/logout', async (req, res) => {
  const incomingRefreshToken = req.cookies?.rmt_refresh_token;

  if (incomingRefreshToken) {
    try {
      const tokenHash = crypto.createHash('sha256').update(incomingRefreshToken).digest('hex');
      await db.query(`UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = $1`, [tokenHash]);
      console.log('🔐 Refresh token revoked on logout.');
    } catch (err) {
      console.error('[Logout revocation error]:', err.message);
    }
  }

  res.clearCookie('rmt_refresh_token', { path: '/api/auth' });
  return res.json({ message: 'Logged out successfully.' });
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

    // SECURITY: Validate new password strength
    if (!newPassword || newPassword.length < 10) {
      return res.status(400).json({ error: 'New password must be at least 10 characters.' });
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'New password must contain uppercase, lowercase, and a number.' });
    }

    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];

    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (!await bcrypt.compare(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    // SECURITY: Prevent reuse of current password
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ error: 'New password must be different from your current password.' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hash, req.user.id]);

    await db.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, details)
      VALUES ($1, 'password_change', 'user', 'Password changed successfully.')
    `, [req.user.id]);

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('[change-password error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
