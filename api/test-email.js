const { requireAuth } = require('../lib/auth');
const { log } = require('../lib/logger');

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET requis' });

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const alertTo = process.env.ALERT_EMAIL_TO;

  const config = {
    smtpHost: process.env.SMTP_HOST || 'smtp.office365.com',
    smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
    smtpUser: smtpUser ? smtpUser.replace(/(.{3}).*(@.*)/, '$1***$2') : null,
    smtpFrom: process.env.SMTP_FROM || null,
    alertTo: alertTo ? alertTo.replace(/(.{3}).*(@.*)/, '$1***$2') : null,
    configured: !!(smtpUser && smtpPass && alertTo),
  };

  if (!config.configured) {
    return res.status(200).json({
      success: false,
      config,
      message: 'SMTP non configuré — SMTP_USER, SMTP_PASS et ALERT_EMAIL_TO requis dans .env',
    });
  }

  try {
    const { sendAlert } = require('../lib/email-alert');
    const testReport = {
      detectedAt: new Date().toISOString(),
      syncedAt: new Date().toISOString(),
      lastModifiedBy: 'Test SMTP',
      lastModifiedDateTime: new Date().toISOString(),
      totalBefore: 0,
      totalAfter: 1,
      source: 'test',
      changes: [{
        row: 0,
        id: 'TEST-001',
        site: 'Test',
        demandeur: 'Admin',
        type: 'Modification',
        hash: 'test_' + Date.now(),
        fields: [{
          field: 'etat_davance_de_la_demande',
          label: "État d'avancement",
          colonne: 'A',
          oldValue: 'Ancienne valeur',
          newValue: 'Nouvelle valeur (test SMTP)',
          priority: 'critical',
        }],
      }],
    };

    const result = await sendAlert(testReport);

    log('info', 'test_email_sent', { result: typeof result === 'object' ? 'ethereal' : result });

    return res.status(200).json({
      success: true,
      config,
      result: typeof result === 'object' ? { previewUrl: result.previewUrl } : 'smtp_delivered',
      message: typeof result === 'object'
        ? 'Email envoyé via Ethereal (SMTP a échoué). Ouvrir le previewUrl pour voir l\'email.'
        : 'Email envoyé avec succès via SMTP.',
    });
  } catch (err) {
    log('error', 'test_email_failed', { error: err.message });
    return res.status(200).json({
      success: false,
      config,
      error: err.message,
      message: 'Échec de l\'envoi: ' + err.message,
    });
  }
});
