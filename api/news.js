const { fetchNews } = require('../lib/rss-fetcher');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const news = await fetchNews();
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    return res.status(200).json({ news });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
