const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env');
const env = fs.readFileSync(envPath, 'utf8');
env.split(/\r?\n/).forEach(line => {
  const m = line.match(/^([^#=]+)=(.+)/);
  if (m) {
    const key = m[1].trim();
    const value = m[2].trim();
    if (!process.env[key]) process.env[key] = value;
  }
});

const { sendAlert } = require('./lib/email-alert.js');

console.log('ALERT_EMAIL_TO:', process.env.ALERT_EMAIL_TO);
console.log('SMTP_USER:', process.env.SMTP_USER || 'NON DÉFINI');
if (process.env.SMTP_USER) console.log('SMTP_PASS:', process.env.SMTP_PASS ? '****' : 'NON DÉFINI');
console.log('');

const report = {
  detectedAt: new Date().toISOString(),
  syncedAt: new Date().toISOString(),
  lastModifiedBy: 'Test utilisateur (automatique)',
  totalBefore: 10,
  totalAfter: 11,
  added: 1,
  removed: 0,
  modified: 1,
  addedRows: [{id:'TEST-001', site:'Site A', demandeur:'Jean Dupont', nature:'Réparation', banc:'BANC-01', etat:'Nouveau', remarques:'', conformite:'OK'}],
  removedRows: [],
  modifiedRows: []
};

sendAlert(report).then(result => {
  if (result === true) {
    console.log('✓ Email envoyé via SMTP ! Vérifie ta boîte Outlook');
  } else if (result && result.previewUrl) {
    console.log('⚠ SMTP indisponible, email livré via Ethereal (faux SMTP)');
    console.log('  → Aperçu : ' + result.previewUrl);
    console.log('  L\'email n\'est pas réellement arrivé dans ta boîte.');
    console.log('  Mais le HTML est bon (tu peux cliquer le lien pour voir le rendu).');
  } else {
    console.log('✗ ÉCHEC total — aucun transport disponible');
    process.exit(1);
  }
});
