const fs = require('fs');
const path = require('path');

let companyContext = null;

function getCompanyContext() {
  if (companyContext) return companyContext;
  const filePath = path.join(__dirname, 'company-context.md');
  companyContext = fs.readFileSync(filePath, 'utf-8');
  return companyContext;
}

const SYSTEM_PROMPT = `Tu rédiges des posts LinkedIn pour IMMEIT (contexte entreprise fourni ci-dessous).

Contraintes strictes :
- Sujet exclusivement lié à la maintenance industrielle / fiabilité / GMAO.
  Si l'actualité fournie sort de ce périmètre, refuse en commençant ta réponse par "REFUS:".
- Longueur : 150 à 250 mots (format post LinkedIn, pas article long-form).
- Structure : accroche forte dans les 2 premières lignes (avant le "voir plus"),
  un angle d'expertise IMMEIT, un conseil actionnable, une question ou
  ouverture en fin de post (pas de CTA commercial appuyé).
- Densité : chaque phrase apporte une information, pas de remplissage.
- Pas d'emoji excessif (2-3 maximum si pertinent).
- Génère 2 variantes d'accroche pour choix.

Contexte entreprise :
{{COMPANY_CONTEXT}}

Réponds UNIQUEMENT par un objet JSON valide, sans texte avant/après :
{"titre_interne":"...","accroche_a":"...","accroche_b":"...","corps":"...","hashtags":["...","..."]}`;

const MODELS = [
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-haiku-20240307',
];

async function callAnthropic(model, system, prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const status = response.status;
    if (status === 429) throw new Error('QUOTA');
    if (status === 401) throw new Error('CLÉ_INVALIDE');
    throw new Error(`ERREUR_API (HTTP ${status}): ${body.slice(0, 200)}`);
  }

  return await response.json();
}

async function generateArticle(news, feedback = '') {
  const ctx = getCompanyContext();
  const system = SYSTEM_PROMPT.replace('{{COMPANY_CONTEXT}}', ctx);

  let prompt = `Actualité source :\nTitre : ${news.titre}\nSource : ${news.source}\nURL : ${news.url}\nRésumé : ${news.resume}\n\nGénère un post LinkedIn à partir de cette actualité.`;
  if (feedback) prompt += `\n\nConsignes supplémentaires : ${feedback}`;

  let lastError = null;
  for (const model of MODELS) {
    try {
      const data = await callAnthropic(model, system, prompt);
      const text = data.content?.[0]?.text || '';

      if (text.startsWith('REFUS:')) throw new Error(text.slice(6).trim());

      try {
        const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
        return json;
      } catch {
        throw new Error('Réponse IA invalide. Réessaie.');
      }
    } catch (err) {
      lastError = err;
      if (err.message === 'QUOTA' || err.message === 'CLÉ_INVALIDE') throw err;
      if (!err.message.includes('ERREUR_API (HTTP 400)')) throw err;
    }
  }

  throw lastError || new Error('Aucun modèle disponible');
}

module.exports = { generateArticle };
