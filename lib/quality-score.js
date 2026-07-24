const HEDGE_WORDS = /\b(arguably|il pourrait être dit|dans certains cas|certains experts|on peut avancer|il est important de noter|il convient de souligner|force est de constater|it could be argued|in some cases|some experts believe|it is important to note)\b/gi;
const CONTRACTIONS = /\b(j'ai|j'suis|j'pense|j'dis|j'vais|j'crois|j'vois|j'fais|c'est|c'que|c'là|c'qui|on fait|y'a|t'as|n'attendez|n'attendons|qu'on|qu'il|qu'elle|qu'elles|qu'ils|s'est|n'est|n'a|y'avait|c'était|j'avais|j'aurais|on a|on a vu|on a constaté)\b/gi;
const PERSONAL_ANCHORS = /\b(\d{1,3}[\s]*%|il y a \d+|en \d{4}|la semaine dernière|ce mois|hier|aujourd'hui|dans mon|de mon|notre client|un client|j'ai \w+|j'y \w+ \w+|m'a \w+|on a \w+|on fait|on travaille avec|on accompagne|je \w+|depuis \d+|pendant \d+|\d+ mois|\d+ semaines|\d+ heures|\d+ jours|\d+ ans|\d+ années)\b/gi;

function scoreArticle(text) {
  if (!text || typeof text !== 'string') return { total: 0, details: {} };

  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-zà-ÿ]/g, '')));

  // Lexical diversity: unique/total, target > 0.70, max at 0.80
  const lexicalDiversity = wordCount > 0 ? uniqueWords.size / wordCount : 0;
  const ldScore = Math.min(10, Math.round(lexicalDiversity / 0.80 * 10));

  // Sentence variety: coefficient of variation of sentence lengths
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentLengths = sentences.map(s => s.split(/\s+/).filter(Boolean).length);
  const avgLen = sentLengths.reduce((a, b) => a + b, 0) / (sentLengths.length || 1);
  const variance = sentLengths.reduce((a, b) => a + Math.pow(b - avgLen, 2), 0) / (sentLengths.length || 1);
  const cv = avgLen > 0 ? Math.sqrt(variance) / avgLen : 0;
  const svScore = Math.min(10, Math.round(cv / 0.60 * 10));

  // Contractions: target > 4 per 1000 words, max at 8
  const contractionMatches = text.match(CONTRACTIONS) || [];
  const contractionDensity = (contractionMatches.length / (wordCount || 1)) * 1000;
  const cScore = Math.min(10, Math.round(Math.min(contractionDensity, 8) / 8 * 10));

  // Hedge words: penalize if > 4 per 500 words
  const hedgeMatches = text.match(HEDGE_WORDS) || [];
  const hedgeDensity = (hedgeMatches.length / (wordCount || 1)) * 500;
  const hScore = Math.min(10, Math.max(0, 10 - Math.round(hedgeDensity * 3)));

  // Personal anchors: target > 3, max at 5
  const personalMatches = text.match(PERSONAL_ANCHORS) || [];
  const pScore = Math.min(10, Math.round(Math.min(personalMatches.length, 5) / 5 * 10));

  // Word count: target 300-500
  const wScore = wordCount >= 300 && wordCount <= 500 ? 10 :
    wordCount >= 200 && wordCount <= 600 ? 7 :
    wordCount >= 150 ? 4 : 2;

  const total = Math.round(
    ldScore * 0.2 +
    svScore * 0.2 +
    cScore * 0.15 +
    hScore * 0.15 +
    pScore * 0.15 +
    wScore * 0.15
  );

  return {
    total,
    details: {
      lexicalDiversity: { score: ldScore, value: Math.round(lexicalDiversity * 100), count: uniqueWords.size, total: wordCount },
      sentenceVariety: { score: svScore, value: Math.round(cv * 100) },
      contractions: { score: cScore, count: contractionMatches.length, density: Math.round(contractionDensity * 10) / 10 },
      hedgeWords: { score: hScore, count: hedgeMatches.length },
      personalAnchors: { score: pScore, count: personalMatches.length, matches: personalMatches.slice(0, 10) },
      wordCount: { score: wScore, count: wordCount },
    }
  };
}

function getImprovementFeedback(scoreResult) {
  const d = scoreResult.details;
  const feedback = [];

  if (d.contractions.count < 8) {
    feedback.push(`CONTRACTIONS: tu as ${d.contractions.count}, il en faut minimum 8. Utilise "j'ai", "c'est", "on fait", "y'a", "t'as", "j'dis", "c'là", "qu'on", "c'que", "j'pense"`);
  }
  if (d.personalAnchors.count < 3) {
    feedback.push(`ANCRAGES PERSONNELS: tu as ${d.personalAnchors.count}, il en faut minimum 3. Ajoute des anecdotes avec dates, chiffres clients anonymisés, observations terrain vécues ("j'ai vu", "j'ai compté", "on a constaté", "un client dans l'agro", "il y a X mois")`);
  }
  if (d.wordCount.count < 300) {
    feedback.push(`LONGUEUR: ${d.wordCount.count} mots, il en faut minimum 300. Ajoute des détails, exemples chiffrés, retours terrain`);
  }
  if (d.sentenceVariety.value < 45) {
    feedback.push(`VARIÉTÉ DES PHRASES: coefficient ${d.sentenceVariety.value}%, il faut >45%. Alterne des phrases TRÈS courtes (3-6 mots) avec des phrases longues (25-40 mots)`);
  }
  if (d.lexicalDiversity.value < 60) {
    feedback.push(`DIVERSITÉ LEXICALE: ${d.lexicalDiversity.value}%, utilise plus de synonymes, évite de répéter les mêmes mots`);
  }
  if (d.hedgeWords.count > 0) {
    feedback.push(`HEDGE WORDS DÉTECTÉS: ${d.hedgeWords.count}. Supprime "il est important de noter", "force est de constater", "dans certains cas"`);
  }

  return feedback;
}

module.exports = { scoreArticle, getImprovementFeedback };
