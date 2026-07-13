const cors = require('../lib/cors');
const { requireAuth } = require('../lib/auth');
const { log } = require('../lib/logger');
const autoSync = require('../lib/auto-sync');

async function isCronAuthorized(req) {
  if (req.headers['x-vercel-cron'] === '1') return true;
  const auth = req.headers['authorization'] || '';
  const secret = process.env.CRON_SECRET || process.env.GITHUB_TOKEN;
  if (auth.startsWith('Bearer ') && secret && auth.slice(7) === secret) return true;
  return false;
}

module.exports = async (req, res) => {
  if (cors(res, req)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST requis' });
  }

  if (!await isCronAuthorized(req)) {
    return requireAuth(async (req2, res2) => {
      await handleSync(req2, res2);
    })(req, res);
  }

  await handleSync(req, res);
};

// Délègue entièrement à l'orchestrateur unique (lib/auto-sync.js) : même logique de
// synchronisation qu'on soit déclenché par le cron Vercel, GitHub Actions, ou le bouton
// "Sync" du tableau de bord. allowInteractive n'est jamais passé ici (défaut false) : un
// appel API ne doit jamais rester bloqué à attendre une connexion humaine.
const SYNC_TIMEOUT_MS = 55_000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Sync timeout (' + (ms / 1000) + 's)')), ms)
    ),
  ]);
}

async function handleSync(req, res) {
  try {
    const result = await withTimeout(autoSync.performSync(), SYNC_TIMEOUT_MS);
    const status = result.success ? 200 : 502;
    return res.status(status).json(result);
  } catch (err) {
    log('error', 'sync_endpoint_failed', { error: err.message });
    const isTimeout = err.message.includes('timeout');
    return res.status(isTimeout ? 504 : 500).json({
      success: false,
      count: 0,
      message: isTimeout ? 'Synchronisation trop longue — réessayez' : 'Échec synchronisation : ' + err.message,
    });
  }
}
