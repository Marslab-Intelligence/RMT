import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from '../db.js';
dotenv.config();

// No hardcoded fallback: a leaked default here would let anyone forge a
// valid session token. Production supplies this via a Kubernetes Secret;
// local dev supplies it via .env — either way, a missing value is a
// configuration error that must stop the server, not a silent downgrade.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET environment variable is missing or too short (must be at least 32 characters). Refusing to start.');
}

// Keep the function signature synchronous to avoid breaking imports but use async internally if needed, or make it async.
// Since Express allows async middleware, making it async is completely standard.
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user is active in DB
    const { rows } = await db.query('SELECT is_active FROM users WHERE id = $1', [decoded.id]);
    if (rows.length === 0 || !rows[0].is_active) {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for this action.' });
    }
    next();
  };
}
