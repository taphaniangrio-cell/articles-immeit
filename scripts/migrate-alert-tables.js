const { query } = require('../lib/db');

const SQL = `
CREATE TABLE IF NOT EXISTS alert_dedup (
  change_hash TEXT PRIMARY KEY,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_alerted TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_dedup_last_alerted ON alert_dedup(last_alerted);

CREATE TABLE IF NOT EXISTS alert_history (
  id SERIAL PRIMARY KEY,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  changes_count INTEGER NOT NULL,
  critical_count INTEGER DEFAULT 0,
  normal_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  change_hashes TEXT[] DEFAULT '{}',
  source TEXT
);

CREATE INDEX IF NOT EXISTS idx_alert_history_sent_at ON alert_history(sent_at DESC);
`;

(async () => {
  const statements = SQL.split(';').map(s => s.trim()).filter(s => s.length);
  for (const stmt of statements) {
    await query(stmt);
    console.log('OK:', stmt.substring(0, 60).replace(/\n/g, ' ') + '...');
  }
  console.log('Migration complete.');
  process.exit(0);
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
