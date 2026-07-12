#!/usr/bin/env node
// Direct OAuth device code flow — bypasses MSAL to avoid DB dependency issues.
// Usage: node scripts/direct-auth.js

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

const TENANT_ID = process.env.SHAREPOINT_TENANT_ID || 'd852d5cd-724c-4128-8812-ffa5db3f8507';
const CLIENT_ID = process.env.SHAREPOINT_DELEGATED_CLIENT_ID || '1950a258-227b-4e31-a9cf-717495945fc2';
const SCOPES = 'https://graph.microsoft.com/.default';

function httpsPost(url, body, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const bodyBuf = Buffer.from(body, 'utf-8');
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { ...headers, 'Content-Length': bodyBuf.length },
      timeout: 30000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Parse: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(bodyBuf);
    req.end();
  });
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('');
  console.log('════════════════════════════════════════════════');
  console.log('  AUTH DIRECTE SHAREPOINT — IMMEIT');
  console.log('════════════════════════════════════════════════');
  console.log('');

  // Step 1: Request device code
  console.log('1) Demande du device code...');
  const dcBody = new URLSearchParams({
    client_id: CLIENT_ID,
    scope: SCOPES,
  }).toString();

  const dc = await httpsPost(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/devicecode`,
    dcBody,
    { 'Content-Type': 'application/x-www-form-urlencoded' }
  );

  if (!dc.user_code) {
    console.error('Erreur:', dc);
    process.exit(1);
  }

  console.log('');
  console.log('  ═══════════════════════════════════════════════');
  console.log('  ' + dc.message);
  console.log('  ═══════════════════════════════════════════════');
  console.log('');

  // Step 2: Poll for token
  console.log('2) Attente de l\'authentification...');
  const interval = (dc.interval || 5) * 1000;
  const expiresIn = (dc.expires_in || 300) * 1000;
  const deadline = Date.now() + expiresIn;

  while (Date.now() < deadline) {
    await sleep(interval);

    const tokenBody = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: dc.device_code,
    }).toString();

    try {
      const result = await httpsPost(
        `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
        tokenBody,
        { 'Content-Type': 'application/x-www-form-urlencoded' }
      );

      if (result.access_token) {
        console.log('');
        console.log('  ✅ Token obtenu !');

        // Save raw token info
        const { getCacheDir } = require('../lib/cache-dir');
        const cacheDir = getCacheDir();
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

        const tokenFile = path.join(cacheDir, 'msal-token.json');
        fs.writeFileSync(tokenFile, JSON.stringify({
          token: result.access_token,
          expiresAt: Date.now() + (result.expires_in || 3600) * 1000,
          refreshToken: result.refresh_token || null,
        }, null, 2), 'utf-8');
        console.log('  ✅ Token sauvegardé: ' + tokenFile);

        // Save to Supabase DB
        if (process.env.DATABASE_URL) {
          try {
            const db = require('../lib/db');
            await db.query(
              `INSERT INTO dashboard_cache (cache_key, cache_data, updated_at)
               VALUES ($1, $2, NOW())
               ON CONFLICT (cache_key) DO UPDATE SET cache_data = $2, updated_at = NOW()`,
              ['msal_token_cache', JSON.stringify({ blob: JSON.stringify({
                token: result.access_token,
                expiresAt: Date.now() + (result.expires_in || 3600) * 1000,
                refreshToken: result.refresh_token || null,
              }) })]
            );
            console.log('  ✅ Token sauvegardé dans Supabase');
          } catch (e) {
            console.log('  ⚠ Erreur DB:', e.message);
          }
        }

        // Step 3: Test SharePoint
        console.log('');
        console.log('3) Test de connexion SharePoint...');
        try {
          const site = await httpsGet('https://graph.microsoft.com/v1.0/sites/shiftup.sharepoint.com:/sites/P2M2022');
          if (site && site.id) {
            console.log('  ✅ Site SharePoint accessible (ID: ' + site.id.slice(0, 20) + '...)');
          }
        } catch (e) {
          console.log('  ⚠ Site inaccessible: ' + e.message);
        }

        console.log('');
        console.log('  Terminé ! La synchronisation est prête.');
        console.log('');
        process.exit(0);
      }

      if (result.error === 'authorization_pending') {
        process.stdout.write('.');
        continue;
      }
      if (result.error === 'authorization_declined') {
        console.error('\n  ❌ Authentification refusée');
        process.exit(1);
      }
      if (result.error === 'expired_token') {
        console.error('\n  ❌ Code expiré — relancez le script');
        process.exit(1);
      }
      console.error('\n  Erreur inattendue:', result);
    } catch (e) {
      // Network error during polling — retry
      process.stdout.write('x');
    }
  }

  console.error('\n  ❌ Timeout — le code a expiré');
  process.exit(1);
}

main().catch(e => { console.error('Erreur:', e.message); process.exit(1); });
