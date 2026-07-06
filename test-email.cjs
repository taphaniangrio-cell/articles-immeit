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
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '****' : 'NON DÉFINI');
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

sendAlert(report).then(sent => {
  if (sent) {
    console.log('');
    console.log('✓ Email envoyé ! Vérifie ta boîte Outlook');
  } else {
    console.log('');
    console.log('✗ ÉCHEC : aucun canal d\'envoi n\'a fonctionné');
    process.exit(1);
  }
});
