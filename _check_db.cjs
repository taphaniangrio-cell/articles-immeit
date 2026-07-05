const fs = require('fs');
const path = require('path');

// Manually load .env like server.mjs does
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf-8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const { Pool } = require('@neondatabase/serverless');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, max: 1 });

(async () => {
  try {
    const r1 = await pool.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboard_cache')");
    const exists = r1.rows[0]?.exists;
    console.log('Table dashboard_cache:', exists ? 'EXISTS' : 'NOT FOUND');

    if (exists) {
      const r2 = await pool.query('SELECT cache_key, updated_at, length(cache_data::text) as len FROM dashboard_cache');
      console.log('Rows:', r2.rows.length);
      for (const row of r2.rows) {
        console.log(`  key="${row.cache_key}" | updated=${row.updated_at} | size=${row.len} bytes`);
      }

      // Also check suivi_2026 table
      const r3 = await pool.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suivi_2026')");
      console.log('\nTable suivi_2026:', r3.rows[0]?.exists ? 'EXISTS' : 'NOT FOUND');
      if (r3.rows[0]?.exists) {
        const r4 = await pool.query('SELECT COUNT(*)::int FROM suivi_2026');
        console.log('  rows:', r4.rows[0]?.count || 0);
      }
    }
  } catch (e) {
    console.error('DB ERROR:', e.message);
  }
  await pool.end();
})();
