const https = require('https');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { getCacheDir, safeWriteFile, safeReadFile } = require('./cache-dir');
const { log } = require('./logger');

const GITHUB_REPO = process.env.GITHUB_REPO || 'taphaniangrio-cell/articles-immeit';
const CACHE_BRANCH = process.env.CACHE_BRANCH || 'cache';
const CACHE_FILE = 'dash-cache.json';
const RAW_URL = 'https://raw.githubusercontent.com/' + GITHUB_REPO + '/' + CACHE_BRANCH + '/cache/' + CACHE_FILE;

function getRepoPath() {
  if (process.env.REPO_PATH) return process.env.REPO_PATH;
  try {
    const root = path.resolve(__dirname, '..');
    if (fs.existsSync(path.join(root, '.git'))) return root;
  } catch {}
  return null;
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      timeout: 10000,
      headers: { 'User-Agent': 'immeit/1.0' },
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(data)); }
          catch { resolve(null); }
        } else { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

async function fetchCache() {
  try {
    const data = await httpsGet(RAW_URL);
    if (data && data.items && data.items.length > 0) {
      log('info', 'github_cache_fetched', { items: data.items.length, syncedAt: data.syncedAt });
      return data;
    }
  } catch (e) { log('warn', 'github_cache_fetch_failed', { error: e && e.message }); }
  return null;
}

function httpsPut(url, data, token) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'PUT',
      timeout: 15000,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'User-Agent': 'immeit/1.0',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(res.statusCode < 400));
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.write(body);
    req.end();
  });
}

async function publishCacheViaApi(data) {
  var token = process.env.GITHUB_TOKEN || process.env.CRON_SECRET;
  if (!token) { log('info', 'github_cache_api_skipped', { reason: 'no_token' }); return false; }

  try {
    var existing = await httpsGet('https://api.github.com/repos/' + GITHUB_REPO + '/contents/cache/' + CACHE_FILE + '?ref=' + CACHE_BRANCH);
    var sha = existing && existing.sha ? existing.sha : null;
    var content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    var result = await httpsPut(
      'https://api.github.com/repos/' + GITHUB_REPO + '/contents/cache/' + CACHE_FILE,
      {
        message: 'cache: auto-sync ' + new Date().toISOString().slice(0, 16) + ' (' + (data.items?.length || 0) + ' items)',
        branch: CACHE_BRANCH,
        content: content,
        sha: sha,
      },
      token
    );
    if (result) log('info', 'github_cache_api_published', { items: data.items?.length || 0 });
    else log('warn', 'github_cache_api_publish_failed', { items: data.items?.length || 0 });
    return result;
  } catch (e) { log('warn', 'github_cache_api_error', { error: e && e.message }); return false; }
}

async function publishCache(data) {
  publishCacheViaApi(data);

  const repoPath = getRepoPath();
  if (!repoPath) return;

  try {
    var cacheDir = path.join(repoPath, 'cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(path.join(cacheDir, CACHE_FILE), JSON.stringify(data, null, 2), 'utf-8');

    var msg = 'cache: auto-sync ' + new Date().toISOString().slice(0, 16) + ' (' + (data.items?.length || 0) + ' items)';
    execSync('git add cache/' + CACHE_FILE, { cwd: repoPath, stdio: 'pipe' });
    execSync('git commit --allow-empty -m "' + msg + '"', { cwd: repoPath, stdio: 'pipe' });
    execSync('git push origin HEAD:' + CACHE_BRANCH, { cwd: repoPath, stdio: 'pipe' });
    log('info', 'github_cache_published', { branch: CACHE_BRANCH, items: data.items?.length || 0 });
  } catch (e) { log('warn', 'github_cache_publish_failed', { error: e && e.message }); }
}

module.exports = { fetchCache, publishCache };