const autoSync = require('../lib/auto-sync');
const sharepoint = require('../lib/sharepoint');
const cors = require('../lib/cors');
const { requireAuth } = require('../lib/auth');
const { log } = require('../lib/logger');
const db = require('../lib/db');

async function saveToDB(data) {
  try {
    await db.query(
      `INSERT INTO dashboard_cache (cache_key, cache_data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (cache_key) DO UPDATE SET cache_data = $2, updated_at = NOW()`,
      ['sharepoint_suivi_2026', JSON.stringify(data)]
    );
    return true;
  } catch (e) { log('warn', 'sync_db_save_failed', { error: e.message }); }
  return false;
}

module.exports = requireAuth(async (req, res) => {
  if (cors(res, req)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST requis' });
  }

  // 1. Try autoSync (InteractiveBrowserCredential — local dev only)
  try {
    const data = await autoSync.sync();
    if (data) {
      await saveToDB(data);
      return res.status(200).json({
        success: true,
        count: data.items.length,
        rawCount: data._rawCount,
        syncedAt: data.syncedAt,
        source: data.source,
        message: data.items.length + ' demandes synchronisées',
      });
    }
  } catch (e) {
    log('warn', 'sync_auto_fallback', { error: e.message });
  }

  // 2. Try client_credentials fetch (works on Vercel)
  try {
    const spData = await sharepoint.fetchDashboardData();
    if (spData.connected && spData.items && spData.items.length > 0) {
      const cacheData = { headers: spData.headers, items: spData.items, syncedAt: new Date().toISOString(), source: 'sharepoint_client_credentials', _rawCount: spData._rawCount };
      await saveToDB(cacheData);
      return res.status(200).json({
        success: true,
        count: spData.items.length,
        rawCount: spData._rawCount,
        syncedAt: cacheData.syncedAt,
        source: 'sharepoint_client_credentials',
        message: spData.items.length + ' demandes synchronisées depuis SharePoint',
      });
    }
  } catch (e) {
    log('warn', 'sync_client_creds_fallback', { error: e.message });
  }

  // 3. Fallback: try existing DB cache
  try {
    const r = await db.query("SELECT cache_data FROM dashboard_cache WHERE cache_key = 'sharepoint_suivi_2026'");
    if (r.rows.length > 0) {
      const dbCache = r.rows[0].cache_data;
      if (dbCache && dbCache.items && dbCache.items.length > 0) {
        return res.status(200).json({
          success: true,
          count: dbCache.items.length,
          rawCount: dbCache._rawCount,
          syncedAt: dbCache.syncedAt,
          source: 'db_cache',
          message: dbCache.items.length + ' demandes (cache base de données)',
        });
      }
    }
  } catch (e) { log('warn', 'sync_db_cache_read_failed', { error: e.message }); }

  // 4. Fallback: local cache file
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
    message: 'Aucune donnée disponible. Configure les variables SharePoint ou synchronise en local.',
  });
});
