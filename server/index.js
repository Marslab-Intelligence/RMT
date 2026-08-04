import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dns = require('dns');

// DNS lookup override to bypass musl getaddrinfo bug in Alpine Docker container
const originalLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  let cb = callback;
  let opt = {};

  if (typeof options === 'function') {
    cb = options;
  } else if (typeof options === 'number') {
    opt = { family: options };
  } else if (options) {
    opt = options;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return originalLookup(hostname, options, cb);
  }

  const family = opt.family || 4;
  if (family === 6) {
    dns.resolve6(hostname, (err, addresses) => {
      if (err) return originalLookup(hostname, options, cb);
      if (opt.all) {
        cb(null, addresses.map(a => ({ address: a, family: 6 })));
      } else {
        cb(null, addresses[0], 6);
      }
    });
  } else {
    dns.resolve4(hostname, (err, addresses) => {
      if (err) return originalLookup(hostname, options, cb);
      if (opt.all) {
        cb(null, addresses.map(a => ({ address: a, family: 4 })));
      } else {
        cb(null, addresses[0], 4);
      }
    });
  }
};

import authRoutes from './routes/auth.js';
import renewalRoutes from './routes/renewals.js';
import dashboardRoutes from './routes/dashboard.js';
import webhookRoutes from './routes/webhooks.js';
import visitRoutes from './routes/visits.js';
import adminUsersRoutes from './routes/adminUsers.js';
import automationRoutes from './routes/automation.js';
import pricingRoutes from './routes/pricing.js';
import { startScheduler } from './services/scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// SECURITY: HTTP Security Headers via helmet
// Mitigates: XSS, clickjacking, MIME sniffing, HSTS enforcement
// ============================================================
try {
  const helmetModule = await import('helmet');
  const helmet = helmetModule.default;
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://static.cloudflareinsights.com'], // Required for Vite SPA bundles, Leaflet & Cloudflare Insights
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://unpkg.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org', 'https://tile.openstreetmap.org', 'https://unpkg.com'],
        connectSrc: ["'self'", 'https://cloudflareinsights.com', 'https://static.cloudflareinsights.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false, // Allow external resources for SPA
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));
  console.log('🔒 Helmet security headers enabled');
} catch {
  console.warn('⚠️  helmet not installed — skipping security headers. Run: npm install helmet');
}

// ============================================================
// SECURITY: Rate Limiting — prevents brute-force & DoS
// ============================================================
try {
  const { rateLimit } = await import('express-rate-limit');

  const isProd = process.env.NODE_ENV === 'production';

  // General API rate limit: 10000 req / 15 min in prod, virtually unlimited in dev
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 10000 : 999999,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

  // Strict auth rate limit: 200 req / 15 min in prod, virtually unlimited in dev
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 200 : 999999,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please wait 15 minutes.' },
  });

  app.use('/api/', apiLimiter);
  app.use('/api/auth/', authLimiter);
  console.log('🔒 Rate limiting enabled');
} catch {
  console.warn('⚠️  express-rate-limit not installed — skipping rate limiting. Run: npm install express-rate-limit');
}

// ============================================================
// SECURITY: CORS — restrict to configured origins only
// ============================================================
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3005',
  'http://localhost:3001',
  'http://localhost:3000',
  'http://127.0.0.1:3005',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3000',
  'http://13.232.180.247:30001',
  'http://13.232.180.247',
  'https://13.232.180.247',
  'http://rmt.marslabintel.com',
  'https://rmt.marslabintel.com',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server (no Origin header), whitelisted origins, or any marslabintel.com subdomain
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('marslabintel.com') || origin.includes('13.232.180.247')) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error(`CORS: origin "${origin}" not allowed`));
    }
  },
  credentials: true, // Required for HttpOnly cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ============================================================
// Body parsers — with payload size limits to prevent DoS
// ============================================================
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use(cookieParser()); // Parse HttpOnly refresh-token cookie

// ============================================================
// HTTP Request Logger — path only, never query strings
// (query strings can contain tokens / sensitive params)
// ============================================================
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

import tilesRoutes from './routes/tiles.js';

// ============================================================
// Routes
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/renewals', renewalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/tiles', tilesRoutes);
app.use('/api/pricing', pricingRoutes);

// Client-side error telemetry — sanitized to prevent log injection
app.post('/api/log-error', express.json({ limit: '10kb' }), (req, res) => {
  const message = String(req.body?.message || '').slice(0, 500);
  const stack   = String(req.body?.stack   || '').slice(0, 2000);
  // Strip any newline characters to prevent log-injection attacks
  const safeMsg   = message.replace(/[\r\n]/g, ' ');
  const safeStack = stack.replace(/[\r\n]/g, ' | ');
  console.error('❌ [Client Error]:', safeMsg, safeStack ? `\n${safeStack}` : '');
  res.sendStatus(200);
});

// Health check — minimal, no internal details exposed
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================
// Serve frontend SPA in production
// ============================================================
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import fs from 'fs';

const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    index: false, // Don't auto-serve directory index
    setHeaders: (res, filePath) => {
      // Prevent HTML files from being cached (so deploys are always fresh)
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  // Catch-all 404 handler for unmatched API endpoints to prevent returning index.html HTML
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
  });

  // Explicitly return 404 for missing static assets instead of serving index.html HTML
  app.use(['/assets/*', '/*.js', '/*.css', '/*.map', '/*.json', '/*.png', '/*.jpg', '/*.svg', '/*.ico', '/*.woff2'], (req, res) => {
    res.status(404).type('text/plain').send('Asset not found');
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ============================================================
// Global Error Handler — never expose stack traces in production
// ============================================================
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const isDev = process.env.NODE_ENV !== 'production';
  console.error('[Unhandled Error]', err.message, isDev ? err.stack : '');
  res.status(status).json({
    error: isDev ? err.message : 'An internal error occurred.',
  });
});

import { initDb } from './db.js';

app.listen(PORT, async () => {
  await initDb();
  console.log(`🚀 RenewalPro API running on http://localhost:${PORT}`);
  startScheduler();
});
