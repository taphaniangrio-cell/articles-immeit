require('dotenv').config();
const { query } = require('../lib/db');
(async () => {
  const r = await query("DELETE FROM articles WHERE titre_interne IN ('TEST DELETE CHECK', 'DELETE TEST 2') RETURNING id");
  console.log('Nettoyé:', r.rowCount, 'test articles supprimés');
  const c = await query('SELECT count(*) FROM articles');
  console.log('Reste:', c.rows[0].count, 'articles');
  process.exit();
})();
