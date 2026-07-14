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

// ─── Helpers pour le template ───

function typeIcon(type) {
  if (type === 'Ajout') return '➕';
  if (type === 'Suppression') return '🗑️';
  return '✏️';
}

function typeColors(type) {
  if (type === 'Ajout') return { badge: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
  if (type === 'Suppression') return { badge: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
  return { badge: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
}

// ─── Construction du mail HTML ───

function buildProHtml(report) {
  const nbAdds = report.changes.filter(c => c.type === 'Ajout').length;
  const nbMods = report.changes.filter(c => c.type === 'Modification').length;
  const nbDels = report.changes.filter(c => c.type === 'Suppression').length;
  const total = nbAdds + nbMods + nbDels;

  // Résumé textuel pour le header
  const summaryParts = [];
  if (nbAdds) summaryParts.push(nbAdds + ' ajout' + (nbAdds > 1 ? 's' : ''));
  if (nbMods) summaryParts.push(nbMods + ' modification' + (nbMods > 1 ? 's' : ''));
  if (nbDels) summaryParts.push(nbDels + ' suppression' + (nbDels > 1 ? 's' : ''));

  // Lignes affectées (triées, dédupliquées)
  const affectedRows = [...new Set(report.changes.map(c => c.row))].sort((a, b) => a - b);
  const rowsLabel = affectedRows.length <= 8
    ? affectedRows.join(', ')
    : affectedRows.slice(0, 6).join(', ') + ' … +' + (affectedRows.length - 6) + ' autres';

  // Date de modification sur le fichier (réelle) vs date de détection
  const modifiedTime = report.lastModifiedDateTime
    ? fmtTime(report.lastModifiedDateTime)
    : fmtTime(report.detectedAt);

  // ── Bloc info (qui, quand, lignes) ──
  const infoHtml = ''
    + '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">'

    // Ligne 1 : Modifié par
    + '<tr>'
    + '<td style="padding:10px 0;border-bottom:1px solid #e2e8f0;width:140px;vertical-align:top">'
    + '<span style="font-size:12px;color:#64748b;font-weight:600">👤 Modifié par</span>'
    + '</td>'
    + '<td style="padding:10px 0;border-bottom:1px solid #e2e8f0;vertical-align:top">'
    + '<span style="font-size:14px;color:#1e293b;font-weight:700">' + escapeHtml(report.lastModifiedBy) + '</span>'
    + '</td>'
    + '</tr>'

    // Ligne 2 : Date & heure
    + '<tr>'
    + '<td style="padding:10px 0;border-bottom:1px solid #e2e8f0;vertical-align:top">'
    + '<span style="font-size:12px;color:#64748b;font-weight:600">🕐 Date & heure</span>'
    + '</td>'
    + '<td style="padding:10px 0;border-bottom:1px solid #e2e8f0;vertical-align:top">'
    + '<span style="font-size:13px;color:#334155">' + escapeHtml(modifiedTime) + '</span>'
    + '</td>'
    + '</tr>'

    // Ligne 3 : Lignes affectées
    + '<tr>'
    + '<td style="padding:10px 0;border-bottom:1px solid #e2e8f0;vertical-align:top">'
    + '<span style="font-size:12px;color:#64748b;font-weight:600">📄 Lignes modifiées</span>'
    + '</td>'
    + '<td style="padding:10px 0;border-bottom:1px solid #e2e8f0;vertical-align:top">'
    + '<span style="font-size:13px;color:#334155;font-weight:600">' + escapeHtml(rowsLabel) + '</span>'
    + ' <span style="font-size:11px;color:#94a3b8">(' + total + ' changement' + (total > 1 ? 's' : '') + ')</span>'
    + '</td>'
    + '</tr>'

    // Ligne 4 : Résumé
    + '<tr>'
    + '<td style="padding:10px 0;vertical-align:top">'
    + '<span style="font-size:12px;color:#64748b;font-weight:600">📊 Résumé</span>'
    + '</td>'
    + '<td style="padding:10px 0;vertical-align:top">'
    + '<span style="font-size:13px;color:#334155">' + summaryParts.join(' &bull; ') + '</span>'
    + '</td>'
    + '</tr>'

    + '</table>';

  // ── Bloc détails de chaque changement ──
  let changesHtml = '';

  for (const c of report.changes) {
    const colors = typeColors(c.type);
    const icon = typeIcon(c.type);
    const typeLabel = c.type;

    // En-tête de la carte changement
    let cardHeader = ''
      + '<td style="padding:12px 16px;background:' + colors.bg + ';border-bottom:1px solid ' + colors.border + '">'
      + '<table width="100%" cellpadding="0" cellspacing="0"><tr>'
      + '<td>'
      + '<span style="display:inline-block;background:' + colors.badge + ';color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px">'
      + icon + ' ' + typeLabel
      + '</span>'
      + '</td>'
      + '<td style="text-align:right;color:#64748b;font-size:12px">'
      + 'Ligne <strong style="color:#1e293b;font-size:13px">' + c.row + '</strong>';

    if (c.id) {
      cardHeader += ' &mdash; N&deg; <strong style="color:#1e293b">' + escapeHtml(c.id) + '</strong>';
    }

    cardHeader += '</td></tr></table></td>';

    // Contenu de la carte
    let cardBody = '';

    if (c.type === 'Modification' && c.fields && c.fields.length > 0) {
      for (const f of c.fields) {
        cardBody += '<tr><td style="padding:10px 16px;border-bottom:1px solid #f1f5f9">';

        // Nom du champ + colonne
        cardBody += '<div style="margin-bottom:8px">'
          + '<span style="display:inline-block;background:#f1f5f9;color:#475569;font-size:11px;font-weight:600;padding:2px 8px;border-radius:3px;text-transform:uppercase;letter-spacing:0.3px">'
          + escapeHtml(f.label)
          + '</span>';
        if (f.colonne) {
          cardBody += ' <span style="color:#94a3b8;font-size:11px">Colonne ' + escapeHtml(f.colonne) + '</span>';
        }
        cardBody += '</div>';

        // Avant / Après côte à côte
        cardBody += '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse"><tr>'
          + '<td style="width:48%;padding:8px 10px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:4px 0 0 4px;vertical-align:top">'
          + '<div style="font-size:10px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Avant</div>'
          + '<div style="font-size:13px;color:#7f1d1d;line-height:1.4">' + escapeHtml(f.oldValue) + '</div>'
          + '</td>'
          + '<td style="width:4%;text-align:center;vertical-align:middle;color:#94a3b8;font-size:16px">&rarr;</td>'
          + '<td style="width:48%;padding:8px 10px;background:#f0fdf4;border-left:3px solid #16a34a;border-radius:0 4px 4px 0;vertical-align:top">'
          + '<div style="font-size:10px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Apr&egrave;s</div>'
          + '<div style="font-size:13px;color:#14532d;font-weight:600;line-height:1.4">' + escapeHtml(f.newValue) + '</div>'
          + '</td>'
          + '</tr></table>';

        cardBody += '</td></tr>';
      }
    } else if (c.type === 'Ajout') {
      cardBody = '<tr><td style="padding:14px 16px;font-size:13px;color:#166534;line-height:1.6">'
        + '<strong>Nouvelle demande</strong> ajout&eacute;e au fichier de suivi.';
      if (c.id) cardBody += '<br>N&deg; : <strong>' + escapeHtml(c.id) + '</strong>';
      if (c.site) cardBody += ' &bull; Site : ' + escapeHtml(c.site);
      if (c.demandeur) cardBody += ' &bull; Demandeur : ' + escapeHtml(c.demandeur);
      cardBody += '</td></tr>';
    } else {
      cardBody = '<tr><td style="padding:14px 16px;font-size:13px;color:#991b1b;line-height:1.6">'
        + '<strong>Suppression</strong> de cette demande du fichier de suivi.';
      if (c.id) cardBody += '<br>N&deg; : <strong>' + escapeHtml(c.id) + '</strong>';
      if (c.site) cardBody += ' &bull; Site : ' + escapeHtml(c.site);
      if (c.demandeur) cardBody += ' &bull; Demandeur : ' + escapeHtml(c.demandeur);
      cardBody += '</td></tr>';
    }

    // Assemblage de la carte
    changesHtml += '<tr><td style="padding:8px 0">'
      + '<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ' + colors.border + ';border-radius:8px;overflow:hidden;background:#fff">'
      + '<tr>' + cardHeader + '</tr>'
      + '<tr><td><table width="100%" cellpadding="0" cellspacing="0">' + cardBody + '</table></td></tr>'
      + '</table>'
      + '</td></tr>';
  }

  // ── Assemblage final ──
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>'
    + '<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;background:#f1f5f9">'
    + '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">'
    + '<table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.08)">'

    // ── Header ──
    + '<tr><td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:24px 28px">'
    + '<div style="color:#fff;font-size:18px;font-weight:700;margin-bottom:4px">📋 Fichier de suivi &mdash; Modification d&eacute;tect&eacute;e</div>'
    + '<div style="color:#94a3b8;font-size:13px">' + total + ' changement' + (total > 1 ? 's' : '') + ' sur le fichier Suivi Demandes 2026</div>'
    + '</td></tr>'

    // ── Bloc info : Qui / Quand / Lignes / Résumé ──
    + '<tr><td style="padding:16px 28px;background:#f8fafc;border-bottom:2px solid #e2e8f0">'
    + infoHtml
    + '</td></tr>'

    // ── Section "Détail des changements" ──
    + '<tr><td style="padding:20px 28px 6px">'
    + '<div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:4px">Détail des changements</div>'
    + '<div style="font-size:12px;color:#64748b;margin-bottom:12px">'
    + 'Chaque carte ci-dessous correspond à une ligne modifiée dans le fichier de suivi.'
    + '</div>'
    + '</td></tr>'
    + '<tr><td style="padding:0 20px 12px"><table width="100%" cellpadding="0" cellspacing="0">' + changesHtml + '</table></td></tr>'

    // ── Footer ──
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

  // Lignes affectées pour le log
  const affectedRows = [...new Set(report.changes.map(c => c.row))].sort((a, b) => a - b);

  log('info', 'alert_sending', {
    by: report.lastModifiedBy,
    at: report.lastModifiedDateTime || report.detectedAt,
    rows: affectedRows,
    added: nbAdds, modified: nbMods, removed: nbDels,
  });

  const subject = buildSubject(nbAdds, nbMods, nbDels, report.lastModifiedBy);
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

function buildSubject(nbAdds, nbMods, nbDels, modifiedBy) {
  const total = nbAdds + nbMods + nbDels;
  const parts = [];
  if (nbAdds > 0) parts.push(nbAdds + ' ajout' + (nbAdds > 1 ? 's' : ''));
  if (nbMods > 0) parts.push(nbMods + ' modif' + (nbMods > 1 ? 's' : ''));
  if (nbDels > 0) parts.push(nbDels + ' suppr' + (nbDels > 1 ? 's' : ''));
  const who = modifiedBy && modifiedBy !== 'Inconnu' ? ' par ' + modifiedBy : '';
  return total + ' changement' + (total > 1 ? 's' : '') + who + ' (' + parts.join(', ') + ')';
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
