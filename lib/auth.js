const crypto = require('crypto');
const { log } = require('./logger');
const { CONSTANTS } = require('./constants');

const SESSION_TTL = CONSTANTS.SESSION_TTL;
const revokedTokens = new Set();

async function isTokenRevoked(token) {
  if (revokedTokens.has(token)) return true;
  try {
    const db = require('./db');
    const result = await db.query(
      'SELECT 1 FROM revoked_sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET non configuré — génère-en un avec : crypto.randomBytes(32).toString("hex")');
  }
  return secret;
}

function createSession() {
  const random = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now().toString(36);
  const payload = `${timestamp}.${random}`;
  const hmac = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

async function destroySession(token) {
  if (token) {
    revokedTokens.add(token);
    setTimeout(() => revokedTokens.delete(token), SESSION_TTL);
    try {
      const db = require('./db');
      await db.query(
        'INSERT INTO revoked_sessions (token, expires_at) VALUES ($1, NOW() + INTERVAL \'7 days\') ON CONFLICT DO NOTHING',
        [token]
      );
    } catch {}
  }
}

async function isValidSession(token) {
  if (!token || typeof token !== 'string') return false;
  if (await isTokenRevoked(token)) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [timestampB36, random, signature] = parts;
  const payload = `${timestampB36}.${random}`;
  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  if (signature.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  const createdAt = parseInt(timestampB36, 36);
  if (isNaN(createdAt)) return false;
  return Date.now() - createdAt < SESSION_TTL;
}

function requireAuth(handler) {
  return async (req, res) => {
    if (req.method === 'OPTIONS') {
      return handler(req, res);
    }
    const cookie = req.headers?.cookie || '';
    const token = cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('session='))
      ?.split('=')[1]
      ?.trim();

    if (!token || !(await isValidSession(token))) {
      log('warn', 'auth_failed', { path: req.url, method: req.method });
      return res.status(401).json({ error: 'Non authentifié. Veuillez vous connecter.' });
    }

    return handler(req, res);
  };
}

function requireCsrf(req, res) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return true;
  }
  const cookie = req.headers?.cookie || '';
  const csrfCookie = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('csrf='))?.split('=')[1]?.trim();
  const csrfHeader = req.headers['x-csrf-token'];
  if (!csrfCookie || !csrfHeader) {
    log('warn', 'csrf_failed', { path: req.url, method: req.method });
    res.status(403).json({ error: 'CSRF token invalide' });
    return false;
  }
  // Comparaison timing-safe pour éviter les timing attacks
  try {
    const a = Buffer.from(csrfCookie);
    const b = Buffer.from(csrfHeader);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      log('warn', 'csrf_failed', { path: req.url, method: req.method });
      res.status(403).json({ error: 'CSRF token invalide' });
      return false;
    }
  } catch {
    log('warn', 'csrf_failed', { path: req.url, method: req.method });
    res.status(403).json({ error: 'CSRF token invalide' });
    return false;
  }
  return true;
}

module.exports = { requireAuth, requireCsrf, createSession, destroySession: async (token) => await destroySession(token) };
