const nodemailer = require('nodemailer');
const { log } = require('./logger');

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
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

function classifyChangePriority(change) {
  if (change.type === 'Ajout' || change.type === 'Suppression') return 'critical';
  if (!change.fields || change.fields.length === 0) return 'low';
  const priorities = change.fields.map(f => f.priority || 'low');
  if (priorities.includes('critical')) return 'critical';
  if (priorities.includes('normal')) return 'normal';
  return 'low';
}

function buildProHtml(report) {
  const nbAdds = report.changes.filter(c => c.type === 'Ajout').length;
  const nbMods = report.changes.filter(c => c.type === 'Modification').length;
  const nbDels = report.changes.filter(c => c.type === 'Suppression').length;

  const summaryParts = [];
  if (nbAdds) summaryParts.push(nbAdds + ' ajout' + (nbAdds > 1 ? 's' : ''));
  if (nbMods) summaryParts.push(nbMods + ' modification' + (nbMods > 1 ? 's' : ''));
  if (nbDels) summaryParts.push(nbDels + ' suppression' + (nbDels > 1 ? 's' : ''));
  const summaryText = summaryParts.join(' &bull; ');

  let changesHtml = '';
  let changeIdx = 0;
  for (const c of report.changes) {
    changeIdx++;

    const typeColor = c.type === 'Ajout' ? '#16a34a' : c.type === 'Suppression' ? '#dc2626' : '#2563eb';
    const typeBg = c.type === 'Ajout' ? '#f0fdf4' : c.type === 'Suppression' ? '#fef2f2' : '#eff6ff';
    const typeLabel = c.type === 'Ajout' ? 'Ajout' : c.type === 'Suppression' ? 'Suppression' : 'Modification';
    const typeBadgeBg = c.type === 'Ajout' ? '#16a34a' : c.type === 'Suppression' ? '#dc2626' : '#2563eb';

    let detailHtml = '';
    if (c.type === 'Modification') {
      for (const f of c.fields) {
        detailHtml += '<tr><td style="padding:12px 16px;border-bottom:1px solid #f1f5f9">'
          + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">'
          + '<span style="display:inline-block;background:#f1f5f9;color:#475569;font-size:11px;font-weight:600;padding:2px 8px;border-radius:3px;text-transform:uppercase;letter-spacing:0.3px">' + escapeHtml(f.label) + '</span>'
          + (f.colonne ? '<span style="color:#94a3b8;font-size:11px">Col. ' + escapeHtml(f.colonne) + '</span>' : '')
          + '</div>'
          + '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">'
          + '<tr>'
          + '<td style="width:48%;padding:8px 10px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:4px 0 0 4px;vertical-align:top">'
          + '<div style="font-size:10px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Avant</div>'
          + '<div style="font-size:13px;color:#7f1d1d;line-height:1.4">' + escapeHtml(f.oldValue) + '</div>'
          + '</td>'
          + '<td style="width:4%;background:#e2e8f0"></td>'
          + '<td style="width:48%;padding:8px 10px;background:#f0fdf4;border-left:3px solid #16a34a;border-radius:0 4px 4px 0;vertical-align:top">'
          + '<div style="font-size:10px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Apr&egrave;s</div>'
          + '<div style="font-size:13px;color:#14532d;font-weight:600;line-height:1.4">' + escapeHtml(f.newValue) + '</div>'
          + '</td>'
          + '</tr></table>'
          + '</td></tr>';
      }
    } else if (c.type === 'Ajout') {
      detailHtml = '<tr><td style="padding:14px 16px;font-size:13px;color:#166534;line-height:1.5">'
        + '<strong>Nouvelle demande</strong> ajout&eacute;e au fichier de suivi.'
        + (c.id ? '<br>N&deg; : <strong>' + escapeHtml(c.id) + '</strong>' : '')
        + (c.site ? ' &bull; Site : ' + escapeHtml(c.site) : '')
        + (c.demandeur ? ' &bull; Demandeur : ' + escapeHtml(c.demandeur) : '')
        + '</td></tr>';
    } else {
      detailHtml = '<tr><td style="padding:14px 16px;font-size:13px;color:#991b1b;line-height:1.5">'
        + '<strong>Suppression</strong> de cette demande du fichier de suivi.'
        + (c.id ? '<br>N&deg; : <strong>' + escapeHtml(c.id) + '</strong>' : '')
        + (c.site ? ' &bull; Site : ' + escapeHtml(c.site) : '')
        + (c.demandeur ? ' &bull; Demandeur : ' + escapeHtml(c.demandeur) : '')
        + '</td></tr>';
    }

    changesHtml += '<tr><td style="padding:10px 20px 2px">'
      + '<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#fff">'
      + '<tr><td style="padding:12px 16px;background:' + typeBg + ';border-bottom:1px solid #e2e8f0">'
      + '<table width="100%" cellpadding="0" cellspacing="0"><tr>'
      + '<td>'
      + '<span style="display:inline-block;background:' + typeBadgeBg + ';color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:3px;text-transform:uppercase;letter-spacing:0.5px">' + typeLabel + '</span>'
      + '</td>'
      + '<td style="text-align:right;color:#64748b;font-size:12px">'
      + 'Ligne <strong style="color:#1e293b">' + c.row + '</strong>'
      + (c.id ? ' &bull; N&deg; <strong style="color:#1e293b">' + escapeHtml(c.id) + '</strong>' : '')
      + '</td>'
      + '</tr></table>'
      + '</td></tr>'
      + '<tr><td><table width="100%" cellpadding="0" cellspacing="0">' + detailHtml + '</table></td></tr>'
      + '</table>'
      + '</td></tr>';
  }

  return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>'
    + '<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;background:#f1f5f9">'
    + '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">'
    + '<table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.08)">'
    // Header
    + '<tr><td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:24px 28px">'
    + '<div style="color:#fff;font-size:18px;font-weight:700;margin-bottom:6px">Fichier de suivi &mdash; Mise &agrave; jour d&eacute;tect&eacute;e</div>'
    + '<div style="color:#94a3b8;font-size:13px">' + summaryText + '</div>'
    + '</td></tr>'
    // Meta info
    + '<tr><td style="padding:16px 28px;background:#f8fafc;border-bottom:2px solid #e2e8f0">'
    + '<table width="100%" cellpadding="0" cellspacing="0"><tr>'
    + '<td style="font-size:13px;color:#334155">'
    + '<strong style="color:#1e293b">Modifi&eacute; par</strong>&nbsp;: <span style="color:#2563eb;font-weight:600">' + escapeHtml(report.lastModifiedBy) + '</span>'
    + '</td>'
    + '<td style="font-size:13px;color:#64748b;text-align:right;white-space:nowrap">'
    + fmtTime(report.detectedAt)
    + '</td>'
    + '</tr></table>'
    + '</td></tr>'
    // Changes
    + '<tr><td style="padding:8px 0"><table width="100%" cellpadding="0" cellspacing="0">' + changesHtml + '</table></td></tr>'
    // Footer
    + '<tr><td style="padding:14px 28px;border-top:1px solid #e2e8f0;background:#f8fafc">'
    + '<p style="margin:0;color:#94a3b8;font-size:11px">Email automatique &mdash; IMMEIT Hub &bull; Fichier : Suivi Demandes 2026</p>'
    + '</td></tr>'
    + '</table></td></tr></table></body></html>';
}

function buildHtml(report) {
  return buildProHtml(report);
}

async function sendSmtp(subject, htmlBody) {
  const host = process.env.SMTP_HOST || 'smtp.office365.com';
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const to = process.env.ALERT_EMAIL_TO;

  if (!user || !pass) throw new Error('SMTP_USER et SMTP_PASS requis dans .env');
  if (!to) throw new Error('ALERT_EMAIL_TO requis dans .env');

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
    to: process.env.ALERT_EMAIL_TO || 'destinataire@email.com',
    subject: '[IMMEIT] ' + subject,
    html: htmlBody,
  });
  transporter.close();
  return nodemailer.getTestMessageUrl(info);
}

async function sendAlert(report) {
  const nbAdds = report.changes.filter(c => c.type === 'Ajout').length;
  const nbMods = report.changes.filter(c => c.type === 'Modification').length;
  const nbDels = report.changes.filter(c => c.type === 'Suppression').length;

  if (!nbAdds && !nbMods && !nbDels) {
    log('info', 'alert_no_changes_skipped');
    return true;
  }

  log('info', 'alert_sending', {
    by: report.lastModifiedBy,
    at: report.detectedAt,
    added: nbAdds, modified: nbMods, removed: nbDels,
  });

  const subject = buildSubject(nbAdds, nbMods, nbDels);
  const htmlBody = buildProHtml(report);

  let lastError;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const messageId = await sendSmtp(subject, htmlBody);
      log('info', 'alert_smtp_sent', {
        to: process.env.ALERT_EMAIL_TO,
        added: nbAdds, modified: nbMods, removed: nbDels,
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

function buildSubject(nbAdds, nbMods, nbDels) {
  const total = nbAdds + nbMods + nbDels;
  const parts = [];
  if (nbAdds > 0) parts.push(nbAdds + ' ajout' + (nbAdds > 1 ? 's' : ''));
  if (nbMods > 0) parts.push(nbMods + ' modif' + (nbMods > 1 ? 's' : ''));
  if (nbDels > 0) parts.push(nbDels + ' suppr' + (nbDels > 1 ? 's' : ''));
  return total + ' changement' + (total > 1 ? 's' : '') + ' sur le fichier de suivi (' + parts.join(', ') + ')';
}

async function sendReconnectAlert(reason) {
  const subject = 'Reconnexion SharePoint nécessaire';
  const html = '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"></head>'
    + '<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;background:#f1f5f9">'
    + '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px">'
    + '<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1)">'
    + '<tr><td style="background:#dc2626;padding:16px 20px">'
    + '<h1 style="margin:0;color:#fff;font-size:15px;font-weight:600">Reconnexion SharePoint nécessaire</h1>'
    + '</td></tr>'
    + '<tr><td style="padding:20px;font-size:13px;color:#334155;line-height:1.6">'
    + '<p>La synchronisation automatique du fichier de suivi n\'arrive plus à s\'authentifier auprès de SharePoint.</p>'
    + (reason ? '<p style="color:#64748b;font-size:12px">Détail : ' + escapeHtml(reason) + '</p>' : '')
    + '<p>Le tableau de bord continue d\'afficher les dernières données connues (cache), mais elles ne sont plus mises à jour.</p>'
    + '<p><strong>Action requise :</strong> exécuter <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">node scripts/connect-sharepoint.js</code> depuis un poste ayant accès à SharePoint. Une seule reconnexion suffit — elle sera ensuite réutilisée automatiquement partout (y compris sur Vercel).</p>'
    + '</td></tr>'
    + '<tr><td style="background:#f8fafc;padding:10px 20px;border-top:1px solid #e2e8f0">'
    + '<p style="margin:0;color:#94a3b8;font-size:10px">Email automatique — IMMEIT Hub</p>'
    + '</td></tr>'
    + '</table></td></tr></table></body></html>';

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    log('warn', 'reconnect_alert_skipped_no_smtp');
    return false;
  }
  try {
    await sendSmtp(subject, html);
    log('info', 'reconnect_alert_sent', { reason });
    return true;
  } catch (err) {
    log('warn', 'reconnect_alert_failed', { error: err.message });
    return false;
  }
}

module.exports = { sendAlert, buildHtml, buildProHtml, sendReconnectAlert, classifyChangePriority };
