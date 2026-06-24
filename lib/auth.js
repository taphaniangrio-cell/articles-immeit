const { log } = require('./logger');

const sessions = new Map();

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  for (const [token, expiry] of sessions) {
    if (now > expiry) sessions.delete(token);
  }
}

setInterval(cleanup, 60 * 60 * 1000);

function createSession(token) {
  sessions.set(token, Date.now() + SESSION_TTL);
}

function destroySession(token) {
  sessions.delete(token);
}

function isValidSession(token) {
  if (!token || !sessions.has(token)) return false;
  const expiry = sessions.get(token);
  if (Date.now() > expiry) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAuth(handler) {
  return async (req, res) => {
    const cookie = req.headers?.cookie || '';
    const token = cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('session='))
      ?.split('=')[1]
      ?.trim();

    if (!token || !isValidSession(token)) {
      log('warn', 'auth_failed', { path: req.url, method: req.method });
      return res.status(401).json({ error: 'Non authentifié. Veuillez vous connecter.' });
    }

    return handler(req, res);
  };
}

module.exports = { requireAuth, createSession, destroySession };
