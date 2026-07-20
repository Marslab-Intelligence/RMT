import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from '../db.js';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || '';

// SECURITY: Refuse to start in production with default/weak JWT secret
if (process.env.NODE_ENV === 'production' && (JWT_SECRET.length < 32 || JWT_SECRET === 'rms-default-secret-key' || JWT_SECRET === '')) {
  console.error('🔴 FATAL: JWT_SECRET is not set or is too weak for production. Set a random 64-char secret.');
  process.exit(1);
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
