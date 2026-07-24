require('dotenv').config();
const { scoreArticle, getImprovementFeedback } = require('../lib/quality-score');
const { query } = require('../lib/db');

(async () => {
  // Test with a short text (should score low)
  const short = "Un court texte de test. Pas assez de mots. J'ai vu un truc.";
  const s1 = scoreArticle(short);
  console.log('Short text score:', s1.total);
  const f1 = getImprovementFeedback(s1);
  console.log('Feedback:', f1);

  console.log('---');

  // Test with a good article from DB
  const r = await query('SELECT corps FROM articles WHERE id = 151');
  const s2 = scoreArticle(r.rows[0].corps);
  console.log('Good article score:', s2.total);
  const f2 = getImprovementFeedback(s2);
  console.log('Feedback:', f2.length === 0 ? 'NONE (passes)' : f2);

  process.exit();
})();
