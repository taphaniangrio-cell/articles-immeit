const path = require('path');
const db = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { log } = require('../lib/logger');
const cors = require('../lib/cors');
const sharepoint = require('../lib/sharepoint');

module.exports = requireAuth(async (req, res) => {
  if (cors(res, req)) return;

  try {
    const [articleStats, sharepointData, syncedData] = await Promise.all([
      getArticleStats(),
      sharepoint.fetchDashboardData(),
      getSyncedCache(),
    ]);

    return res.status(200).json({
      articles: articleStats,
      sharepoint: sharepointData,
      synced: syncedData,
    });
  } catch (err) {
    log('error', 'dashboard_error', { error: err.message });
    return res.status(500).json({ error: 'Erreur chargement tableau de bord' });
  }
});

async function getArticleStats() {
  const result = await db.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE statut = 'brouillon')::int AS brouillon,
      COUNT(*) FILTER (WHERE statut = 'en_revision')::int AS en_revision,
      COUNT(*) FILTER (WHERE statut = 'valide')::int AS valide,
      COUNT(*) FILTER (WHERE statut = 'publie')::int AS publie,
      COUNT(*) FILTER (WHERE statut = 'archive')::int AS archive,
      COUNT(*) FILTER (WHERE statut IN ('valide', 'publie'))::int AS termines
    FROM articles
  `);
  const row = result.rows[0] || {};
  const total = row.total || 0;
  const termines = row.termines || 0;

  const monthlyResult = await db.query(`
    SELECT
      to_char(date_creation, 'YYYY-MM') AS month,
      COUNT(*)::int AS count
    FROM articles
    WHERE date_creation IS NOT NULL
      AND date_creation >= NOW() - INTERVAL '12 months'
    GROUP BY month
    ORDER BY month
  `);

  const topResult = await db.query(`
    SELECT titre_interne, statut, date_creation, ia_provider
    FROM articles
    ORDER BY date_creation DESC
    LIMIT 5
  `);

  return {
    total,
    brouillon: row.brouillon || 0,
    en_revision: row.en_revision || 0,
    valide: row.valide || 0,
    publie: row.publie || 0,
    archive: row.archive || 0,
    termines,
    tauxCompletion: total > 0 ? Math.round((termines / total) * 100) : 0,
    monthlyTrend: monthlyResult.rows,
    recentTop: topResult.rows,
  };
}

async function getSyncedCache() {
  // Try DB first
  try {
    const result = await db.query(
      `SELECT cache_data FROM dashboard_cache WHERE cache_key = 'sharepoint_suivi_2026'`
    );
    if (result.rows.length > 0) {
      const data = result.rows[0].cache_data;
      if (typeof data === 'string') return JSON.parse(data);
      return data;
    }
  } catch {}

  // Try auto-sync cache
  try {
    const autoSync = require('../lib/auto-sync');
    const cached = autoSync.loadCache();
    if (cached) return cached;
  } catch {}

  // Try local file directly
  try {
    const logDir = process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'IMMEIT')
      : path.join(__dirname, '..', '.immeit-logs');
    const filePath = path.join(logDir, 'dash-cache.json');
    if (require('fs').existsSync(filePath)) {
      const raw = require('fs').readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}

  return null;
}
