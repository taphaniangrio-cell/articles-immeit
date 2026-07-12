#!/usr/bin/env node
// scripts/transfer-data.js
//
// Transfère les données de l'ancienne DB (Neon) vers la nouvelle DB (Supabase).
//
// Usage :
//   1. Ancien DATABASE_URL → mettre dans OLD_DATABASE_URL dans .env
//   2. Nouveau DATABASE_URL → mettre dans DATABASE_URL dans .env (celui de Supabase)
//   3. Lancer : node scripts/transfer-data.js
//
// Transfère : articles + dashboard_cache (dont le token MSAL).

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load .env manually (no dotenv dependency)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq < 1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  });
}

const TABLES = ['articles', 'dashboard_cache'];

async function main() {
  const oldUrl = process.env.OLD_DATABASE_URL;
  const newUrl = process.env.DATABASE_URL;

  if (!oldUrl) {
    console.error('OLD_DATABASE_URL non configurée dans .env (ancienne base Neon)');
    process.exit(1);
  }
  if (!newUrl) {
    console.error('DATABASE_URL non configurée dans .env (nouvelle base Supabase)');
    process.exit(1);
  }

  const oldPool = new Pool({ connectionString: oldUrl, ssl: { rejectUnauthorized: false } });
  const newPool = new Pool({ connectionString: newUrl, ssl: { rejectUnauthorized: false } });

  try {
    console.log('Connexion à l\'ancienne base (Neon)...');
    const oldClient = await oldPool.connect();
    console.log('Connexion à la nouvelle base (Supabase)...');
    const newClient = await newPool.connect();

    for (const table of TABLES) {
      console.log(`\nTransfert de la table "${table}"...`);

      const { rows } = await oldClient.query(`SELECT * FROM ${table}`);
      console.log(`  ${rows.length} lignes lues depuis l'ancienne base.`);

      if (rows.length === 0) continue;

      if (table === 'articles') {
        for (const row of rows) {
          const cols = Object.keys(row).filter(k => row[k] !== undefined);
          const vals = cols.map(c => row[c]);
          const placeholders = cols.map((_, i) => `$${i + 1}`);
          await newClient.query(
            `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT DO NOTHING`,
            vals
          );
        }
      } else if (table === 'dashboard_cache') {
        for (const row of rows) {
          await newClient.query(
            `INSERT INTO ${table} (cache_key, cache_data, updated_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (cache_key) DO UPDATE SET cache_data = $2, updated_at = $3`,
            [row.cache_key, row.cache_data, row.updated_at]
          );
        }
      }

      const count = await newClient.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`  ${count.rows[0].count} lignes dans la nouvelle base.`);
    }

    oldClient.release();
    newClient.release();
    console.log('\nTransfert terminé avec succès.');
  } catch (err) {
    console.error('Erreur lors du transfert:', err.message);
    process.exit(1);
  } finally {
    await oldPool.end();
    await newPool.end();
  }
}

main();
