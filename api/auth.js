const crypto = require('crypto');

function generateToken() {
  return crypto.randomBytes(48).toString('hex');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD non configuré' });
  }

  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  const token = generateToken();

  const isDev = process.env.VERCEL_ENV !== 'production';

  res.setHeader('Set-Cookie', `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${isDev ? '' : '; Secure'}`);

  return res.status(200).json({ success: true, token });
};
