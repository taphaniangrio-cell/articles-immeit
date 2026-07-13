const { Client } = require('pg');

async function main() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const keys = ['sharepoint_suivi_2026', 'msal_token_cache', 'diff_prev_state'];
  for (const key of keys) {
    try {
      const r = await c.query(
        'SELECT cache_key, updated_at, pg_column_size(cache_data) as size FROM dashboard_cache WHERE cache_key = $1',
        [key]
      );
      if (r.rows.length > 0) {
        const row = r.rows[0];
        console.log(`${row.cache_key} | ${row.updated_at} | ${row.size} bytes`);
      } else {
        console.log(`${key} | NOT FOUND`);
      }
    } catch (e) {
      console.log(`${key} | ERROR: ${e.message}`);
    }
  }
  await c.end();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
