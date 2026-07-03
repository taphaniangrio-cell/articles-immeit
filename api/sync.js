const autoSync = require('../lib/auto-sync');
const cors = require('../lib/cors');
const { requireAuth } = require('../lib/auth');
const { log } = require('../lib/logger');

module.exports = requireAuth(async (req, res) => {
  if (cors(res, req)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST requis' });
  }

  try {
    const data = await autoSync.sync();
    if (data) {
      return res.status(200).json({
        success: true,
        count: data.items.length,
        rawCount: data._rawCount,
        syncedAt: data.syncedAt,
        source: data.source,
        message: `${data.items.length} demandes synchronisées`,
      });
    }

    const cached = autoSync.loadCache();
    if (cached) {
      return res.status(200).json({
        success: true,
        count: cached.items.length,
        syncedAt: cached.syncedAt,
        source: 'cache',
      });
    }

    return res.status(200).json({
      success: false,
      count: 0,
      message: 'Aucune donnee disponible. Utilise "Coller Excel".',
    });
  } catch (err) {
    log('error', 'sync_api_error', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});
