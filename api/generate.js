const { generateArticle } = require('../lib/ai-client');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { news, feedback, provider, model } = req.body;

    if (!news || !news.titre) {
      return res.status(400).json({ error: 'Actualité source requise' });
    }

    const article = await generateArticle(news, feedback || '', provider || 'groq', model || null);
    return res.status(200).json({ article });
  } catch (err) {
    if (err.message === 'QUOTA') {
      return res.status(429).json({ error: 'Quota API dépassé. Réessaie plus tard ou change de fournisseur.' });
    }
    if (err.message === 'CLÉ_INVALIDE') {
      return res.status(401).json({ error: 'Clé API invalide pour ce fournisseur.' });
    }
    return res.status(500).json({ error: err.message });
  }
};
