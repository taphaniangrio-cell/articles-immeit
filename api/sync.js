const autoSync = require('../lib/auto-sync');
const cors = require('../lib/cors');
const { requireAuth } = require('../lib/auth');
const { log } = require('../lib/logger');
const db = require('../lib/db');

async function readDBCache() {
  try {
    const r = await db.query("SELECT cache_data FROM dashboard_cache WHERE cache_key = 'sharepoint_suivi_2026'");
    if (r.rows.length > 0) return r.rows[0].cache_data;
  } catch (e) { log('warn', 'sync_db_cache_read_failed', { error: e.message }); }
  return null;
}

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
  } catch (e) {
    log('warn', 'sync_auto_fallback', { error: e.message });
  }

  // Fallback: try DB cache (for Vercel serverless where SharePoint auth can't work)
  const dbCache = await readDBCache();
  if (dbCache && dbCache.items && dbCache.items.length > 0) {
    return res.status(200).json({
      success: true,
      count: dbCache.items.length,
      rawCount: dbCache._rawCount,
      syncedAt: dbCache.syncedAt,
      source: 'db_cache',
      message: `${dbCache.items.length} demandes (cache base de données)`,
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
    message: 'Aucune donnée disponible. Synchronise d\'abord en local avec node server.mjs.',
  });
});
