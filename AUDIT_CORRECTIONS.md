# CLAUDE.md — AUDIT & CORRECTIONS articles-immeit.vercel.app
> Généré le 24 juin 2026 · 32 items · Prêt pour injection OpenCode (VSCode)

---

## CONTEXTE PROJET

**Application :** Générateur d'articles LinkedIn pour IMMEIT (maintenance industrielle, Dakar/Paris)
**Stack :** Vanilla HTML/CSS/JS · Node.js Vercel Serverless · PostgreSQL (Neon) · Anthropic API
**Repo :** Projet Vercel déployé via GitHub
**URL prod :** https://articles-immeit.vercel.app

**Fichiers principaux :**
```
/
├── index.html          ← Frontend (login + app)
├── style.css           ← Tous les styles
├── app.js              ← Logique frontend
├── vercel.json         ← Config Vercel + headers CSP
└── api/
    ├── auth.js         ← Login (bcrypt)
    ├── articles.js     ← CRUD articles (PostgreSQL)
    ├── generate.js     ← Appel Anthropic API
    ├── news.js         ← Fetch RSS actualités
    └── copy.js         ← Formatter copie LinkedIn
```

**Variables d'environnement requises (Vercel) :**
```
POSTGRES_URL          → Neon PostgreSQL connection string
APP_PASSWORD_HASH     → Hash bcrypt du mot de passe
ANTHROPIC_API_KEY     → Clé API Anthropic
SESSION_SECRET        → Secret JWT (min 32 chars)
```

---

## LÉGENDE PRIORITÉS

| Niveau | Signification | Action |
|--------|--------------|--------|
| **P0** | Sécurité critique / bug bloquant | Corriger immédiatement |
| **P1** | UX majeur / fonctionnalité cassée | Cette semaine |
| **P2** | Design / UX moyen | Ce sprint |
| **P3** | Performance / refactoring | Prochain sprint |

---

## P0 — SÉCURITÉ CRITIQUE

---

### #01 · CSRF : Absence de protection sur les mutations POST
**Fichier :** `api/articles.js`, `api/generate.js`, `api/auth.js`
**Risque :** Un site tiers peut effectuer des requêtes POST authentifiées au nom de l'utilisateur.

**Correction :**
```javascript
// api/_csrf.js — Utilitaire CSRF token (ajouter ce fichier)
import crypto from 'crypto';

export function generateCsrfToken(sessionId) {
  const secret = process.env.SESSION_SECRET;
  return crypto
    .createHmac('sha256', secret)
    .update(sessionId)
    .digest('hex')
    .substring(0, 32);
}

export function validateCsrfToken(token, sessionId) {
  const expected = generateCsrfToken(sessionId);
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expected)
  );
}

// Dans chaque endpoint POST/PUT/DELETE :
// const csrfHeader = req.headers['x-csrf-token'];
// const sessionId  = /* extraire du JWT */;
// if (!csrfHeader || !validateCsrfToken(csrfHeader, sessionId)) {
//   return res.status(403).json({ error: 'CSRF token invalide' });
// }
```

```javascript
// app.js — Inclure le token CSRF dans chaque requête
async function apiCall(endpoint, method, body) {
  const token = sessionStorage.getItem('csrf_token');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getJwtToken()}`,
  };
  if (token) headers['X-CSRF-Token'] = token;
  
  const res = await fetch(endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

---

### #02 · Rate Limiting : En-mémoire non persistant (reset Vercel)
**Fichier :** `api/generate.js` (et tout endpoint avec rate limit)
**Risque :** Chaque nouvelle instance Vercel (cold start) remet le compteur à zéro → bypass trivial du rate limit.

**Correction — Rate limit via PostgreSQL :**
```javascript
// api/_rateLimit.js
import { sql } from '@vercel/postgres';

export async function checkRateLimit(identifier, maxRequests = 10, windowMs = 60_000) {
  const windowStart = new Date(Date.now() - windowMs);
  
  // Compter les requêtes dans la fenêtre
  const { rows } = await sql`
    SELECT COUNT(*) as count
    FROM rate_limit_log
    WHERE identifier = ${identifier}
      AND created_at > ${windowStart.toISOString()}
  `;
  
  const count = parseInt(rows[0].count);
  
  if (count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: new Date(Date.now() + windowMs) };
  }
  
  // Logger cette requête
  await sql`
    INSERT INTO rate_limit_log (identifier, created_at)
    VALUES (${identifier}, NOW())
  `;
  
  // Nettoyage périodique (1% de chance par requête)
  if (Math.random() < 0.01) {
    await sql`DELETE FROM rate_limit_log WHERE created_at < NOW() - INTERVAL '1 hour'`;
  }
  
  return { allowed: true, remaining: maxRequests - count - 1 };
}
```

```sql
-- Migration SQL (à exécuter sur Neon une fois)
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id          BIGSERIAL PRIMARY KEY,
  identifier  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rl_identifier_created 
  ON rate_limit_log(identifier, created_at);
```

---

### #03 · JWT : Stockage localStorage exposé au XSS
**Fichier :** `app.js`
**Risque :** localStorage accessible via XSS → vol de session.

**Correction — Utiliser sessionStorage + token rotation :**
```javascript
// app.js — Remplacer localStorage par sessionStorage pour les tokens
// sessionStorage est automatiquement vidé à la fermeture de l'onglet

const TOKEN_KEY = 'immeit_session';

function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

// NOTE : Idéalement, migrer vers un cookie httpOnly (nécessite refactoring backend)
// api/auth.js → res.setHeader('Set-Cookie', `token=${jwt}; HttpOnly; Secure; SameSite=Strict; Path=/`)
```

---

### #04 · Content-Security-Policy : Directive `connect-src` manquante
**Fichier :** `vercel.json`
**Risque :** CSP incomplète → possibilité d'exfiltration de données vers des domaines externes.

**Correction complète vercel.json :**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.anthropic.com https://*.neon.tech; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        }
      ]
    },
    {
      "source": "/(.*\\.(js|css|webp|png|svg|ico|woff2))",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

### #05 · SQL : Vérifier l'absence d'injection via JSONB
**Fichier :** `api/articles.js`
**Action :** S'assurer que TOUTES les requêtes SQL utilisent des paramètres positionnels.

**Pattern sécurisé (à vérifier dans chaque requête) :**
```javascript
// ✅ CORRECT : paramètres positionnels
const { rows } = await sql`
  UPDATE articles
  SET body = ${body}, status = ${status}, updated_at = NOW()
  WHERE id = ${id}
`;

// ❌ INTERDIT : concaténation de chaîne
// const query = `UPDATE articles SET body = '${body}'...`; // NE PAS FAIRE
```

---

## P1 — UX MAJEUR / FONCTIONNALITÉ

---

### #06 · Layout : Implémenter le split-pane 3 colonnes
**Fichier :** `style.css`, `index.html`
**Problème :** Navigation en vue unique (liste → éditeur) → perte de contexte constante.

**Correction — CSS layout :**
```css
/* style.css — Ajouter après le reset */
.app {
  display: grid;
  grid-template-columns: var(--sidebar-width) var(--list-width) 1fr;
  height: 100vh;
  overflow: hidden;
}

.article-list {
  border-right: 1px solid var(--clr-border);
  overflow-y: auto;
  background: var(--clr-bg-card);
  display: flex;
  flex-direction: column;
}

.editor {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--clr-bg-page);
}

/* Responsive : tablet */
@media (max-width: 1100px) {
  .app { grid-template-columns: var(--sidebar-collapsed) var(--list-width) 1fr; }
  .sidebar__logo-text, .sidebar__logout span:last-child { display: none; }
}

/* Responsive : mobile */
@media (max-width: 767px) {
  .app { grid-template-columns: 1fr; grid-template-rows: 56px 1fr; }
  .article-list { display: block; }
  .editor { display: none; }
  .editor.mobile-visible { display: flex; position: fixed; inset: 0; z-index: 50; }
}
```

**Correction — JS (fermer l'éditeur sur mobile) :**
```javascript
// app.js — Gestion mobile
function openArticleOnMobile(articleId) {
  loadArticle(articleId);
  if (window.innerWidth < 768) {
    document.querySelector('.editor').classList.add('mobile-visible');
    document.querySelector('.article-list').style.display = 'none';
  }
}

function closeEditorOnMobile() {
  document.querySelector('.editor').classList.remove('mobile-visible');
  document.querySelector('.article-list').style.display = '';
}
// Attacher closeEditorOnMobile au bouton "← Retour" dans l'éditeur
```

---

### #07 · Compteur de mots : Implémentation en temps réel
**Fichier :** `app.js`
**Problème :** Le compteur affiche "0 mots" sans se mettre à jour dynamiquement.

**Correction complète :**
```javascript
// app.js — Compteur de mots temps réel
const LINKEDIN_OPTIMAL_MIN = 800;
const LINKEDIN_OPTIMAL_MAX = 1500;

function countWords(text) {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function updateWordCount() {
  const textarea = document.getElementById('article-body');
  const counter  = document.getElementById('word-count');
  if (!textarea || !counter) return;

  const words = countWords(textarea.value);
  const chars = textarea.value.length;
  counter.textContent = `${words.toLocaleString('fr')} mots · ${chars.toLocaleString('fr')} car.`;

  // Feedback couleur
  counter.className = 'editor__word-count';
  if (words > 0 && words < LINKEDIN_OPTIMAL_MIN) {
    counter.classList.add('warn');
    counter.title = `LinkedIn optimal : ${LINKEDIN_OPTIMAL_MIN}–${LINKEDIN_OPTIMAL_MAX} mots`;
  } else if (words >= LINKEDIN_OPTIMAL_MIN && words <= LINKEDIN_OPTIMAL_MAX) {
    counter.classList.add('ok');
    counter.title = 'Longueur optimale pour LinkedIn ✓';
  }
}

// Attacher après l'injection du HTML :
document.getElementById('article-body').addEventListener('input', updateWordCount);
```

---

### #08 · Debounce sauvegarde automatique
**Fichier :** `app.js`
**Problème :** Chaque frappe peut déclencher un appel API → spam serveur + conditions de course.

**Correction :**
```javascript
// app.js — Debounce + auto-save
let saveTimeout = null;
let lastSavedContent = '';
let isSaving = false;

function debounce(fn, delay) {
  return (...args) => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => fn(...args), delay);
  };
}

const autoSave = debounce(async () => {
  const currentArticleId = getCurrentArticleId();
  if (!currentArticleId || isSaving) return;

  const body  = document.getElementById('article-body').value;
  const title = document.getElementById('article-title').value;
  const tags  = document.getElementById('article-hashtags').value;

  const content = JSON.stringify({ body, title, tags });
  if (content === lastSavedContent) return; // Rien de changé

  isSaving = true;
  const savedEl = document.getElementById('article-saved');
  if (savedEl) savedEl.textContent = 'Sauvegarde…';

  try {
    await apiCall(`/api/articles/${currentArticleId}`, 'PUT', { body, title, hashtags: tags });
    lastSavedContent = content;
    if (savedEl) savedEl.textContent = `Sauvegardé à ${new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}`;
  } catch (err) {
    if (savedEl) savedEl.textContent = 'Échec de sauvegarde';
    console.error('Auto-save error:', err);
  } finally {
    isSaving = false;
  }
}, 1800); // Délai 1.8 secondes après dernière frappe

// Attacher aux champs éditables :
document.getElementById('article-body').addEventListener('input', autoSave);
document.getElementById('article-title').addEventListener('input', autoSave);
document.getElementById('article-hashtags').addEventListener('input', autoSave);
```

---

### #09 · Skeleton Loader : Remplacer "Chargement..." par des skeletons
**Fichier :** `index.html`, `style.css`, `app.js`
**Problème :** Texte brut "Chargement..." → expérience dégradée, pas de feedback visuel.

**Correction — HTML (remplacer le div de chargement) :**
```html
<!-- Dans index.html, remplacer le div de chargement initial -->
<div id="articles-container" aria-live="polite">
  <!-- Skeleton généré par JS au chargement -->
</div>
```

```javascript
// app.js — Générer les skeletons
function renderSkeletons(count = 5) {
  const container = document.getElementById('articles-container');
  container.innerHTML = Array(count).fill(0).map(() => `
    <div class="article-item" aria-hidden="true">
      <div class="skeleton skeleton--title"></div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <div class="skeleton skeleton--badge"></div>
        <div class="skeleton" style="height:20px;width:60px;border-radius:999px;"></div>
      </div>
      <div class="skeleton skeleton--text" style="margin-top:10px;"></div>
      <div class="skeleton skeleton--text" style="width:55%;"></div>
    </div>
  `).join('');
}

// Appeler renderSkeletons() avant fetchArticles()
async function loadArticles(status = 'all') {
  renderSkeletons(6);
  try {
    const data = await apiCall(`/api/articles?status=${status}&page=${currentPage}`);
    renderArticleList(data.articles);
    renderPagination(data.total, data.page, data.pageSize);
  } catch (err) {
    showListError('Impossible de charger les articles');
  }
}
```

---

### #10 · Toast Notifications : Feedback actions utilisateur
**Fichier :** `app.js`, `style.css`
**Problème :** Aucun feedback visuel après enregistrement, validation, copie, suppression.

**Correction — Ajouter showToast() dans app.js :**
```javascript
// app.js — Copier le helper showToast() du DESIGN_SYSTEM.md (section 6.7)
// Puis utiliser dans chaque action :

// Après saveArticle() :
showToast('Article enregistré', 'success');

// Après validateArticle() :
showToast('Article passé en révision', 'info');

// Après copyForLinkedIn() :
showToast('Copié dans le presse-papier ✓', 'success');

// Après deleteArticle() :
showToast('Article supprimé', 'success');

// En cas d'erreur :
showToast('Erreur : ' + err.message, 'error', 5000);

// Après régénération IA :
showToast('Article régénéré par l\'IA ✦', 'info');
```

---

### #11 · Copie LinkedIn : Bug format Markdown non nettoyé
**Fichier :** `api/copy.js` ou `app.js`
**Problème :** Si le texte contient **bold**, _italique_, ## titres → illisible sur LinkedIn.

**Correction — Formateur robuste :**
```javascript
// api/copy.js (ou inline dans app.js)
function formatForLinkedIn(text) {
  if (!text) return '';

  return text
    // Titres → texte en majuscules suivi d'une ligne vide
    .replace(/^#{1,6}\s+(.+)$/gm, (_, t) => t.toUpperCase() + '\n')
    // Bold **text** ou __text__
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    // Italique *text* ou _text_
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Code `inline`
    .replace(/`(.+?)`/g, '"$1"')
    // Blocs code
    .replace(/```[\s\S]*?```/g, '')
    // Listes – → •
    .replace(/^[-*+]\s+/gm, '• ')
    // Listes numérotées → garder le numéro
    .replace(/^\d+\.\s+/gm, (m) => m)
    // Liens [text](url) → text
    .replace(/\[(.+?)\]\(.*?\)/g, '$1')
    // Lignes multiples → 2 max
    .replace(/\n{3,}/g, '\n\n')
    // Trim
    .trim();
}
```

---

### #12 · Pagination côté serveur : Éviter le chargement de tous les articles
**Fichier :** `api/articles.js`
**Problème :** Requête sans LIMIT → charge toute la table si > 50 articles.

**Correction — api/articles.js :**
```javascript
// api/articles.js — GET /api/articles
export default async function handler(req, res) {
  const { status = 'all', page = 1, pageSize = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  const statusFilter = status === 'all' ? sql`TRUE` : sql`status = ${status}`;

  const [{ rows: articles }, { rows: countRows }] = await Promise.all([
    sql`
      SELECT id, title, status, created_at, updated_at,
             LEFT(body, 200) AS body_preview  -- Preview seulement
      FROM articles
      WHERE ${statusFilter}
      ORDER BY updated_at DESC
      LIMIT ${parseInt(pageSize)}
      OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(*)::int AS total
      FROM articles
      WHERE ${statusFilter}
    `
  ]);

  res.json({
    articles,
    total:    countRows[0].total,
    page:     parseInt(page),
    pageSize: parseInt(pageSize),
    totalPages: Math.ceil(countRows[0].total / parseInt(pageSize))
  });
}
```

---

### #13 · Modal IA : État de chargement animé pendant la génération
**Fichier :** `app.js`, `index.html`
**Problème :** Après clic "Générer", la modal reste statique sans feedback pendant l'appel API.

**Correction :**
```javascript
// app.js — Gestion état modal pendant génération
async function generateArticle(subject, newsItem = null) {
  const modalBody = document.querySelector('.modal__body');
  const btnGenerate = document.getElementById('btn-generate-confirm');

  // Afficher le spinner
  const originalHTML = modalBody.innerHTML;
  modalBody.innerHTML = `
    <div class="ai-spinner">
      <div class="ai-spinner__ring"></div>
      <p class="ai-spinner__text">Génération en cours avec Claude…</p>
      <p class="ai-spinner__text" style="font-size:11px;margin-top:-8px;color:var(--clr-text-muted);">
        Cela peut prendre 10–20 secondes
      </p>
    </div>
  `;
  btnGenerate.disabled = true;

  try {
    const result = await apiCall('/api/generate', 'POST', {
      subject,
      newsUrl:   newsItem?.url || null,
      newsTitle: newsItem?.title || null,
    });

    closeModal();
    await loadArticle(result.articleId);
    showToast('Article généré par l\'IA ✦', 'info');
  } catch (err) {
    // Restaurer le formulaire avec erreur
    modalBody.innerHTML = originalHTML;
    btnGenerate.disabled = false;
    showToast('Erreur de génération : ' + err.message, 'error', 6000);
    rebindModalEvents();
  }
}
```

---

### #14 · Confirmations destructives : Supprimer sans confirmation = risque de perte
**Fichier :** `app.js`
**Problème :** Le bouton "Supprimer" supprime immédiatement sans confirmation.

**Correction — Dialog de confirmation inline (pas d'alert()) :**
```javascript
// app.js — Confirmation inline
function showInlineConfirm(targetEl, message, onConfirm) {
  // Remplacer temporairement le bouton par un mini-dialog
  const originalHTML = targetEl.outerHTML;
  const confirmEl = document.createElement('div');
  confirmEl.style.cssText = 'display:flex;align-items:center;gap:8px;';
  confirmEl.innerHTML = `
    <span style="font-size:13px;color:var(--clr-text-secondary);">${message}</span>
    <button class="btn btn--danger" style="padding:4px 12px;font-size:12px;">Confirmer</button>
    <button class="btn btn--ghost" style="padding:4px 12px;font-size:12px;">Annuler</button>
  `;
  targetEl.replaceWith(confirmEl);

  confirmEl.querySelector('.btn--danger').addEventListener('click', async () => {
    await onConfirm();
    // Après suppression, restitution n'est plus nécessaire (article disparu)
  });

  confirmEl.querySelector('.btn--ghost').addEventListener('click', () => {
    confirmEl.outerHTML = originalHTML;
    // Re-attacher les events
  });

  // Auto-annuler après 5 secondes
  setTimeout(() => {
    if (confirmEl.isConnected) confirmEl.outerHTML = originalHTML;
  }, 5000);
}

// Usage :
document.getElementById('btn-delete').addEventListener('click', function () {
  showInlineConfirm(this, 'Supprimer définitivement ?', async () => {
    await deleteCurrentArticle();
  });
});
```

---

## P2 — DESIGN & UX MOYEN

---

### #15 · Typographie : Appliquer le système Space Grotesk + Inter
**Fichier :** `index.html`, `style.css`
**Action :** Intégrer les fonts Google + remplacer tous les `font-family` actuels.

**Correction index.html (dans `<head>`) :**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

**style.css — Variables typo (copier depuis DESIGN_SYSTEM.md section 3) :**
```css
:root {
  --font-display: 'Space Grotesk', system-ui, sans-serif;
  --font-body:    'Inter', system-ui, sans-serif;
  /* ... (voir DESIGN_SYSTEM.md section 3) */
}
body { font-family: var(--font-body); }
h1, h2, .modal__title, .login-card__title { font-family: var(--font-display); }
```

---

### #16 · Design Tokens : Appliquer la palette complète
**Fichier :** `style.css`
**Action :** Copier intégralement la section 2 de DESIGN_SYSTEM.md dans `:root {}`
**Priorité :** Faire cette action EN PREMIER avant tout autre changement CSS.

```css
/* style.css — TOP DU FICHIER (avant tout autre rule) */
/* Coller ici le bloc :root {} complet de DESIGN_SYSTEM.md sections 2, 3, 4 */
```

---

### #17 · Badges statut : Appliquer les couleurs sémantiques
**Fichier :** `style.css`, `app.js`
**Problème :** Tous les statuts ont la même apparence → impossible de scanner la liste rapidement.

**Correction :**
```css
/* style.css — Copier la section 6.2 de DESIGN_SYSTEM.md */
/* Badges : .badge--draft, --review, --validated, --published, --archived */
```

```javascript
// app.js — Utiliser la fonction getBadgeClass() de DESIGN_SYSTEM.md
function renderArticleItem(article) {
  const badgeClass = getBadgeClass(article.status);
  const preview = (article.body_preview || '').substring(0, 120);
  const date = new Date(article.updated_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short'
  });
  return `
    <div class="article-item" data-id="${article.id}" role="button" tabindex="0"
         aria-label="${article.title} — ${article.status}">
      <div class="article-item__title">${escapeHtml(article.title || 'Sans titre')}</div>
      <div class="article-item__meta">
        <span class="${badgeClass}">${article.status}</span>
        <span>${date}</span>
      </div>
      ${preview ? `<div class="article-item__preview">${escapeHtml(preview)}</div>` : ''}
    </div>
  `;
}
```

---

### #18 · Page Login : Refonte visuelle
**Fichier :** `index.html`, `style.css`
**Problème :** Page de connexion basique sans identité visuelle.

**Correction — Remplacer le HTML de la section login :**
```html
<!-- index.html — Remplacer le bloc login existant -->
<div id="login-page" class="login-page">
  <div class="login-card">
    <img src="/logo-immeit.webp" alt="IMMEIT" class="login-card__logo">
    <div>
      <h1 class="login-card__title">Articles LinkedIn</h1>
      <p class="login-card__subtitle">Plateforme éditoriale IMMEIT</p>
    </div>
    <div class="login-form">
      <label for="password-input" class="meta-field__label" style="display:block;margin-bottom:8px;">
        Mot de passe
      </label>
      <input type="password" id="password-input" class="login-input"
             placeholder="••••••••" autocomplete="current-password"
             aria-label="Mot de passe" aria-describedby="login-error">
      <button id="login-btn" class="login-btn">Se connecter</button>
      <div id="login-error" role="alert" aria-live="assertive"
           style="display:none;color:var(--clr-danger);font-size:var(--text-sm);text-align:center;">
      </div>
    </div>
  </div>
</div>
```

```css
/* style.css — Copier la section 6.10 de DESIGN_SYSTEM.md */
```

---

### #19 · Action Bar : Hiérarchie visuelle et réorganisation
**Fichier :** `index.html`, `style.css`
**Problème :** Boutons alignés sans hiérarchie → difficile de savoir quelle action est principale.

**Ordre cible :**
```
[PRIMARY] Enregistrer | [SECONDARY] Valider | [LINKEDIN] Copier LinkedIn | [AI] Régénérer ✦
                                                               [GHOST] Archiver | [DANGER] Supprimer
```

**Correction HTML :**
```html
<!-- Remplacer la zone de boutons par la structure action-bar du DESIGN_SYSTEM.md section 6.6 -->
<div class="action-bar">
  <div class="action-bar__primary">
    <button id="btn-save"     class="btn btn--primary">  <span class="btn__icon">↓</span> Enregistrer</button>
    <button id="btn-validate" class="btn btn--secondary"><span class="btn__icon">✓</span> Valider</button>
    <button id="btn-copy"     class="btn btn--linkedin"> <span class="btn__icon">⌘</span> Copier LinkedIn</button>
    <button id="btn-regen"    class="btn btn--ai">       <span class="btn__icon">✦</span> Régénérer</button>
  </div>
  <div class="action-bar__secondary">
    <button id="btn-archive"  class="btn btn--ghost">Archiver</button>
    <button id="btn-restore"  class="btn btn--ghost" style="display:none">Restaurer</button>
    <button id="btn-delete"   class="btn btn--danger">Supprimer</button>
  </div>
</div>
```

---

### #20 · Onglets statut : Afficher les compteurs
**Fichier :** `app.js`
**Problème :** Onglets sans compteurs → utilisateur ne sait pas combien d'articles sont dans chaque statut.

**Correction :**
```javascript
// api/articles.js — Ajouter un endpoint pour les compteurs
// GET /api/articles/counts
export async function getCounts(req, res) {
  const { rows } = await sql`
    SELECT status, COUNT(*)::int AS count
    FROM articles
    GROUP BY status
  `;

  const counts = { all: 0, Brouillon: 0, 'En révision': 0, Validé: 0, Publié: 0, Archivé: 0 };
  rows.forEach(r => {
    counts[r.status] = r.count;
    counts.all += r.count;
  });

  res.json(counts);
}

// app.js — Charger et afficher les compteurs
async function updateTabCounts() {
  try {
    const counts = await apiCall('/api/articles/counts', 'GET');
    document.querySelectorAll('.tab').forEach(tab => {
      const status = tab.dataset.status;
      const countEl = tab.querySelector('.tab__count');
      if (countEl && counts[status] !== undefined) {
        countEl.textContent = counts[status] > 99 ? '99+' : counts[status];
      }
    });
  } catch (err) {
    console.warn('Impossible de charger les compteurs:', err);
  }
}
```

---

### #21 · Accessibilité : Keyboard navigation & ARIA
**Fichier :** `index.html`, `app.js`
**Problème :** Pas de `role`, `aria-label`, ni gestion du focus.

**Corrections clés :**
```html
<!-- 1. Ajouter lang="fr" -->
<html lang="fr">

<!-- 2. Skip link (premier élément dans body) -->
<a href="#editor-active" class="skip-link">Aller au contenu principal</a>

<!-- 3. Article items navigables au clavier -->
<div class="article-item" role="button" tabindex="0"
     aria-label="Article: [titre] — Statut: [status]"
     onkeydown="if(event.key==='Enter'||event.key===' ')this.click()">
```

```css
/* style.css */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 16px;
  background: var(--clr-linkedin);
  color: white;
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  text-decoration: none;
  border-radius: 0 0 var(--radius-md) 0;
  transition: top var(--transition-fast);
  z-index: 9999;
}
.skip-link:focus { top: 0; }
```

```javascript
// app.js — Gestion focus après actions
async function saveArticle() {
  // ...save logic...
  showToast('Enregistré', 'success');
  document.getElementById('article-body').focus(); // Restaurer le focus
}

async function deleteArticle() {
  // ...delete logic...
  document.querySelector('.article-item')?.focus(); // Focus premier article restant
}
```

---

### #22 · Format dates : Affichage lisible en français
**Fichier :** `app.js`
**Problème :** Dates affichées en ISO (2025-01-15T10:30:00Z) → illisible.

**Correction :**
```javascript
// app.js — Formateurs de date
function formatDateRelative(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  const now  = new Date();
  const diffMs  = now - date;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH   = Math.floor(diffMs / 3_600_000);
  const diffD   = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1)  return 'À l\'instant';
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24)   return `Il y a ${diffH}h`;
  if (diffD === 1)  return 'Hier';
  if (diffD < 7)    return `Il y a ${diffD} jours`;

  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateFull(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('fr-FR', {
    weekday: 'short', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Usage :
document.getElementById('article-saved').textContent = formatDateRelative(article.updated_at);
document.getElementById('article-created').textContent = formatDateFull(article.created_at);
```

---

### #23 · Page vide (empty states) : Messages contextuels
**Fichier :** `index.html`, `app.js`
**Problème :** Liste vide ou éditeur vide affiche rien → confusion.

**Correction JS :**
```javascript
// app.js
function renderEmptyState(status) {
  const messages = {
    all:          { icon: '✦', title: 'Aucun article', sub: 'Créez votre premier article avec le bouton ci-dessus.' },
    Brouillon:    { icon: '✎', title: 'Aucun brouillon', sub: 'Les articles en cours d\'écriture apparaîtront ici.' },
    'En révision':{ icon: '◎', title: 'Aucun article en révision', sub: 'Validez un brouillon pour l\'envoyer en révision.' },
    Validé:       { icon: '✓', title: 'Aucun article validé', sub: 'Les articles approuvés apparaîtront ici.' },
    Publié:       { icon: '↗', title: 'Aucun article publié', sub: 'Publiez votre premier article sur LinkedIn.' },
    Archivé:      { icon: '□', title: 'Aucune archive', sub: 'Les articles archivés apparaîtront ici.' },
  };
  const m = messages[status] || messages.all;
  return `
    <div class="list-empty">
      <div class="list-empty__icon">${m.icon}</div>
      <div style="font-weight:500;color:var(--clr-text-secondary);margin-bottom:4px;">${m.title}</div>
      <div>${m.sub}</div>
    </div>
  `;
}
```

---

## P3 — PERFORMANCE & ARCHITECTURE

---

### #24 · Streaming Anthropic API : Retour progressif au lieu de bloquer
**Fichier :** `api/generate.js`
**Problème :** `anthropic.messages.create()` bloque 15–25 secondes → timeout risqué + UX dégradée.

**Correction — Vercel Streaming Response :**
```javascript
// api/generate.js — Streaming avec Server-Sent Events
import Anthropic from '@anthropic-ai/sdk';

export const config = { maxDuration: 60 }; // Vercel Pro : 60s max

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // ... validation, rate limit, auth ...

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: buildPrompt(req.body) }],
      system: IMMEIT_SYSTEM_PROMPT,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ chunk: event.delta.text })}\n\n`);
      }
    }

    const finalMessage = await stream.finalMessage();
    const fullText = finalMessage.content[0].text;

    // Sauvegarder en DB
    const articleId = await saveGeneratedArticle(fullText, req.body);
    res.write(`data: ${JSON.stringify({ done: true, articleId })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
}
```

```javascript
// app.js — Consommer le stream
async function generateWithStream(subject) {
  const textarea = document.getElementById('article-body');
  textarea.value = '';
  updateWordCount();

  const evtSource = new EventSource('/api/generate?subject=' + encodeURIComponent(subject));

  evtSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.chunk) {
      textarea.value += data.chunk;
      updateWordCount();
      textarea.scrollTop = textarea.scrollHeight;
    }
    if (data.done) {
      evtSource.close();
      showToast('Article généré ✦', 'info');
    }
    if (data.error) {
      evtSource.close();
      showToast('Erreur génération : ' + data.error, 'error');
    }
  };
}
```

---

### #25 · Connexion PostgreSQL : Pool adapté à Vercel Serverless
**Fichier :** `api/_db.js` (à créer)
**Problème :** Nouvelle connexion à chaque cold start → lenteur + limite connexions Neon atteinte rapidement.

**Correction :**
```javascript
// api/_db.js — Singleton de connexion
import { Pool } from 'pg';

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,             // Vercel Serverless : 1 connexion par instance
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
    pool.on('error', (err) => {
      console.error('Pool error:', err);
      pool = null; // Forcer la recréation au prochain appel
    });
  }
  return pool;
}

export async function query(text, params) {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}
```

---

### #26 · Logo IMMEIT : Fallback si WebP non supporté + taille optimisée
**Fichier :** `index.html`
**Problème :** `<img src="/logo-immeit.webp">` — pas de fallback navigateurs anciens, pas de taille explicite.

**Correction :**
```html
<!-- index.html — Remplacer tous les <img src="/logo-immeit.webp"> par : -->
<picture>
  <source srcset="/logo-immeit.webp" type="image/webp">
  <img src="/logo-immeit.png" alt="IMMEIT" 
       width="120" height="36"
       loading="eager"
       decoding="async">
</picture>
```

**Note :** Générer `/logo-immeit.png` depuis le WebP source si non disponible :
```bash
# En local, avec ffmpeg ou sharp
npx sharp-cli --input logo-immeit.webp --output logo-immeit.png
```

---

### #27 · Gestion d'erreurs API : Messages d'erreur utilisateur clairs
**Fichier :** `app.js`
**Problème :** En cas d'erreur API, `console.error` uniquement → utilisateur ne sait pas ce qui se passe.

**Correction — Wrapper d'erreur global :**
```javascript
// app.js — Wrapper fetch avec gestion d'erreurs
async function apiCall(endpoint, method = 'GET', body = null) {
  try {
    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
        'X-CSRF-Token': getCsrfToken(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      clearToken();
      showLoginPage();
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') || '60';
      throw new Error(`Trop de requêtes. Réessayez dans ${retryAfter} secondes.`);
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur serveur (${res.status})`);
    }

    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw err; // Laissez passer les annulations
    console.error(`API ${method} ${endpoint}:`, err);
    throw err;
  }
}
```

---

### #28 · Système de prompt IA : Amélioration pour IMMEIT B2B
**Fichier :** `api/generate.js`
**Problème :** Prompt IA trop générique → articles sans ton IMMEIT ni expertise maintenance industrielle.

**Correction — System prompt enrichi :**
```javascript
// api/generate.js
const IMMEIT_SYSTEM_PROMPT = `
Tu es l'expert en contenu LinkedIn d'IMMEIT, cabinet de conseil en maintenance industrielle 
basé à Dakar (Sénégal) et Paris, opérant en Afrique de l'Ouest (Sénégal, Mali, Côte d'Ivoire).

EXPERTISE IMMEIT :
- Fiabilité & disponibilité : AMDEC (FMEA), RCM (Reliability-Centered Maintenance)
- GMAO : déploiement et formation sur Coswin, SAP PM, Maximo, CARL, DIMOMAINT  
- Digitalisation de la maintenance : IoT, capteurs, maintenance prédictive
- Secteurs : industrie extractive, agroalimentaire, énergie, BTP en Afrique de l'Ouest

TON & STYLE LINKEDIN :
- Professionnel mais accessible, pas académique
- Accroche forte sur la 1re ligne (arrêt de scroll)
- Paragraphes courts (2-3 phrases max)
- Exemples concrets du contexte industriel africain si pertinent
- Finir par une question ouverte pour engager la communauté
- Hashtags : 3-5 max, pertinents (#MaintenanceIndustrielle #GMAO #Fiabilité #AfriqueIndustrielle)

FORMAT OBLIGATOIRE :
- NE PAS utiliser de Markdown (pas de **, *, #, -, etc.)
- Longueur : 800-1200 mots optimal pour l'algorithme LinkedIn
- Découpage en blocs lisibles avec lignes vides entre les sections
- Émojis : 1-2 max et pertinents (pas décoratifs)

CONTEXTE : Article pour le profil LinkedIn ou la page entreprise d'IMMEIT.
L'objectif est de démontrer l'expertise, attirer des prospects B2B et renforcer la crédibilité.
`;
```

---

### #29 · Variables d'environnement : Validation au démarrage
**Fichier :** `api/_env.js` (à créer)
**Problème :** Si une variable manque, l'erreur survient à la requête et pas au démarrage.

**Correction :**
```javascript
// api/_env.js — Valider les variables critiques
const REQUIRED_ENV = [
  'POSTGRES_URL',
  'APP_PASSWORD_HASH', 
  'ANTHROPIC_API_KEY',
  'SESSION_SECRET',
];

export function validateEnv() {
  const missing = REQUIRED_ENV.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes : ${missing.join(', ')}\n` +
      'Configurez-les dans Vercel > Settings > Environment Variables'
    );
  }
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET doit faire au moins 32 caractères.');
  }
}

// Importer en tête de chaque endpoint critique :
// import { validateEnv } from './_env.js';
// validateEnv();
```

---

### #30 · Robots.txt + Sécurité indexation
**Fichier :** `public/robots.txt` (à créer)
**Problème :** L'app interne peut être indexée par les moteurs de recherche.

```
# robots.txt — Bloquer l'indexation de cette app privée
User-agent: *
Disallow: /
```

---

### #31 · Vercel Config : Rewrites pour SPA + protection routes API
**Fichier :** `vercel.json`
**Problème :** Pas de rewrite → F5 sur une route directe renvoie 404.

**Ajouter dans vercel.json :**
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/((?!api|_next|.*\\.).*)", "destination": "/index.html" }
  ]
}
```

---

### #32 · escapeHtml : Prévenir l'injection HTML dans le DOM
**Fichier :** `app.js`
**Problème :** Titres et contenus des articles insérés via `innerHTML` sans sanitisation → XSS potentiel.

**Correction — Helper obligatoire :**
```javascript
// app.js — À mettre en tête de fichier, utiliser partout
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Usage systématique dans les templates :
// ✅ `<div>${escapeHtml(article.title)}</div>`
// ❌ `<div>${article.title}</div>`
```

---

## ORDRE D'EXÉCUTION RECOMMANDÉ

```
SEMAINE 1 — Sécurité (P0)
  1. #04 vercel.json → Headers CSP complets + cache assets
  2. #32 escapeHtml → Sanitisation innerHTML (quick win)
  3. #03 JWT → Migrer vers sessionStorage
  4. #02 Rate limiting → Migrer vers PostgreSQL
  5. #01 CSRF → Token X-CSRF-Token

SEMAINE 2 — UX fondamentale (P1)
  6. #16 Design Tokens → Variables CSS complètes (PREREQUIS pour tout le reste)
  7. #15 Typographie → Fonts Space Grotesk + Inter
  8. #06 Layout 3 colonnes → Split-pane principal
  9. #09 Skeletons → Remplacer "Chargement..."
  10. #10 Toasts → Feedback actions

SEMAINE 3 — Features UX (P1 suite)
  11. #07 Word count → Compteur temps réel
  12. #08 Debounce → Auto-save 1.8s
  13. #17 Badges → Couleurs sémantiques
  14. #18 Login → Refonte page connexion
  15. #19 Action bar → Hiérarchie boutons
  16. #13 Modal IA → Spinner chargement
  17. #14 Confirmations → Suppression sécurisée
  18. #11 Format LinkedIn → Nettoyage Markdown

SEMAINE 4 — Polish & Performance (P2-P3)
  19. #20 Compteurs onglets
  20. #21 Accessibilité ARIA
  21. #22 Format dates françaises
  22. #23 Empty states
  23. #12 Pagination serveur
  24. #28 Prompt IA IMMEIT
  25. #24 Streaming API
  26. #25 Pool PostgreSQL
  27. #27 Gestion erreurs
  28. #29 Validation env
  29. #30 robots.txt
  30. #31 Vercel rewrites
  31. #26 Logo picture
```

---

## CHECKLIST FINALE AVANT DÉPLOIEMENT

```bash
# Test sécurité
curl -X POST https://articles-immeit.vercel.app/api/articles \
  -H "Content-Type: application/json" -d '{"title":"test"}' \
  # → Doit retourner 401 (non authentifié)

# Test headers
curl -I https://articles-immeit.vercel.app/ | grep -E "CSP|X-Frame|HSTS|X-Content"
# → Tous les headers sécurité doivent être présents

# Test rate limit
for i in {1..15}; do curl -X POST .../api/generate -H "Auth: Bearer TOKEN" -d '{}'; done
# → Doit retourner 429 après le seuil

# Test accessibilité
# Ouvrir DevTools → Lighthouse → Accessibility → Score cible > 85

# Test mobile
# Chrome DevTools → Toggle device toolbar → iPhone 14 → Tester navigation
```

---

*Audit réalisé sur articles-immeit.vercel.app · Stack : Vanilla JS + Vercel Serverless + PostgreSQL Neon + Anthropic API*
*DESIGN_SYSTEM.md associé : voir fichier DESIGN_SYSTEM.md dans ce même dossier*
