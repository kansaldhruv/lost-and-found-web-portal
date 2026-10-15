/**
 * ══════════════════════════════════════════════════════════════════════════
 *   LOST & FOUND CAMPUS PORTAL  —  EXPRESS BACKEND SERVER
 *   Entry point: server/index.js
 *
 *   API Routes:
 *     POST   /api/auth/login              → Teacher login (JWT)
 *     GET    /api/auth/me                 → Current teacher profile
 *     POST   /api/auth/logout             → Logout (informational)
 *
 *     GET    /api/items                   → List items (filtered, sorted)
 *     GET    /api/items/:id               → Get single item
 *     POST   /api/items                   → Post found item  [TEACHER]
 *     PUT    /api/items/:id               → Update item      [TEACHER]
 *     DELETE /api/items/:id               → Delete item      [TEACHER]
 *     POST   /api/items/upload-image      → Upload photo     [TEACHER]
 *
 *     GET    /api/claims                  → Track claim (by ID/roll/email)
 *     GET    /api/claims/all              → All claims       [TEACHER]
 *     POST   /api/claims                  → Submit claim     [PUBLIC]
 *     PUT    /api/claims/:id/approve      → Approve claim    [TEACHER]
 *     PUT    /api/claims/:id/reject       → Reject claim     [TEACHER]
 *
 *     GET    /api/history                 → Return history
 *     POST   /api/history/return          → Record handover  [TEACHER]
 *
 *     GET    /api/stats                   → Dashboard stats
 *
 *   Static Files:
 *     GET /uploads/:filename              → Serve uploaded images
 *     GET /                               → Serve index.html (frontend)
 * ══════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Ensure data and uploads directories exist ─────────────────────────────
const DATA_DIR    = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
[DATA_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Core Middleware ───────────────────────────────────────────────────────
app.use(cors({
  origin: '*',                             // In prod: restrict to your domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request Logger (dev only) ─────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ── Serve Uploaded Images ─────────────────────────────────────────────────
app.use('/uploads', express.static(UPLOADS_DIR));

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/items',   require('./routes/items'));
app.use('/api/claims',  require('./routes/claims'));
app.use('/api/history', require('./routes/history'));
app.use('/api/stats',   require('./routes/stats'));

// ── Health Check ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    status:  'ok',
    service: 'Lost & Found Campus Portal API',
    version: '1.0.0',
    uptime:  process.uptime().toFixed(1) + 's',
    time:    new Date().toISOString()
  });
});

// ── Serve Frontend Static Files ────────────────────────────────────────────
// index.html, styles.css, app.js are in the project root (parent directory)
const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR, {
  index: 'index.html',
  // Exclude node_modules and server folder from static serving
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache');
  }
}));

// ── Fallback: all non-API routes serve index.html (SPA support) ──────────
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ── Global Error Handler ──────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[UNHANDLED ERROR]', err);

  // Multer-specific errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: 'File too large. Maximum size is 5 MB.' });
  }
  if (err.message && err.message.includes('Only image files')) {
    return res.status(400).json({ success: false, error: err.message });
  }

  res.status(err.status || 500).json({
    success: false,
    error:   process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message
  });
});

// ── Start Server ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  🏫  LOST & FOUND CAMPUS PORTAL  —  BACKEND API       ║`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  🌐  Frontend:   http://localhost:${PORT}                 ║`);
  console.log(`║  🔌  API Base:   http://localhost:${PORT}/api             ║`);
  console.log(`║  🩺  Health:     http://localhost:${PORT}/api/health      ║`);
  console.log(`║  📂  Data Dir:   ${path.relative(process.cwd(), DATA_DIR)}            ║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');
});

module.exports = app;
