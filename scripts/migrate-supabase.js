#!/usr/bin/env node
// scripts/migrate-supabase.js
//
// Applique le schéma DB sur une nouvelle base Supabase (ou tout Postgres).
//
// Usage :
//   1. Créer un projet sur https://supabase.com (gratuit)
//   2. Copier la DATABASE_URL depuis Settings → Database → Connection string → URI
//   3. Mettre à jour DATABASE_URL dans .env
//   4. Lancer : node scripts/migrate-supabase.js
//
// Ce script lit db/schema.sql et l'exécute sur la nouvelle base.
// Les commandes CREATE TABLE IF NOT EXISTS / ALTER TABLE ... ADD COLUMN IF NOT EXISTS
// sont idempotentes : sûr à relancer.

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

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL non configurée dans .env');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('Fichier schema.sql introuvable:', schemaPath);
    process.exit(1);
  }

  const schema = fs.readFileSync(schemaPath, 'utf8');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connexion à la base de données...');
    const client = await pool.connect();

    console.log('Application du schéma...');
    await client.query(schema);

    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log('Tables créées :', tables.rows.map(r => r.table_name).join(', '));

    client.release();
    console.log('Migration terminée avec succès.');
  } catch (err) {
    console.error('Erreur lors de la migration:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
