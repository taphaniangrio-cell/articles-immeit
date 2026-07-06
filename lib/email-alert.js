const nodemailer = require('nodemailer');
const { log } = require('./logger');

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(report) {
  var changes = [];
  if (report.added > 0) changes.push({ label: 'Nouvelle(s) demande(s)', count: report.added, rows: report.addedRows, klass: 'added' });
  if (report.removed > 0) changes.push({ label: 'Demande(s) supprimée(s)', count: report.removed, rows: report.removedRows, klass: 'removed' });
  if (report.modified > 0) changes.push({ label: 'Demande(s) modifiée(s)', count: report.modified, rows: report.modifiedRows, klass: 'modified' });

  var body = '';
  for (const section of changes) {
    body += '<div style="margin-bottom:20px">';
    body += '<h2 style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1e293b">' + section.label + ' (' + section.count + ')</h2>';
    for (const row of section.rows) {
      var bg = section.klass === 'added' ? '#f0fdf4' : section.klass === 'removed' ? '#fef2f2' : '#fffbeb';
      var color = section.klass === 'added' ? '#166534' : section.klass === 'removed' ? '#dc2626' : '#92400e';
      body += '<div style="margin:0 0 12px;padding:10px 12px;background:' + bg + ';border-left:3px solid ' + color + ';border-radius:4px;font-size:13px;line-height:1.5">';
      body += '<div style="font-weight:600;margin-bottom:4px">N° ' + escapeHtml(row.id || '—') + '</div>';
      body += '<div style="color:#475569">';
      if (row.site) body += 'Site: ' + escapeHtml(row.site) + '<br>';
      if (row.demandeur) body += 'Demandeur: ' + escapeHtml(row.demandeur) + '<br>';
      if (row.banc) body += 'Banc: ' + escapeHtml(row.banc) + '<br>';
      if (row.nature) body += 'Nature: ' + escapeHtml(row.nature) + '<br>';
      if (row.etat) body += 'État: ' + escapeHtml(row.etat) + '<br>';
      if (row.changes && row.changes.length > 0) {
        body += '<br><strong>Modifications :</strong><br>';
        for (const c of row.changes) {
          body += '<div style="margin:4px 0;padding:6px 8px;background:#fff;border-radius:3px;font-size:12px">';
          body += '<div style="font-weight:600;color:#92400e">' + escapeHtml(c.label) + '</div>';
          body += '<span style="color:#dc2626">← ' + escapeHtml(c.oldValue) + '</span><br>';
          body += '<span style="color:#166534">→ ' + escapeHtml(c.newValue) + '</span>';
          body += '</div>';
        }
      }
      body += '</div></div>';
    }
    body += '</div>';
  }

  return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>'
    + '<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;background:#f1f5f9">'
    + '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px">'
    + '<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1)">'
    + '<tr><td style="background:#1e293b;padding:16px 20px">'
    + '<h1 style="margin:0;color:#fff;font-size:15px;font-weight:600">🔔 Alerte modification — Suivi Demandes</h1>'
    + '<p style="margin:4px 0 0;color:#94a3b8;font-size:12px">' + escapeHtml(fmtTime(report.detectedAt)) + '</p>'
    + '</td></tr>'
    + '<tr><td style="padding:16px 20px">'
    + '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px">'
    + '<tr><td style="padding:4px 8px;color:#64748b">Modifié par</td><td style="padding:4px 8px;font-weight:600;text-align:right">' + escapeHtml(report.lastModifiedBy) + '</td></tr>'
    + '<tr><td style="padding:4px 8px;color:#64748b">Lignes avant</td><td style="padding:4px 8px;font-weight:600;text-align:right">' + report.totalBefore + '</td></tr>'
    + '<tr><td style="padding:4px 8px;color:#64748b">Lignes après</td><td style="padding:4px 8px;font-weight:600;text-align:right">' + report.totalAfter + '</td></tr>'
    + '</table>'
    + body
    + '</td></tr>'
    + '<tr><td style="background:#f8fafc;padding:10px 20px;border-top:1px solid #e2e8f0">'
    + '<p style="margin:0;color:#94a3b8;font-size:10px">Email automatique — IMMEIT Hub</p>'
    + '</td></tr>'
    + '</table></td></tr></table></body></html>';
}

async function sendSmtp(subject, htmlBody) {
  const host = process.env.SMTP_HOST || 'smtp.office365.com';
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const to = process.env.ALERT_EMAIL_TO || 'moustapha.niang@external.stellantis.com';

  if (!user || !pass) throw new Error('SMTP_USER et SMTP_PASS requis dans .env');

  const transporter = nodemailer.createTransport({
    host, port,
    secure: port === 465,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({
    from, to,
    subject: '[IMMEIT] ' + subject,
    html: htmlBody,
  });
  transporter.close();
  return info.messageId;
}

async function sendEthereal(subject, htmlBody) {
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });

  const info = await transporter.sendMail({
    from: '"IMMEIT Hub" <noreply@immeit.hub>',
    to: process.env.ALERT_EMAIL_TO || 'test@example.com',
    subject: '[IMMEIT] ' + subject,
    html: htmlBody,
  });
  transporter.close();
  return nodemailer.getTestMessageUrl(info);
}

let lastAlertTime = 0;
const ALERT_DEBOUNCE_MS = 5 * 60 * 1000;

async function sendAlert(report) {
  var now = Date.now();
  if (now - lastAlertTime < ALERT_DEBOUNCE_MS) {
    log('info', 'alert_debounced', { sinceLast: Math.round((now - lastAlertTime) / 1000) + 's' });
    return true;
  }
  lastAlertTime = now;

  const subject = buildSubject(report);
  const htmlBody = buildHtml(report);

  var lastError;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const messageId = await sendSmtp(subject, htmlBody);
      log('info', 'alert_smtp_sent', {
        to: process.env.ALERT_EMAIL_TO,
        added: report.added, modified: report.modified, removed: report.removed,
        messageId,
      });
      return true;
    } catch (err) {
      lastError = err;
      log('warn', 'alert_smtp_failed', { error: err.message });
    }
  }

  try {
    const url = await sendEthereal(subject, htmlBody);
    log('warn', 'alert_ethereal_fallback', {
      to: process.env.ALERT_EMAIL_TO,
      previewUrl: url,
      smtpError: lastError ? lastError.message : 'SMTP_USER/PASS not configured',
    });
    return { previewUrl: url };
  } catch (err2) {
    log('error', 'alert_all_failed', { smtpError: lastError ? lastError.message : null, etherealError: err2.message });
    return false;
  }
}

function buildSubject(report) {
  var parts = [];
  if (report.added > 0) parts.push(report.added + ' nouvelle(s)');
  if (report.modified > 0) parts.push(report.modified + ' modif(s)');
  if (report.removed > 0) parts.push(report.removed + ' suppr(s)');
  return '🔔 ' + parts.join(', ') + ' — Suivi Demandes';
}

module.exports = { sendAlert, buildHtml };