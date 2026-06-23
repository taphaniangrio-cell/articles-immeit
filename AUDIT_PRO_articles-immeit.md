# AUDIT PRO — articles-immeit.vercel.app
> Stack : Node.js · Vercel Serverless · PostgreSQL · Anthropic API · RSS  
> Date : 2026-06-23  
> Objectif : Lisibilité, Responsivité, Sécurité, Résultat 1000% PRO  

---

## Légende priorités

| Badge | Niveau | Délai conseillé |
|-------|--------|-----------------|
| 🔴 CRITIQUE | Bloquant / risque sécurité | Immédiat |
| 🟠 HAUTE | Régression UX majeure | Sprint 1 |
| 🟡 MOYENNE | Amélioration significative | Sprint 2 |
| 🟢 BASSE | Finition / polish | Backlog |

---

## 1. SÉCURITÉ

### S-01 🔴 — Absence de rate limiting sur les routes API

**Problème** : Les endpoints `/api/generate`, `/api/articles`, `/api/login` n'ont aucun rate limiting. Un bot peut spammer l'API Anthropic et vider le quota en minutes.

**Fix — `api/generate.js` (et toutes routes POST)** :
```js
// npm install @vercel/kv  (ou utiliser un Map en mémoire simple pour MVP)
import rateLimit from '../lib/rateLimit.js';

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for'] ?? 'unknown';
  const allowed = await rateLimit(ip, 'generate', { max: 5, windowMs: 60_000 });
  if (!allowed) return res.status(429).json({ error: 'Trop de requêtes. Réessaie dans 1 minute.' });
  // ... reste du handler
}
```

```js
// lib/rateLimit.js (version mémoire simple, suffisant pour Vercel Edge)
const store = new Map();
export default function rateLimit(key, route, { max, windowMs }) {
  const k = `${route}:${key}`;
  const now = Date.now();
  const entry = store.get(k) ?? { count: 0, start: now };
  if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
  entry.count++;
  store.set(k, entry);
  return entry.count <= max;
}
```

---

### S-02 🔴 — Mot de passe en clair côté client (probable)

**Problème** : La vérification du mot de passe s'effectue vraisemblablement en comparant la valeur soumise à une variable d'env côté serveur. Si le hash n'est pas bcrypt, c'est une faille.

**Fix** :
```js
// npm install bcryptjs
import bcrypt from 'bcryptjs';

// Générer le hash une fois : bcrypt.hashSync('monMotDePasse', 12)
// Stocker dans .env : PASSWORD_HASH=$2a$12$xxxxx

const ok = bcrypt.compareSync(req.body.password, process.env.PASSWORD_HASH);
if (!ok) return res.status(401).json({ error: 'Mot de passe incorrect' });
```

---

### S-03 🔴 — Headers de sécurité manquants dans `vercel.json`

**Fix — `vercel.json`** :
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.anthropic.com"
        }
      ]
    }
  ]
}
```

---

### S-04 🟠 — Clé API Anthropic exposable via erreurs serveur verbeux

**Problème** : Les `console.error(err)` en handler renvoient parfois le stack complet dans la réponse JSON.

**Fix** :
```js
} catch (err) {
  console.error('[GENERATE] Error:', err.message); // log interne seulement
  return res.status(500).json({ error: 'Erreur interne. Réessaie.' }); // jamais le stack
}
```

---

### S-05 🟠 — Pas de validation/sanitisation des inputs avant envoi à l'IA

**Problème** : Le contenu du champ "sujet libre" est injecté directement dans le prompt Anthropic sans nettoyage → risque de prompt injection.

**Fix** :
```js
function sanitizeInput(str, maxLen = 500) {
  return String(str)
    .trim()
    .replace(/[<>]/g, '')          // XSS basique
    .replace(/\n{3,}/g, '\n\n')   // normalise les sauts excessifs
    .slice(0, maxLen);
}
const topic = sanitizeInput(req.body.topic);
```

---

### S-06 🟡 — Session JWT sans expiration explicite

**Recommandation** : Ajouter `expiresIn: '8h'` au sign JWT et vérifier l'expiration côté client au chargement de la page.

```js
const token = jwt.sign({ role: 'editor' }, process.env.JWT_SECRET, { expiresIn: '8h' });
```

---

### S-07 🟡 — CORS trop permissif sur les routes `/api/*`

**Fix** :
```js
const ALLOWED_ORIGIN = 'https://articles-immeit.vercel.app';

res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
if (req.method === 'OPTIONS') return res.status(204).end();
```

---

## 2. LISIBILITÉ (Typographie & Hiérarchie visuelle)

### L-01 🟠 — Absence de police professionnelle (probable défaut système)

**Fix — dans `<head>` du `index.html`** :
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

```css
:root {
  --font-body: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}

body {
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.6;
  color: #1a1a2e;
  -webkit-font-smoothing: antialiased;
}
```

---

### L-02 🟠 — Système de couleurs non structuré (pas de tokens CSS)

**Fix — variables CSS unifiées à placer en tête de `style.css`** :
```css
:root {
  /* Brand */
  --color-primary:     #0A66C2;   /* LinkedIn blue officiel */
  --color-primary-hover: #004182;
  --color-accent:      #00B0FF;

  /* UI */
  --color-bg:          #F4F6F8;
  --color-surface:     #FFFFFF;
  --color-border:      #E0E4EA;
  --color-text:        #1A1A2E;
  --color-text-muted:  #6B7280;

  /* Status */
  --status-draft:      #94A3B8;
  --status-review:     #F59E0B;
  --status-validated:  #10B981;
  --status-published:  #0A66C2;
  --status-archived:   #EF4444;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;

  /* Shadow */
  --shadow-sm: 0 1px 3px rgba(0,0,0,.08);
  --shadow-md: 0 4px 16px rgba(0,0,0,.10);
  --shadow-lg: 0 8px 32px rgba(0,0,0,.14);
}
```

---

### L-03 🟠 — Badges de statut illisibles / sans couleur sémantique

**Fix — CSS badges** :
```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .3px;
  text-transform: uppercase;
}
.badge-draft      { background: #F1F5F9; color: var(--status-draft); }
.badge-review     { background: #FEF3C7; color: #92400E; }
.badge-validated  { background: #D1FAE5; color: #065F46; }
.badge-published  { background: #DBEAFE; color: #1E40AF; }
.badge-archived   { background: #FEE2E2; color: #991B1B; }
```

---

### L-04 🟡 — Compteur de mots peu visible / non informatif

**Fix** : Remplacer le simple "0 mots" par un indicateur progressif avec cible LinkedIn (1 300–2 000 mots recommandés) :
```js
function updateWordCount(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const target = 1500;
  const pct = Math.min(100, Math.round(words / target * 100));
  const color = words < 800 ? '#F59E0B' : words <= 2000 ? '#10B981' : '#EF4444';

  document.getElementById('wordCount').innerHTML = `
    <span style="color:${color};font-weight:600">${words} mots</span>
    <span style="color:var(--color-text-muted)"> · ${chars} car. · ${pct}% cible LinkedIn</span>
  `;
}
```

---

### L-05 🟡 — Textarea sans hauteur minimale ni resize contrôlé

```css
#articleBody {
  min-height: 320px;
  resize: vertical;
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.7;
  padding: var(--space-md);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color .2s;
}
#articleBody:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(10,102,194,.12);
}
```

---

### L-06 🟢 — Absence de skeleton loader (le texte "Chargement..." est brutal)

**Fix — skeleton CSS** :
```css
.skeleton {
  background: linear-gradient(90deg, #e8ecf0 25%, #f4f6f8 50%, #e8ecf0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: var(--radius-sm);
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton-card { height: 80px; margin-bottom: 12px; }
```

```js
// Remplace "Chargement..." par 3 skeleton cards
function showSkeleton(container, count = 3) {
  container.innerHTML = Array(count).fill(
    '<div class="skeleton skeleton-card"></div>'
  ).join('');
}
```

---

## 3. RESPONSIVITÉ (Mobile & Tablet)

### R-01 🟠 — Layout deux-colonnes non adapté mobile (sidebar + éditeur cassés)

**Fix — CSS Grid responsive** :
```css
.app-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  grid-template-rows: auto 1fr;
  height: 100vh;
  overflow: hidden;
}

@media (max-width: 768px) {
  .app-layout {
    grid-template-columns: 1fr;
    height: auto;
    overflow: visible;
  }

  .sidebar {
    width: 100%;
    max-height: 45vh;
    overflow-y: auto;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }

  .editor-panel {
    padding: var(--space-md);
  }
}
```

---

### R-02 🟠 — Boutons d'action trop petits pour le toucher mobile (< 44px)

**Fix** :
```css
/* Tous les boutons doivent respecter les 44px minimum Apple/Google */
.btn {
  min-height: 44px;
  min-width: 44px;
  padding: 10px var(--space-md);
  font-size: 14px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all .15s ease;
}

.btn-primary  { background: var(--color-primary); color: #fff; border: none; }
.btn-primary:hover  { background: var(--color-primary-hover); }
.btn-secondary { background: transparent; border: 1.5px solid var(--color-border); color: var(--color-text); }
.btn-secondary:hover { border-color: var(--color-primary); color: var(--color-primary); }
.btn-danger   { background: #FEE2E2; color: #991B1B; border: none; }
.btn-danger:hover { background: #EF4444; color: #fff; }
```

---

### R-03 🟡 — Filtre de statuts (tabs) pas scrollable horizontalement sur mobile

```css
.status-filters {
  display: flex;
  gap: var(--space-xs);
  overflow-x: auto;
  scrollbar-width: none;          /* Firefox */
  -ms-overflow-style: none;       /* IE */
  padding: var(--space-sm) var(--space-md);
  -webkit-overflow-scrolling: touch;
}
.status-filters::-webkit-scrollbar { display: none; }

.filter-tab {
  white-space: nowrap;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  transition: all .15s;
}
.filter-tab.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}
```

---

### R-04 🟡 — Modale "Nouvel article" plein écran sur mobile

```css
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  padding: var(--space-md);
}

.modal-content {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  padding: var(--space-xl);
  box-shadow: var(--shadow-lg);
}

@media (max-width: 600px) {
  .modal-overlay { align-items: flex-end; padding: 0; }
  .modal-content {
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    max-height: 92vh;
    padding: var(--space-lg) var(--space-md);
  }
}
```

---

### R-05 🟡 — Pagination "← Précédent / Suivant →" non visible sur petits écrans

```css
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  border-top: 1px solid var(--color-border);
  position: sticky;
  bottom: 0;
  background: var(--color-surface);
}

.pagination-info {
  font-size: 12px;
  color: var(--color-text-muted);
}

@media (max-width: 480px) {
  .pagination-info { display: none; }
}
```

---

### R-06 🟢 — Pas de `meta` Open Graph / manifest pour PWA-like sur mobile

```html
<!-- dans <head> -->
<meta name="theme-color" content="#0A66C2">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="IMMEIT Articles">
```

---

## 4. QUALITÉ DE RÉSULTAT (Output IA & UX éditoriale)

### Q-01 🔴 — Prompt IA insuffisant pour produire un article LinkedIn PRO

**Problème** : Un prompt générique produit un article "plat". Un article LinkedIn performant a une structure précise.

**Fix — Remplacer le system prompt dans `/api/generate.js`** :
```js
const systemPrompt = `Tu es un expert en content marketing B2B industriel, spécialisé dans la maintenance, la fiabilité et la GMAO, pour la société IMMEIT (cabinet de conseil basé à Dakar, opérant en Afrique de l'Ouest).

Tu rédiges des articles LinkedIn en français, percutants, éducatifs et professionnels.

STRUCTURE OBLIGATOIRE à respecter :
1. ACCROCHE (1-2 lignes max) — chiffre, question ou situation qui interpelle
2. PROBLÈME / CONTEXTE (1 paragraphe) — ce que vivent les industriels africains
3. DÉVELOPPEMENT (2-3 points clés) — insights concrets, exemples, méthodes (AMDEC, RCM, GMAO, etc.)
4. CONCLUSION / APPEL À L'ACTION — question ouverte ou invitation à commenter
5. HASHTAGS — 5 à 8, mix générique + niche (#Maintenance #GMAO #Fiabilité #Industrie #Sénégal #AfriqueDeLOuest #IMMEIT)

RÈGLES DE STYLE :
- Utilise des émojis avec parcimonie (max 4-5 dans tout l'article, jamais en série)
- Longueur : 1 200 à 1 800 mots
- Utilise des sauts de ligne simples entre chaque point pour la lisibilité LinkedIn
- Ton : expert mais accessible, jamais condescendant
- Évite les formules creuses ("En conclusion", "Il est primordial de")
- Préfère les tournures actives et les verbes d'action

INTERDITS :
- Ne commence JAMAIS par "Cher réseau" ou "Je suis ravi de partager"
- Pas de listes à puces excessives (max 3 bullets par section)
- Pas de sous-titres avec ### (LinkedIn ne les rend pas)`;
```

---

### Q-02 🟠 — Champ "Consignes pour la régénération" non pré-rempli avec suggestions

**Fix** : Ajouter des suggestions rapides sous le textarea de régénération :
```html
<div class="regen-suggestions">
  <span class="regen-chip" data-hint="Rends l'accroche plus percutante">⚡ Accroche</span>
  <span class="regen-chip" data-hint="Ajoute un exemple concret africain">🌍 Exemple local</span>
  <span class="regen-chip" data-hint="Raccourcis de 20%">✂️ Raccourcir</span>
  <span class="regen-chip" data-hint="Rends le ton plus expert">🎓 Plus expert</span>
  <span class="regen-chip" data-hint="Améliore l'appel à l'action final">📣 CTA fort</span>
</div>
```

```js
document.querySelectorAll('.regen-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.getElementById('regenInstructions').value = chip.dataset.hint;
  });
});
```

```css
.regen-suggestions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.regen-chip {
  padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;
  border: 1.5px solid var(--color-primary); color: var(--color-primary);
  cursor: pointer; background: transparent; transition: all .15s;
}
.regen-chip:hover { background: var(--color-primary); color: #fff; }
```

---

### Q-03 🟠 — "Copier pour LinkedIn" ne formate pas correctement le texte

**Problème** : LinkedIn n'accepte pas le Markdown. Les `**gras**` et `## titres` s'affichent en brut.

**Fix** :
```js
function formatForLinkedIn(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')           // supprime les # titres
    .replace(/\*\*(.+?)\*\*/g, '$1')        // supprime le **gras** (LinkedIn a sa propre mise en forme)
    .replace(/\*(.+?)\*/g, '$1')             // supprime les *italiques*
    .replace(/^[-•]\s+/gm, '• ')            // normalise les puces
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // supprime les liens Markdown
    .replace(/\n{3,}/g, '\n\n')              // max 2 sauts de ligne
    .trim();
}

document.getElementById('btnCopy').addEventListener('click', async () => {
  const raw = document.getElementById('articleBody').value;
  const formatted = formatForLinkedIn(raw);
  await navigator.clipboard.writeText(formatted);
  showToast('✅ Copié pour LinkedIn !');
});
```

---

### Q-04 🟠 — Feedback utilisateur (toasts) absent ou basique

**Fix — Système de toast universel** :
```js
function showToast(message, type = 'success', duration = 3000) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const colors = { success: '#10B981', error: '#EF4444', warning: '#F59E0B', info: '#0A66C2' };

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:${colors[type]}; color:#fff;
    padding:12px 20px; border-radius:10px;
    font-size:14px; font-weight:500;
    box-shadow:0 4px 20px rgba(0,0,0,.2);
    display:flex; align-items:center; gap:8px;
    animation: slideIn .25s ease;
  `;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'fadeOut .3s ease forwards'; setTimeout(() => toast.remove(), 300); }, duration);
}
```

```css
@keyframes slideIn  { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes fadeOut  { from { opacity: 1; } to { opacity: 0; } }
```

---

### Q-05 🟡 — Pas de prévisualisation "rendu LinkedIn" avant copie

**Recommandation** : Ajouter un bouton "👁 Aperçu LinkedIn" qui ouvre un panel avec rendu simulé (police LinkedIn, largeur 552px, gras natif via `contenteditable`).

```js
function openLinkedInPreview(text) {
  const formatted = formatForLinkedIn(text);
  const panel = document.getElementById('linkedinPreview');
  panel.innerHTML = `<div class="li-preview-body">${formatted.replace(/\n/g, '<br>')}</div>`;
  panel.classList.remove('hidden');
}
```

```css
.li-preview-body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px; line-height: 1.6;
  max-width: 552px; color: #000;
  white-space: pre-wrap;
}
```

---

### Q-06 🟡 — Historique des régénérations non tracé

**Recommandation** : Sauvegarder chaque version générée dans la BDD Postgres avec un champ `versions JSONB` pour permettre un "retour en arrière".

```sql
ALTER TABLE articles ADD COLUMN IF NOT EXISTS versions JSONB DEFAULT '[]';
```

```js
// Dans l'API save, avant d'écraser le contenu :
await db.query(
  `UPDATE articles
   SET versions = versions || $1::jsonb, body = $2, updated_at = NOW()
   WHERE id = $3`,
  [JSON.stringify([{ body: currentBody, savedAt: new Date().toISOString() }]), newBody, id]
);
```

---

### Q-07 🟡 — Champ hashtags non validé ni auto-formaté

**Fix** :
```js
function formatHashtags(input) {
  return input
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
    .filter(tag => /^#[a-zA-ZÀ-ÿ0-9_]+$/.test(tag))
    .join(' ');
}

document.getElementById('hashtags').addEventListener('blur', (e) => {
  e.target.value = formatHashtags(e.target.value);
});
```

---

### Q-08 🟢 — Titre interne non renommé automatiquement depuis le contenu IA

**Fix** : Lors de la génération IA, extraire la 1ère ligne non vide comme titre interne par défaut :
```js
function extractTitle(body) {
  const firstLine = body.split('\n').find(l => l.trim().length > 0) ?? '';
  return firstLine.replace(/^#+\s*/, '').slice(0, 80);
}
// Après génération :
document.getElementById('articleTitle').value ||= extractTitle(generatedText);
```

---

## 5. ARCHITECTURE & PERFORMANCE

### A-01 🟠 — Pas de cache sur les résultats RSS / actualités

**Fix** : Mettre en cache les flux RSS 30 minutes dans Vercel KV (ou simple variable module) :
```js
let rssCache = { data: null, ts: 0 };
const RSS_TTL = 30 * 60 * 1000; // 30 min

async function getNews() {
  if (rssCache.data && Date.now() - rssCache.ts < RSS_TTL) return rssCache.data;
  const fresh = await fetchRSS();
  rssCache = { data: fresh, ts: Date.now() };
  return fresh;
}
```

---

### A-02 🟠 — Chargement de tous les articles d'un coup (pas de limite en BDD)

**Fix — requête paginée** :
```js
// api/articles.js
const page  = parseInt(req.query.page  ?? 1, 10);
const limit = parseInt(req.query.limit ?? 10, 10);
const offset = (page - 1) * limit;

const { rows } = await db.query(
  `SELECT id, title, status, created_at, updated_at
   FROM articles
   ORDER BY updated_at DESC
   LIMIT $1 OFFSET $2`,
  [limit, offset]
);
const { rows: [{ count }] } = await db.query('SELECT COUNT(*) FROM articles');
res.json({ articles: rows, total: parseInt(count), page, limit });
```

---

### A-03 🟡 — `updated_at` non mis à jour côté BDD à chaque save

```sql
-- Trigger auto dans Postgres (à exécuter une fois)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_updated_at
BEFORE UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### A-04 🟢 — Pas de `favicon` 32×32 ni `apple-touch-icon`

```html
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

---

## 6. RÉCAPITULATIF BACKLOG PRIORISÉ

| ID | Catégorie | Titre | Priorité |
|----|-----------|-------|----------|
| S-01 | Sécurité | Rate limiting toutes routes POST | 🔴 CRITIQUE |
| S-02 | Sécurité | Bcrypt sur le mot de passe | 🔴 CRITIQUE |
| S-03 | Sécurité | Headers CSP/X-Frame dans vercel.json | 🔴 CRITIQUE |
| S-04 | Sécurité | Supprimer les stacks d'erreur en réponse | 🟠 HAUTE |
| S-05 | Sécurité | Sanitisation inputs avant prompt Anthropic | 🟠 HAUTE |
| S-06 | Sécurité | JWT avec expiration 8h | 🟡 MOYENNE |
| S-07 | Sécurité | CORS strict sur /api/* | 🟡 MOYENNE |
| L-01 | Lisibilité | Police Inter + font-smoothing | 🟠 HAUTE |
| L-02 | Lisibilité | Tokens CSS (couleurs, espacements) | 🟠 HAUTE |
| L-03 | Lisibilité | Badges statuts colorés sémantiques | 🟠 HAUTE |
| L-04 | Lisibilité | Compteur mots enrichi (% cible LinkedIn) | 🟡 MOYENNE |
| L-05 | Lisibilité | Textarea focus ring + min-height | 🟡 MOYENNE |
| L-06 | Lisibilité | Skeleton loaders à la place de "Chargement..." | 🟢 BASSE |
| R-01 | Responsivité | CSS Grid responsive sidebar/éditeur | 🟠 HAUTE |
| R-02 | Responsivité | Boutons 44px min (touch targets) | 🟠 HAUTE |
| R-03 | Responsivité | Filtres statuts scroll horizontal mobile | 🟡 MOYENNE |
| R-04 | Responsivité | Modale bottom-sheet sur mobile | 🟡 MOYENNE |
| R-05 | Responsivité | Pagination sticky visible mobile | 🟡 MOYENNE |
| R-06 | Responsivité | Meta theme-color + apple-mobile | 🟢 BASSE |
| Q-01 | Qualité IA | System prompt restructuré PRO IMMEIT | 🔴 CRITIQUE |
| Q-02 | Qualité IA | Chips de suggestions régénération | 🟠 HAUTE |
| Q-03 | Qualité IA | Formatage LinkedIn au copy (strip Markdown) | 🟠 HAUTE |
| Q-04 | Qualité IA | Toast feedback système universel | 🟠 HAUTE |
| Q-05 | Qualité IA | Prévisualisation rendu LinkedIn | 🟡 MOYENNE |
| Q-06 | Qualité IA | Versioning JSONB des régénérations | 🟡 MOYENNE |
| Q-07 | Qualité IA | Auto-formatage hashtags | 🟡 MOYENNE |
| Q-08 | Qualité IA | Extraction titre auto depuis contenu IA | 🟢 BASSE |
| A-01 | Archi/Perf | Cache RSS 30 min | 🟠 HAUTE |
| A-02 | Archi/Perf | Pagination BDD (limit/offset) | 🟠 HAUTE |
| A-03 | Archi/Perf | Trigger updated_at Postgres | 🟡 MOYENNE |
| A-04 | Archi/Perf | favicon.ico + apple-touch-icon | 🟢 BASSE |

---

## 7. ORDRE D'INJECTION RECOMMANDÉ POUR OPENCODE

```
Sprint 1 — SÉCURITÉ (1-2h)
  → S-01, S-02, S-03, S-04, S-05

Sprint 2 — DESIGN SYSTEM + RESPONSIVE (2-3h)
  → L-01, L-02, L-03, R-01, R-02

Sprint 3 — QUALITÉ IA + UX (1-2h)
  → Q-01, Q-03, Q-04, A-01, A-02

Sprint 4 — FINITIONS (1h)
  → L-04, L-05, R-03, R-04, Q-02, Q-07, A-03
  → L-06, R-05, R-06, Q-05, Q-06, Q-08, A-04
```

---

*Audit généré pour IMMEIT — articles-immeit.vercel.app — 2026-06-23*
