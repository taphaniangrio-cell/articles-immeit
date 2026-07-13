const { log } = require('./logger');
const { query } = require('./db');
const diffDetector = require('./diff-detector');
const emailAlert = require('./email-alert');

const DEDUP_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function isDuplicate(hash) {
  if (!process.env.DATABASE_URL || !hash) return false;
  try {
    const r = await query('SELECT change_hash FROM alert_dedup WHERE change_hash = $1', [hash]);
    return r.rows.length > 0;
  } catch { return false; }
}

async function markAlerted(hashes) {
  if (!process.env.DATABASE_URL || !hashes.length) return;
  try {
    for (const h of hashes) {
      await query(
        `INSERT INTO alert_dedup (change_hash, first_seen, last_alerted)
         VALUES ($1, now(), now())
         ON CONFLICT (change_hash) DO UPDATE SET last_alerted = now()`,
        [h]
      );
    }
  } catch (e) { log('warn', 'alert_dedup_save_failed', { error: e.message }); }
}

async function cleanOldDedup() {
  if (!process.env.DATABASE_URL) return;
  try {
    const cutoff = new Date(Date.now() - DEDUP_TTL_MS).toISOString();
    await query('DELETE FROM alert_dedup WHERE last_alerted < $1', [cutoff]);
  } catch {}
}

async function saveHistory(report, counts) {
  if (!process.env.DATABASE_URL) return;
  try {
    await query(
      `INSERT INTO alert_history (sent_at, changes_count, critical_count, normal_count, low_count, change_hashes, source)
       VALUES (now(), $1, $2, $3, $4, $5, $6)`,
      [
        counts.total, counts.critical, counts.normal, counts.low,
        report.changes.map(c => c.hash || ''), report.source || 'unknown',
      ]
    );
  } catch (e) { log('warn', 'alert_history_save_failed', { error: e.message }); }
}

async function processDiff(cacheData) {
  try {
    const report = await diffDetector.buildDiffReport(cacheData, cacheData.lastModifiedBy || 'Inconnu');

    if (!report || !report.changes || report.changes.length === 0) {
      return { sent: false, reason: 'no_changes' };
    }

    const newHashes = [];
    const freshChanges = [];

    for (const change of report.changes) {
      const hash = change.hash || diffDetector.computeChangeHash(change);
      if (!(await isDuplicate(hash))) {
        newHashes.push(hash);
        freshChanges.push(change);
      }
    }

    if (freshChanges.length === 0) {
      log('info', 'alert_all_deduped', { total: report.changes.length });
      return { sent: false, reason: 'all_deduped' };
    }

    report.changes = freshChanges;

    const counts = { total: freshChanges.length, critical: 0, normal: 0, low: 0 };
    for (const c of freshChanges) {
      if (c.type === 'Ajout' || c.type === 'Suppression') {
        counts.critical++;
      } else {
        for (const f of c.fields) {
          const p = f.priority || 'low';
          counts[p]++;
        }
      }
    }

    const sent = await emailAlert.sendAlert(report);
    if (sent) {
      await markAlerted(newHashes);
      await saveHistory(report, counts);
      log('info', 'alert_sent', { changes: counts.total, critical: counts.critical, normal: counts.normal, low: counts.low });
    }

    await cleanOldDedup();

    return { sent: !!sent, counts };
  } catch (e) {
    log('error', 'alert_manager_failed', { error: e.message });
    return { sent: false, reason: 'error', error: e.message };
  }
}

module.exports = { processDiff, isDuplicate, markAlerted, cleanOldDedup };
