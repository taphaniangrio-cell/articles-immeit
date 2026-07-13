// Test: publish MSAL token from DB to GitHub
async function main() {
  const { Client } = require('pg');
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const r = await c.query("SELECT cache_data FROM dashboard_cache WHERE cache_key = 'msal_token_cache'");
  if (r.rows.length === 0) { console.log('No MSAL token in DB'); await c.end(); return; }
  let row = r.rows[0].cache_data;
  if (typeof row === 'string') row = JSON.parse(row);
  console.log('MSAL token from DB:', row.blob ? row.blob.slice(0, 50) + '...' : 'EMPTY');
  await c.end();

  // Now publish to GitHub
  const { saveToGithub } = require('../lib/msal-cache-plugin');
  // saveToGithub is not exported, let's use the plugin directly
  // Actually, let me just test via the plugin's createCachePlugin
  console.log('Testing saveToGithub via plugin...');

  // Direct test: use githubApi from github-cache.js
  const { githubApi } = require('../lib/github-cache');
  const fs = require('fs');
  const path = require('path');
  const token = process.env.GITHUB_TOKEN;
  if (!token) { console.log('No GITHUB_TOKEN'); return; }

  const GITHUB_CACHE_PATH = 'cache/msal-token-cache.json';
  const BRANCH = 'cache';

  // Get existing SHA
  let sha;
  try {
    const info = await githubApi('GET', `/repos/taphaniangrio-cell/immeit-hub/contents/${GITHUB_CACHE_PATH}?ref=${BRANCH}`, token);
    sha = info && info.sha;
    console.log('Existing SHA:', sha);
  } catch (e) {
    console.log('No existing file (404 is ok):', e.message);
  }

  const content = Buffer.from(JSON.stringify(row), 'utf-8').toString('base64');
  const body = {
    message: 'msal-cache: manual sync ' + new Date().toISOString().slice(0, 16),
    content,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  try {
    await githubApi('PUT', `/repos/taphaniangrio-cell/immeit-hub/contents/${GITHUB_CACHE_PATH}`, token, body);
    console.log('MSAL token published to GitHub OK');
  } catch (e) {
    console.error('Publish failed:', e.message);
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
