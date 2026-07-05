const path = require('path');
const db = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { log } = require('../lib/logger');
const cors = require('../lib/cors');
const sharepoint = require('../lib/sharepoint');
const autoSync = require('../lib/auto-sync');

const FETCH_TIMEOUT = 12000;

module.exports = requireAuth(async (req, res) => {
  if (cors(res, req)) return;

  try {
    const [articleStats, cachedData] = await Promise.all([
      getArticleStats(),
      loadCachedData(),
    ]);

    // Try live SharePoint with timeout — if it succeeds, use fresh data
    var sharepointData = null
    if (sharepoint.isConfigured()) {
      try {
        sharepointData = await timeoutPromise(sharepoint.fetchDashboardData(), FETCH_TIMEOUT)
      } catch (e) {
        log('warn', 'dash_sp_timeout', { error: e.message })
      }
    }

    var displayData
    if (sharepointData && sharepointData.connected && sharepointData.items?.length > 0) {
      displayData = {
        headers: sharepointData.headers,
        items: sharepointData.items,
        syncedAt: new Date().toISOString(),
        source: 'sharepoint_live',
        _rawCount: sharepointData._rawCount,
      }
      saveToDBCache(displayData).catch(function() {})
    } else {
      displayData = cachedData
    }

    return res.status(200).json({
      articles: articleStats,
      sharepoint: sharepointData ? { connected: true } : { connected: false },
      synced: displayData,
    })
  } catch (err) {
    log('error', 'dashboard_error', { error: err.message })
    return res.status(500).json({ error: 'Erreur chargement tableau de bord' })
  }
})

function timeoutPromise(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function(_, reject) {
      setTimeout(function() { reject(new Error('timeout')) }, ms)
    }),
  ])
}

async function saveToDBCache(data) {
  try {
    await db.query(
      `INSERT INTO dashboard_cache (cache_key, cache_data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (cache_key) DO UPDATE SET cache_data = $2, updated_at = NOW()`,
      ['sharepoint_suivi_2026', JSON.stringify(data)]
    )
  } catch (e) { log('warn', 'dash_cache_save_failed', { error: e.message }) }
}

async function loadCachedData() {
  try {
    const r = await db.query(
      `SELECT cache_data FROM dashboard_cache WHERE cache_key = 'sharepoint_suivi_2026'`
    )
    if (r.rows.length > 0) {
      var data = r.rows[0].cache_data
      if (typeof data === 'string') { try { data = JSON.parse(data) } catch {} }
      if (data && data.items && data.items.length > 0) return data
    }
  } catch (e) { log('warn', 'dash_cache_db_read_failed', { error: e?.message }) }

  try {
    var cached = autoSync.loadCache()
    if (cached && cached.items && cached.items.length > 0) return cached
  } catch (e) { /* ignore */ }

  try {
    var logDir = process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'IMMEIT')
      : path.join(__dirname, '..', '.immeit-logs')
    var filePath = path.join(logDir, 'dash-cache.json')
    if (require('fs').existsSync(filePath)) {
      return JSON.parse(require('fs').readFileSync(filePath, 'utf-8'))
    }
  } catch (e) { /* ignore */ }

  return null
}

async function getArticleStats() {
  var result = await db.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE statut = 'brouillon')::int AS brouillon,
      COUNT(*) FILTER (WHERE statut = 'en_revision')::int AS en_revision,
      COUNT(*) FILTER (WHERE statut = 'valide')::int AS valide,
      COUNT(*) FILTER (WHERE statut = 'publie')::int AS publie,
      COUNT(*) FILTER (WHERE statut = 'archive')::int AS archive,
      COUNT(*) FILTER (WHERE statut IN ('valide', 'publie'))::int AS termines
    FROM articles
  `)
  var row = result.rows[0] || {}
  var total = row.total || 0

  return {
    total: total,
    brouillon: row.brouillon || 0,
    en_revision: row.en_revision || 0,
    valide: row.valide || 0,
    publie: row.publie || 0,
    archive: row.archive || 0,
    termines: row.termines || 0,
    tauxCompletion: total > 0 ? Math.round(((row.termines || 0) / total) * 100) : 0,
  }
}
