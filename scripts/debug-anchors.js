require('dotenv').config();
const { query } = require('../lib/db');

const PERSONAL_ANCHORS = /\b(\d{1,3}[\s]*%|il y a \d+|en \d{4}|la semaine dernière|ce mois|hier|aujourd'hui|dans mon|de mon|notre client|un client|j'ai \w+|on a \w+|on fait|on travaille avec|on accompagne|depuis \d+|pendant \d+|\d+ mois|\d+ semaines|\d+ heures|\d+ jours|\d+ ans|\d+ années)\b/gi;

(async () => {
  const r = await query("SELECT id, corps FROM articles WHERE id = 157");
  if (r.rows.length === 0) { console.log('Not found'); process.exit(1); }
  const text = r.rows[0].corps;
  const matches = text.match(PERSONAL_ANCHORS) || [];
  console.log('Anchors found:', matches.length);
  matches.forEach(m => console.log(' -', m));
  process.exit();
})();
