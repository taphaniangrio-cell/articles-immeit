const fs = require('fs');
const path = require('path');
const https = require('https');
const { log } = require('./logger');
const { filterDataRows } = require('./sharepoint');
const { CONSTANTS } = require('./constants');
const eventBus = require('./events');

let InteractiveBrowserCredential = null;
let brokerAvailable = false;
try {
  const identity = require('@azure/identity');
  const broker = require('@azure/identity-broker');
  InteractiveBrowserCredential = identity.InteractiveBrowserCredential;
  identity.useIdentityPlugin(broker.nativeBrokerPlugin);
  brokerAvailable = true;
} catch (e) {
  log('warn', 'azure_identity_unavailable', { error: e.message });
}

const CACHE_FILE = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, 'IMMEIT', 'dash-cache.json')
  : path.join(__dirname, '..', '.immeit-logs', 'dash-cache.json');

const REFRESH_INTERVAL = CONSTANTS.AUTO_SYNC_REFRESH_INTERVAL;
const SYNC_DELAY = 2000;
let syncTimer = null;
let cachedSiteId = null;
let lastKnownTimestamp = null;
let isSyncing = false;

const SHAREPOINT_HOST = process.env.SHAREPOINT_SITE_HOSTNAME || 'shiftup.sharepoint.com';
const SHAREPOINT_PATH = process.env.SHAREPOINT_SITE_PATH || 'sites/P2M2022';
const FILE_ID = process.env.SHAREPOINT_FILE_ID || '55686017-3ff9-43f7-ab28-5b910871a4b0';
const SHEET_NAME = process.env.SHAREPOINT_SHEET_NAME || 'Suivi Demandes 2026';
const TENANT_ID = process.env.SHAREPOINT_TENANT_ID || 'd852d5cd-724c-4128-8812-ffa5db3f8507';
// Azure AD public client ID (Azure CLI) — used for interactive browser auth on local dev
// En production / Vercel, l'authentification SharePoint passe par client_credentials (api/sync.js)
const CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID || '1950a258-227b-4e31-a9cf-717495945fc2';

let credential = null;

function getCredential() {
  if (!brokerAvailable) return null;
  if (!credential) {
    credential = new InteractiveBrowserCredential({
      tenantId: TENANT_ID,
      clientId: CLIENT_ID,
      redirectUri: 'http://localhost',
      brokerOptions: {
        enabled: true,
        legacyEnableMsaPassthrough: true,
        parentWindowHandle: Buffer.alloc(0),
      },
      disableAutomaticAuthentication: false,
      tokenCachePersistenceOptions: {
        name: 'immeit-sp-cache',
      },
    });
  }
  return credential;
}

async function ensureToken() {
  const cred = getCredential();
  if (!cred) throw new Error('Azure Identity non disponible (module natif manquant)');
  try {
    const resp = await cred.getToken('https://graph.microsoft.com/.default');
    log('info', 'auto_sync_token_acquired', { expiresOn: resp.expiresOn?.toISOString() });
    return resp.token;
  } catch (err) {
    log('warn', 'auto_sync_token_failed', { error: err.message });
    throw err;
  }
}

function httpsGet(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: CONSTANTS.SHAREPOINT_HTTPS_TIMEOUT,
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function saveCache(data) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
    log('info', 'auto_sync_cache_saved', { path: CACHE_FILE, items: data.items?.length || 0 });
  } catch (err) {
    log('error', 'auto_sync_cache_write_failed', { error: err.message });
  }
}

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && data.headers && data.items) return data;
    }
  } catch (e) { log('warn', 'auto_sync_cache_read_failed', { error: e?.message }); }
  return null;
}

async function tryDbSave(data) {
  try {
    const db = require('./db');
    await db.query(
      `INSERT INTO dashboard_cache (cache_key, cache_data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (cache_key) DO UPDATE SET cache_data = $2, updated_at = NOW()`,
      ['sharepoint_suivi_2026', JSON.stringify(data)]
    );
    log('info', 'auto_sync_db_saved');
  } catch (e) { log('warn', 'auto_sync_db_save_failed', { error: e?.message }); }
}

async function fetchSharePointData() {
  let token;
  try {
    token = await ensureToken();
  } catch (err) {
    log('warn', 'auto_sync_token_failed', { error: err.message });
    return null;
  }

  try {
    log('info', 'auto_sync_fetching_site');
    const site = await httpsGet(
      `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_HOST}:/${SHAREPOINT_PATH}`,
      token
    );
    const siteId = site.id;
    cachedSiteId = siteId;

    log('info', 'auto_sync_fetching_workbook');
    let driveItem;
    try {
      driveItem = await httpsGet(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${FILE_ID}?select=id,lastModifiedBy,lastModifiedDateTime`,
        token
      );
    } catch {
      const search = await httpsGet(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/search(q='Suivi Demandes 2026')`,
        token
      );
      const items = search.value || [];
      if (items.length === 0) throw new Error('Fichier introuvable');
      driveItem = items[0];
    }

    const itemId = driveItem.id;
    const lastModifiedBy = driveItem.lastModifiedBy?.user?.displayName || 'Inconnu';
    const lastModifiedAt = driveItem.lastModifiedDateTime || '';
    lastKnownTimestamp = lastModifiedAt;

    const sheetData = await httpsGet(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}/workbook/worksheets('${encodeURIComponent(SHEET_NAME)}')/usedRange`,
      token
    );

    const rows = sheetData.values || [];
    if (rows.length < 2) throw new Error('Pas assez de donnees');

    const headers = rows[0];
    const allItems = rows.slice(1).map((row, idx) => {
      const obj = { _row: idx + 2 };
      headers.forEach((h, i) => {
        const key = String(h).toLowerCase().trim().replace(/[\s\/]+/g, '_').replace(/[^a-z0-9_]/g, '');
        obj[key] = row[i] != null ? String(row[i]).trim() : '';
      });
      return obj;
    });
    const items = filterDataRows(allItems, headers);

    const cacheData = { headers, items, syncedAt: new Date().toISOString(), source: 'auto_sync', _rawCount: allItems.length };

    saveCache(cacheData);
    tryDbSave(cacheData);

    try {
      const diffDetector = require('./diff-detector');
      const emailAlert = require('./email-alert');
      const report = diffDetector.buildDiffReport(cacheData, lastModifiedBy);
      if (report) {
        emailAlert.sendAlert(report);
      }
    } catch (e) {
      log('warn', 'auto_sync_diff_alert_failed', { error: e?.message });
    }

    log('info', 'auto_sync_complete', { raw: allItems.length, filtered: items.length });

    try { eventBus.emit('dashboard-updated', { source: 'auto_sync', items: items.length, headers, syncedAt: cacheData.syncedAt }) } catch {}
    return cacheData;
  } catch (err) {
    log('error', 'auto_sync_fetch_failed', { error: err.message });
    return null;
  }
}

async function sync() {
  log('info', 'auto_sync_starting');
  const data = await fetchSharePointData();
  if (!data) {
    const cached = loadCache();
    if (cached) {
      log('info', 'auto_sync_using_cache', { items: cached.items?.length || 0 });
    }
  }
  return data;
}

async function syncLoop() {
  if (isSyncing) {
    scheduleNext();
    return;
  }
  isSyncing = true;
  try {
    let token;
    try {
      token = await ensureToken();
    } catch (err) {
      log('warn', 'auto_sync_token_failed', { error: err.message });
      return;
    }
    if (await quickCheck(token)) return;
    await fetchAndProcess(token);
  } catch (err) {
    log('error', 'auto_sync_loop_error', { error: err.message });
  } finally {
    isSyncing = false;
    scheduleNext();
  }
}

async function initialSync() {
  const data = await sync();
  if (data) {
    return data;
  }
  const cached = loadCache();
  if (cached) {
    log('info', 'auto_sync_initial_cached', { items: cached.items?.length || 0 });
    return cached;
  }
  return null;
}

function scheduleNext() {
  syncTimer = setTimeout(syncLoop, SYNC_DELAY);
}

async function quickCheck(token) {
  try {
    if (!cachedSiteId) {
      log('info', 'auto_sync_fetching_site');
      const site = await httpsGet(
        `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_HOST}:/${SHAREPOINT_PATH}`,
        token
      );
      cachedSiteId = site.id;
    }
    const driveItem = await httpsGet(
      `https://graph.microsoft.com/v1.0/sites/${cachedSiteId}/drive/items/${FILE_ID}?select=id,lastModifiedBy,lastModifiedDateTime`,
      token
    );
    const ts = driveItem.lastModifiedDateTime;
    if (ts && lastKnownTimestamp === ts) {
      log('info', 'auto_sync_unchanged');
      return true;
    }
    lastKnownTimestamp = ts;
    return false;
  } catch (err) {
    log('warn', 'auto_sync_quick_check_failed', { error: err.message });
    return false;
  }
}

async function fetchAndProcess(token) {
  try {
    const siteId = cachedSiteId;
    let driveItem;
    try {
      driveItem = await httpsGet(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${FILE_ID}?select=id,lastModifiedBy,lastModifiedDateTime`,
        token
      );
    } catch {
      const search = await httpsGet(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/search(q='Suivi Demandes 2026')`,
        token
      );
      const items = search.value || [];
      if (items.length === 0) throw new Error('Fichier introuvable');
      driveItem = items[0];
    }

    const itemId = driveItem.id;
    const lastModifiedBy = driveItem.lastModifiedBy?.user?.displayName || 'Inconnu';
    const lastModifiedAt = driveItem.lastModifiedDateTime || '';

    log('info', 'auto_sync_fetching_workbook');
    const sheetData = await httpsGet(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}/workbook/worksheets('${encodeURIComponent(SHEET_NAME)}')/usedRange`,
      token
    );

    const rows = sheetData.values || [];
    if (rows.length < 2) throw new Error('Pas assez de donnees');

    const headers = rows[0];
    const allItems = rows.slice(1).map((row, idx) => {
      const obj = { _row: idx + 2 };
      headers.forEach((h, i) => {
        const key = String(h).toLowerCase().trim().replace(/[\s\/]+/g, '_').replace(/[^a-z0-9_]/g, '');
        obj[key] = row[i] != null ? String(row[i]).trim() : '';
      });
      return obj;
    });
    const items = filterDataRows(allItems, headers);

    const cacheData = { headers, items, syncedAt: new Date().toISOString(), source: 'auto_sync', _rawCount: allItems.length };

    saveCache(cacheData);
    tryDbSave(cacheData);

    try {
      const diffDetector = require('./diff-detector');
      const emailAlert = require('./email-alert');
      const report = diffDetector.buildDiffReport(cacheData, lastModifiedBy);
      if (report) {
        emailAlert.sendAlert(report);
      }
    } catch (e) {
      log('warn', 'auto_sync_diff_alert_failed', { error: e?.message });
    }

    log('info', 'auto_sync_complete', { raw: allItems.length, filtered: items.length });

    try { eventBus.emit('dashboard-updated', { source: 'auto_sync', items: items.length, headers, syncedAt: cacheData.syncedAt }) } catch {}
    return cacheData;
  } catch (err) {
    log('error', 'auto_sync_fetch_failed', { error: err.message });
    return null;
  }
}

function startContinuousSync() {
  if (syncTimer) clearTimeout(syncTimer);
  log('info', 'auto_sync_continuous_started', { delay: SYNC_DELAY });
  syncLoop();
}

function stopContinuousSync() {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  isSyncing = false;
}

module.exports = { sync, initialSync, startContinuousSync, stopContinuousSync, loadCache, fetchSharePointData, ensureToken };
