import { DeviceCodeCredential } from '@azure/identity';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration — adapte si besoin
const TENANT_ID = process.env.SHAREPOINT_TENANT_ID || 'common';
const CLIENT_ID = process.env.AZURE_CLIENT_ID || '1950a258-227b-4e31-a9cf-717495945fc2';
const SITE_HOST = process.env.SHAREPOINT_SITE_HOSTNAME || 'shiftup.sharepoint.com';
const SITE_PATH = process.env.SHAREPOINT_SITE_PATH || 'sites/P2M2022';
const FILE_ID = process.env.SHAREPOINT_FILE_ID || '55686017-3ff9-43f7-ab28-5b910871a4b0';
const SHEET_NAME = process.env.SHAREPOINT_SHEET_NAME || 'Suivi Demandes 2026';
const API_BASE = process.env.API_URL || 'http://localhost:3000';
const CACHE_FILE = path.join(__dirname, '..', '.immeit-logs', 'dash-cache.json');

function httpsGet(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 30000,
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error(data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function sendToApi(data) {
  return new Promise((resolve, reject) => {
    const u = new URL(`${API_BASE}/api/dashboard-sync`);
    const body = JSON.stringify(data);
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 15000,
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { resolve(d); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('\n  Authentification auprès de Microsoft...');

  const credential = new DeviceCodeCredential({
    tenantId: TENANT_ID === 'common' ? undefined : TENANT_ID,
    clientId: CLIENT_ID,
    userPromptCallback: (deviceCodeInfo) => {
      console.log(`\n  ┌──────────────────────────────────────────────────────────┐`);
      console.log(`  │  Ouvre ${deviceCodeInfo.verificationUrl}`);
      console.log(`  │  Code: ${deviceCodeInfo.userCode}`);
      console.log(`  └──────────────────────────────────────────────────────────┘\n`);
    },
  });

  const scope = 'https://graph.microsoft.com/Sites.Read.All';
  const tokenResponse = await credential.getToken(scope);
  const token = tokenResponse.token;
  console.log('  ✓ Connecté\n');

  // Get site
  console.log('  Récupération du site SharePoint...');
  const site = await httpsGet(`https://graph.microsoft.com/v1.0/sites/${SITE_HOST}:/${SITE_PATH}`, token);
  console.log(`  Site: ${site.displayName} (${site.id})`);

  // Find file
  console.log('  Recherche du fichier...');
  let driveItem;
  try {
    driveItem = await httpsGet(`https://graph.microsoft.com/v1.0/sites/${site.id}/drive/items/${FILE_ID}`, token);
  } catch {
    const search = await httpsGet(
      `https://graph.microsoft.com/v1.0/sites/${site.id}/drive/root/search(q='Suivi Demandes 2026')`,
      token
    );
    const items = search.value || [];
    if (items.length === 0) throw new Error('Fichier "Suivi Demandes 2026" introuvable');
    driveItem = items[0];
  }
  console.log(`  Fichier: ${driveItem.name}`);

  // Get worksheet
  console.log(`  Lecture de l'onglet "${SHEET_NAME}"...`);
  let sheetData;
  try {
    sheetData = await httpsGet(
      `https://graph.microsoft.com/v1.0/sites/${site.id}/drive/items/${driveItem.id}/workbook/worksheets('${encodeURIComponent(SHEET_NAME)}')/usedRange`,
      token
    );
  } catch (err) {
    // Try to find the sheet
    const sheets = await httpsGet(
      `https://graph.microsoft.com/v1.0/sites/${site.id}/drive/items/${driveItem.id}/workbook/worksheets`,
      token
    );
    const sheetNames = (sheets.value || []).map(s => s.name);
    console.log(`  Onglets disponibles: ${sheetNames.join(', ')}`);
    throw new Error(`Onglet "${SHEET_NAME}" introuvable. Essai: ${sheetNames.join(', ')}`);
  }

  const rows = sheetData.values || [];
  if (rows.length < 2) throw new Error('Pas assez de données dans l\'onglet');

  const headers = rows[0];
  const items = rows.slice(1).map((row, idx) => {
    const obj = { _row: idx + 2 };
    headers.forEach((h, i) => {
      const key = String(h).toLowerCase().trim().replace(/[\s\/]+/g, '_').replace(/[^a-z0-9_]/g, '');
      obj[key] = row[i] !== undefined ? String(row[i]).trim() : '';
    });
    return obj;
  }).filter(item => Object.values(item).some(v => v));

  console.log(`  ${items.length} lignes chargées`);
  console.log(`  En-têtes: ${headers.join(' | ')}`);

  // Save to local cache
  const cache = { headers, items, syncedAt: new Date().toISOString(), source: 'sync' };
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch {}

  // Send to local API
  try {
    console.log('\n  Envoi au tableau de bord...');
    await sendToApi(cache);
    console.log('  ✓ Données envoyées au tableau de bord');
  } catch (err) {
    console.log(`  ⚠ API locale indisponible: ${err.message}`);
    console.log('  Les données sont sauvegardées localement.');
  }

  // Print first 3 rows as preview
  console.log('\n  Aperçu (3 premières lignes):');
  items.slice(0, 3).forEach((item, i) => {
    const vals = headers.slice(0, 4).map(h => {
      const key = String(h).toLowerCase().trim().replace(/[\s\/]+/g, '_').replace(/[^a-z0-9_]/g, '');
      return (item[key] || '').slice(0, 30);
    });
    console.log(`    ${i + 1}. ${vals.join(' | ')}`);
  });

  console.log('\n  ✓ Synchronisation terminée !\n');
}

main().catch(err => {
  console.error(`\n  ✗ Erreur: ${err.message}\n`);
  process.exit(1);
});
