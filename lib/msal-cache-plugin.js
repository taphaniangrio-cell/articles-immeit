// lib/msal-cache-plugin.js
//
// Cache MSAL persistant et partagé (Postgres, avec repli fichier local).
//
// Pourquoi : par défaut, un PublicClientApplication MSAL garde son cache de jetons
// (dont le refresh token) UNIQUEMENT en mémoire du process. Dès qu'un nouveau process
// démarre (redéploiement Vercel, cold start, redémarrage du serveur local...), ce cache
// est perdu et il faut relancer une connexion interactive (device code) — c'est la cause
// principale des "dysfonctionnements" de synchronisation observés jusqu'ici.
//
// Ce plugin implémente l'interface ICachePlugin de @azure/msal-node pour sérialiser le
// cache complet (comptes + refresh tokens) dans la table Postgres partagée `dashboard_cache`
// (déjà utilisée pour les données SharePoint). Résultat : UNE SEULE connexion humaine
// (device code) suffit durablement — tous les environnements (local, Vercel, GitHub
// Actions) relisent ensuite le même cache et rafraîchissent silencieusement leurs jetons,
// sans aucune intervention humaine.
//
// Voir la doc officielle Microsoft sur les "distributed cache plugins" MSAL Node pour le
// pattern beforeCacheAccess/afterCacheAccess utilisé ici.

const path = require('path');
const { log } = require('./logger');
const { getCacheDir, safeReadFile, safeWriteFile } = require('./cache-dir');

const DB_CACHE_KEY = 'msal_token_cache';

function cacheFilePath() {
  return path.join(getCacheDir(), 'msal-cache.json');
}

async function loadBlob() {
  if (process.env.DATABASE_URL) {
    try {
      const db = require('./db');
      const r = await db.query('SELECT cache_data FROM dashboard_cache WHERE cache_key = $1', [DB_CACHE_KEY]);
      if (r.rows.length > 0) {
        let row = r.rows[0].cache_data;
        if (typeof row === 'string') { try { row = JSON.parse(row); } catch { row = null; } }
        if (row && typeof row.blob === 'string' && row.blob) return row.blob;
      }
    } catch (e) {
      log('warn', 'msal_cache_db_read_failed', { error: e && e.message });
    }
  }
  try {
    const raw = safeReadFile(cacheFilePath());
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.blob === 'string' && parsed.blob) return parsed.blob;
    }
  } catch (e) { /* ignore */ }
  return null;
}

async function saveBlob(blob) {
  let dbOk = false;
  if (process.env.DATABASE_URL) {
    try {
      const db = require('./db');
      await db.query(
        `INSERT INTO dashboard_cache (cache_key, cache_data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (cache_key) DO UPDATE SET cache_data = $2, updated_at = NOW()`,
        [DB_CACHE_KEY, JSON.stringify({ blob })]
      );
      dbOk = true;
    } catch (e) {
      log('warn', 'msal_cache_db_write_failed', { error: e && e.message });
    }
  }
  // Filet de sécurité local (utile en dev sans DB ; inoffensif sur Vercel où /tmp est éphémère).
  try { safeWriteFile(cacheFilePath(), { blob }); } catch { /* ignore */ }
  if (dbOk) log('debug', 'msal_cache_saved', { where: 'db' });
}

/**
 * Construit un ICachePlugin MSAL Node prêt à l'emploi.
 */
function createCachePlugin() {
  return {
    beforeCacheAccess: async (cacheContext) => {
      const blob = await loadBlob();
      if (blob) {
        try {
          cacheContext.tokenCache.deserialize(blob);
        } catch (e) {
          log('warn', 'msal_cache_deserialize_failed', { error: e && e.message });
        }
      }
    },
    afterCacheAccess: async (cacheContext) => {
      if (cacheContext.cacheHasChanged) {
        try {
          const blob = cacheContext.tokenCache.serialize();
          await saveBlob(blob);
        } catch (e) {
          log('warn', 'msal_cache_serialize_failed', { error: e && e.message });
        }
      }
    },
  };
}

/** Efface le cache persistant (utile pour forcer une reconnexion complète). */
async function clearCache() {
  await saveBlob('');
}

module.exports = { createCachePlugin, clearCache };
