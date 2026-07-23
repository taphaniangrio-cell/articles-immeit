const { generateArticle } = require('../lib/ai-client');
const rateLimit = require('../lib/rateLimit');
const sanitizeInput = require('../lib/sanitize');
const { requireAuth, requireCsrf } = require('../lib/auth');
const { log } = require('../lib/logger');
const cors = require('../lib/cors');
const { CONSTANTS } = require('../lib/constants');

module.exports = requireAuth(async (req, res) => {
  if (cors(res, req)) return;
  if (!requireCsrf(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (!await rateLimit(ip, 'generate', CONSTANTS.RATE_LIMIT_GENERATE)) {
    return res.status(429).json({ error: 'Trop de requetes. Reessaie dans 1 minute.' });
  }

  try {
    const { news, feedback, provider, model, customPrompt } = req.body;

    if (!customPrompt && (!news || !news.titre)) {
      return res.status(400).json({ error: 'Actualite source ou sujet libre requis' });
    }

    if (customPrompt && customPrompt.trim().length < 3) {
      return res.status(400).json({ error: 'Sujet trop court (min. 3 caracteres)' });
    }

    const sanitizedPrompt = customPrompt ? sanitizeInput(customPrompt) : null;
    const resolvedProvider = provider || 'mistral';
    const resolvedModel = model || null;

    log('info', 'generate_preview_start', { provider: resolvedProvider, model: resolvedModel });

    const article = await generateArticle(news, feedback || '', resolvedProvider, resolvedModel, sanitizedPrompt || null);

    log('info', 'generate_preview_done', { modelUsed: article._modelUsed });

    return res.status(200).json({
      accroche_a: article.accroche_a || null,
      accroche_b: article.accroche_b || null,
      corps: article.corps || '',
      hashtags: article.hashtags || [],
      image_keywords: article.image_keywords || [],
      _modelUsed: article._modelUsed || null,
    });
  } catch (err) {
    log('error', 'generate_preview_error', { error: err.message });
    if (err.message === 'QUOTA') {
      return res.status(429).json({ error: 'Quota API depasse. Reessaie plus tard ou change de fournisseur.' });
    }
    if (err.message === 'CLE_INVALIDE') {
      return res.status(401).json({ error: 'Cle API invalide ou manquante pour ce fournisseur.' });
    }
    return res.status(500).json({ error: 'Erreur lors de la generation. Reessaie.' });
  }
});
