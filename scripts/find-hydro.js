require('dotenv').config();
const { query } = require('../lib/db');
(async () => {
  const r = await query("SELECT id, titre_interne FROM articles WHERE titre_interne LIKE $1", ['%hydro%']);
  r.rows.forEach(r => console.log('#' + r.id, r.titre_interne.slice(0, 60)));
  if (r.rows.length === 0) console.log('No matches found');
  process.exit();
})();
