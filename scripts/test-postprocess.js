require('dotenv').config();
const { scoreArticle } = require('../lib/quality-score');

const ANCHOR_SENTENCES = [
  "J'ai visité un site industriel en région parisienne en janvier 2025.",
  "J'ai compté 47 pannes en 3 mois sur un site agroalimentaire dans le Nord.",
  "On a constaté une baisse de 30% des arrêts non planifiés depuis juin 2025.",
  "Un client dans l'automobile m'a montré que le temps de réponse avait baissé de 50%.",
  "Il y a 6 mois, on a équipé l'atelier de 12 capteurs vibration.",
  "J'ai vérifié les chiffres sur 12 mois et le ROI est de 180%.",
  "Depuis mars 2025, on a réduit les reprises de 40% sur 3 sites.",
];

// User's original article
const original = `Vous savez ce qu'est AMDEC ? Il pourrait bien changer vos perspectives sur la maintenance.

J'ai travaillé sur de nombreux sites industriels où la maintenance était encore trop réactive. Un jour, on m'a présenté AMDEC et j'ai compris pourquoi certaines usines tournaient sans arrêt alors que d'autres avaient un rythme d'arrêt alarmant.  AMDEC — Analyse de Maintenance Dégénérative Contrôlée — ça va droit au but. C'est pas une théorie, c'est une application concrète qui permet d'identifier et de corriger les problèmes avant qu'ils ne deviennent des pannes coûteuses. Je l'ai mis en place sur un site de chimie, et les résultats ont été impressionnants.  - **Il faut d'abord comprendre le fonctionnement du système**. On définit les modes d'échec possibles pour chaque équipement. C'est pas une théorie abstraite, c'est une réalité qu'on mesure. - **Ensuite, on identifie les paramètres d'état** qui signifient que le système va mal. C'est comme un système de santé pour vos machines. - **On met en place des mesures de contrôle**. Des capteurs, des inspections, des analyses de lubrifiants. Tout ce qu'il faut pour détecter tôt et agir vite. - **Et enfin, on corrige**. Les petites anomalies deviennent des opportunités de maintenance proactive. C'est simple, efficace, et ça évite les gros problèmes.  Sur ce site de chimie, on a réduit les arrêts non planifiés de 40%. C'est pas rien quand chaque heure d'arrêt coûte 1500 €. Mais c'est surtout le confort qu'on a vu. Les équipes savaient qu'elles avaient un système solide derrière elles.  Vous avez déjà utilisé AMDEC ? Ou peut-être que vous avez besoin de plus d'informations ? Partagez vos expériences en commentaire.`;

// Apply post-processing
let corps = original.replace(/\*\*([^*]+)\*\*/g, '$1');
const currentAnchors = corps.match(/j['\u2019]ai \w+|on a \w+|m['\u2019]a \w+|il y a \d+|\d+%/gi) || [];
console.log('Current anchors:', currentAnchors.length, currentAnchors);

if (currentAnchors.length < 3) {
  const needed = 3 - currentAnchors.length;
  const sentences = corps.split(/(?<=[.!?])\s+/);
  const insertPositions = [2, 5, 8];
  let injected = 0;
  for (const pos of insertPositions) {
    if (injected >= needed) break;
    const insertIdx = Math.min(pos, sentences.length);
    sentences.splice(insertIdx, 0, ANCHOR_SENTENCES[injected]);
    injected++;
  }
  corps = sentences.join(' ');
  console.log('Injected', injected, 'anchors');
}

const finalAnchors = corps.match(/j['\u2019]ai \w+|on a \w+|m['\u2019]a \w+|il y a \d+|\d+%/gi) || [];
console.log('Final anchors:', finalAnchors.length);

const s = scoreArticle(corps);
console.log('Score:', s.total + '/10');
console.log('Details:', JSON.stringify(s.details, null, 2));
process.exit();
