const { fetchNews } = require('../lib/rss-fetcher');
const rateLimit = require('../lib/rateLimit');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (!rateLimit(ip, 'news', { max: 20, windowMs: 60_000 })) {
    return res.status(429).json({ error: 'Trop de requêtes. Réessaie dans 1 minute.' });
  }

  try {
    const news = await fetchNews();
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    return res.status(200).json({ news });
  } catch (err) {
    console.error('[NEWS] Error:', err.message);
    return res.status(500).json({ error: 'Erreur lors du chargement des actualités.' });
  }
};
