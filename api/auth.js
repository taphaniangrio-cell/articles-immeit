const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('../lib/rateLimit');

function generateToken() {
  return crypto.randomBytes(48).toString('hex');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (!rateLimit(ip, 'auth', { max: 10, windowMs: 60_000 })) {
    return res.status(429).json({ error: 'Trop de tentatives. Réessaie dans 1 minute.' });
  }

  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const passwordHash = process.env.PASSWORD_HASH;

  if (!adminPassword && !passwordHash) {
    return res.status(500).json({ error: 'Authentification non configurée' });
  }

  let ok = false;
  if (passwordHash) {
    ok = bcrypt.compareSync(String(password || ''), passwordHash);
  } else {
    ok = password === adminPassword;
  }

  if (!ok) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  const token = generateToken();
  const isDev = process.env.VERCEL_ENV !== 'production';

  res.setHeader('Set-Cookie', `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${isDev ? '' : '; Secure'}`);

  return res.status(200).json({ success: true, token });
};
