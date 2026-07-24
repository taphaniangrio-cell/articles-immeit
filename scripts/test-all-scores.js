const CONTRACTIONS = /\b(j'ai|j'suis|j'pense|j'dis|j'vais|j'crois|j'vois|j'fais|c'est|c'que|c'là|c'qui|on fait|y'a|t'as|n'attendez|n'attendons|qu'on|qu'il|qu'elle|qu'elles|qu'ils|s'est|n'est|n'a|y'avait|c'était|j'avais|j'aurais|on a|on a vu|on a constaté)\b/gi;
const PERSONAL_ANCHORS = /\b(\d{1,3}[\s]*%|il y a \d+|en \d{4}|la semaine dernière|ce mois|hier|aujourd'hui|dans mon|de mon|notre client|un client|j'ai \w+|on a \w+|on fait|on travaille avec|on accompagne|depuis \d+|pendant \d+|\d+ mois|\d+ semaines|\d+ heures|\d+ jours|\d+ ans|\d+ années)\b/gi;
const HEDGE_WORDS = /(\b(arguably|il pourrait être dit|dans certains cas|certains experts|on peut avancer|il est important de noter|il convient de souligner|force est de constater|it could be argued|in some cases|some experts believe|it is important to note)\b)/gi;

function score(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-zà-ÿ]/g, '')));
  const lexicalDiversity = wordCount > 0 ? uniqueWords.size / wordCount : 0;
  const lexicalDiversityScore = Math.min(10, Math.round(lexicalDiversity / 0.80 * 10));
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentLengths = sentences.map(s => s.split(/\s+/).filter(Boolean).length);
  const avgLen = sentLengths.reduce((a, b) => a + b, 0) / (sentLengths.length || 1);
  const variance = sentLengths.reduce((a, b) => a + Math.pow(b - avgLen, 2), 0) / (sentLengths.length || 1);
  const cv = avgLen > 0 ? Math.sqrt(variance) / avgLen : 0;
  const sentenceVarietyScore = Math.min(10, Math.round(cv / 0.60 * 10));
  const contractionMatches = text.match(CONTRACTIONS) || [];
  const contractionDensity = (contractionMatches.length / (wordCount || 1)) * 1000;
  const contractionsScore = Math.min(10, Math.round(Math.min(contractionDensity, 8) / 8 * 10));
  const hedgeMatches = text.match(HEDGE_WORDS) || [];
  const hedgeDensity = (hedgeMatches.length / (wordCount || 1)) * 500;
  const hedgeWordsScore = Math.min(10, Math.max(0, 10 - Math.round(hedgeDensity * 3)));
  const personalMatches = text.match(PERSONAL_ANCHORS) || [];
  const personalAnchorsScore = Math.min(10, Math.round(Math.min(personalMatches.length, 5) / 5 * 10));
  const wordCountScore = wordCount >= 300 && wordCount <= 500 ? 10 : wordCount >= 200 && wordCount <= 600 ? 7 : wordCount >= 150 ? 4 : 2;
  const total = Math.round(lexicalDiversityScore * 0.2 + sentenceVarietyScore * 0.2 + contractionsScore * 0.15 + hedgeWordsScore * 0.15 + personalAnchorsScore * 0.15 + wordCountScore * 0.15);
  return { total, wordCount, ld: (lexicalDiversity * 100).toFixed(0), sv: (cv * 100).toFixed(0), cm: contractionMatches.length, pm: personalMatches.length, pmatches: personalMatches.slice(0, 10) };
}

const articles = require('./seed-data.json');
articles.forEach((a, i) => {
  const s = score(a.corps);
  console.log(`#${i+1} [${s.total}/10] ${a.titre_interne.slice(0,50)}... | words:${s.wordCount} ld:${s.ld}% sv:${s.sv}% cont:${s.cm} anchors:${s.pm}`);
  if (s.pm < 3) console.log(`   Anchors: ${s.pmatches.join(', ')}`);
});
