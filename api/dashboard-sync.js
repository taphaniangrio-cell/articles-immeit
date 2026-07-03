const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../lib/auth');
const { log } = require('../lib/logger');

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST requis' });

  try {
    const { headers, items, syncedAt, source } = req.body;
    if (!headers || !items) return res.status(400).json({ error: 'headers et items requis' });

    const cache = { headers, items, syncedAt: syncedAt || new Date().toISOString(), source: source || 'api' };

    // Try to write to local cache file
    try {
      const logDir = process.env.LOCALAPPDATA
        ? path.join(process.env.LOCALAPPDATA, 'IMMEIT')
        : path.join(__dirname, '..', '.immeit-logs');
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      fs.writeFileSync(path.join(logDir, 'dash-cache.json'), JSON.stringify(cache));
    } catch (e) { log('warn', 'dashboard_sync_cache_write_failed', { error: e?.message }); }

    // Also try DB storage if available
    try {
      const db = require('../lib/db');
      await db.query(
        `INSERT INTO dashboard_cache (cache_key, cache_data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (cache_key) DO UPDATE SET cache_data = $2, updated_at = NOW()`,
        ['sharepoint_suivi_2026', JSON.stringify(cache)]
      );
    } catch (e) { log('warn', 'dashboard_sync_db_write_failed', { error: e?.message }); }

    log('info', 'dashboard_sync', { items: items.length, source: cache.source });

    return res.status(200).json({ success: true, count: items.length, syncedAt: cache.syncedAt });
  } catch (err) {
    log('error', 'dashboard_sync_error', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});
