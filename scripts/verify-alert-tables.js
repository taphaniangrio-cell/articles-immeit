const { query } = require('../lib/db');
(async () => {
  const r1 = await query("SELECT table_name FROM information_schema.tables WHERE table_name IN ('alert_dedup','alert_history') ORDER BY table_name");
  console.log('Tables:', r1.rows.map(r => r.table_name).join(', '));
  const r2 = await query("SELECT indexname FROM pg_indexes WHERE tablename IN ('alert_dedup','alert_history') ORDER BY indexname");
  console.log('Indexes:', r2.rows.map(r => r.indexname).join(', '));
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
