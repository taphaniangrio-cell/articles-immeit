const { log } = require('./logger');
const { query } = require('./db');
const diffDetector = require('./diff-detector');
const emailAlert = require('./email-alert');

let diffLock = false;

async function processDiff(cacheData) {
  if (diffLock) {
    log('info', 'alert_diff_lock_held');
    return { sent: false, reason: 'diff_lock_held' };
  }
  diffLock = true;

  try {
    log('info', 'alert_process_diff_start', { source: cacheData.source, items: cacheData.items?.length, lastModifiedBy: cacheData.lastModifiedBy });

    const report = await diffDetector.buildDiffReport(cacheData, cacheData.lastModifiedBy || 'Inconnu');

    if (!report || !report.changes || report.changes.length === 0) {
      log('info', 'alert_no_changes_to_report', { hasReport: !!report, changesCount: report?.changes?.length || 0 });
      return { sent: false, reason: 'no_changes' };
    }

    log('info', 'alert_changes_detected', { total: report.changes.length, source: report.source });

    const VALID_PRIORITIES = new Set(['critical', 'normal', 'low']);
    const counts = { total: report.changes.length, critical: 0, normal: 0, low: 0 };
    for (const c of report.changes) {
      if (c.type === 'Ajout' || c.type === 'Suppression') {
        counts.critical++;
      } else {
        for (const f of c.fields) {
          const p = VALID_PRIORITIES.has(f.priority) ? f.priority : 'low';
          counts[p]++;
        }
      }
    }

    log('info', 'alert_sending_email', { counts, by: report.lastModifiedBy });

    const sent = await emailAlert.sendAlert(report);
    log('info', 'alert_send_result', { sent: !!sent, type: typeof sent });

    if (sent) {
      await saveHistory(report, counts);
      log('info', 'alert_sent', { changes: counts.total, critical: counts.critical, normal: counts.normal, low: counts.low });
    } else {
      log('warn', 'alert_send_failed', { reason: 'emailAlert.sendAlert returned falsy' });
    }

    return { sent: !!sent, counts };
  } catch (e) {
    log('error', 'alert_manager_failed', { error: e.message, stack: e.stack?.split('\n')[1] });
    return { sent: false, reason: 'error', error: e.message };
  } finally {
    diffLock = false;
  }
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

module.exports = { processDiff };
