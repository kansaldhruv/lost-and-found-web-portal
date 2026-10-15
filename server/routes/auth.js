/**
 * AUTH ROUTES  —  /api/auth
 *
 * POST /api/auth/login   — Teacher login → returns JWT
 * GET  /api/auth/me      — Get current teacher profile (requires auth)
 * POST /api/auth/logout  — Client-side only (just informational)
 */

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { Teachers, Students } = require('../lib/db');
const { requireAuth } = require('../middleware/auth');

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'lostfound_super_secret_jwt_key_2026';
const JWT_EXPIRY = process.env.JWT_EXPIRES_IN || '24h';

// ── POST /api/auth/login ─────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const account = Teachers.findByEmail(email.trim()) || Students.findByEmail(email.trim());
    if (!account) {
      return res.status(401).json({ success: false, error: 'No account found for this email.' });
    }

    const isValid = await bcrypt.compare(password, account.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Incorrect password. Please try again.' });
    }

    // Sign JWT
    const payload = {
      id:          account.id,
      email:       account.email,
      name:        account.name,
      dept:        account.dept,
      custodyRoom: account.custodyRoom,
      role:        account.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    res.json({
      success: true,
      message: `Welcome back, ${account.name}!`,
      token,
      teacher: payload
    });

  } catch (err) {
    console.error('[AUTH /login]', err);
    res.status(500).json({ success: false, error: 'Server error during login.' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, teacher: req.teacher });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────
// JWT is stateless — client should delete token. This is just a courtesy endpoint.
router.post('/logout', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Logged out. Please delete your token on the client.' });
});

module.exports = router;
