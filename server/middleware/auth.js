/**
 * JWT Authentication Middleware
 * Verifies the Bearer token sent in Authorization header.
 * Attaches decoded teacher payload to req.teacher.
 */

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'lostfound_super_secret_jwt_key_2026';

/**
 * requireAuth — must be a valid logged-in campus account
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please sign in as a student or faculty member.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.teacher = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, error: 'Invalid token. Authentication failed.' });
  }
}

function requireFaculty(req, res, next) {
  if (!req.teacher || req.teacher.role !== 'teacher') {
    return res.status(403).json({ success: false, error: 'Faculty authorization is required for this action.' });
  }
  next();
}

/**
 * optionalAuth — attach teacher if token present, but don't block
 * (used for routes that return extra data to teachers)
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.teacher = jwt.verify(token, JWT_SECRET);
    } catch (_) {
      req.teacher = null;
    }
  } else {
    req.teacher = null;
  }
  next();
}

module.exports = { requireAuth, requireFaculty, optionalAuth };
