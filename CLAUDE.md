# IMMEIT Hub — Plateforme interne multi-apps

Application hub interne regroupant les outils IMMEIT (maintenance industrielle, fiabilité, GMAO).

## Stack

**Vercel Serverless (Node.js) + Supabase (Postgres gratuit) + vanilla JS frontend + Shell Hub v3.**

## Structure

```
articles-immeit/
├── api/
│   ├── auth.js        # POST /api/auth — authentification + CSRF token
│   ├── news.js        # GET  /api/news — RSS sectoriel filtré
│   ├── generate.js    # POST /api/generate — appel IA (CSRF protégé)
│   └── articles.js    # CRUD /api/articles — articles PostgreSQL (CSRF protégé)
├── public/
│   ├── index.html     # Shell hub + 2 apps (articles, dashboard)
│   ├── app.js         # Router + store + apps (2620 lignes)
│   └── style.css      # Design system + shell layout
├── lib/
│   ├── auth.js        # requireAuth + requireCsrf (double-submit cookie)
│   ├── cors.js        # CORS whitelist
│   ├── db.js          # Connexion PostgreSQL (pg driver)
│   ├── ai-client.js   # Appels IA (Groq, OpenRouter, Cerebras, Mistral)
│   ├── rss-fetcher.js # Agrégation RSS maintenance
│   ├── sanitize.js    # Nettoyage HTML
│   ├── rateLimit.js   # Rate-limiting in-memory
│   ├── logger.js      # Logger structuré JSON
│   ├── email-alert.js # Alertes SMTP
│   ├── events.js      # Event bus local
│   ├── constants.js   # Constantes centralisées
│   ├── image-fetcher.js # Recherche images Pexels
│   ├── sharepoint.js  # Client Microsoft Graph (dashboard)
│   ├── auto-sync.js   # Synchronisation SharePoint (local dev)
│   └── company-context.md # Contexte IMMEIT pour prompts IA
├── db/
│   └── schema.sql
├── scripts/
│   └── generate-hash.js # Générateur de hash bcrypt
├── server.mjs
├── vercel.json
├── package.json
├── .editorconfig
├── .env.example
├── .gitignore
├── CLAUDE.md
└── README.md
```

## Architecture Hub

```
shell (flex row, 100vh)
├── shell-sidebar (220px, navy)
│   ├── brand
│   ├── nav links (data-app target)
│   ├── spacer
│   └── version
├── shell-main (flex: 1, column)
│   ├── shell-topbar (52px)
│   │   ├── title
│   │   ├── AI selector
│   │   └── logout
│   └── shell-viewport (flex: 1)
│       ├── .app-row (flex row)       ← Articles
│       │   ├── .article-list-section
│       │   └── .editor
│       └── .dashboard                ← Dashboard
```

**Routage** : `showMain()` / `showDashboard()` togglent `.hidden` sur les sections + `.app-row`. Pas de hash router externe.

**Cache** : `APP_VERSION` localStorage + `?v=150` sur CSS/JS. Reload automatique si version change.

## API

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/auth` | POST | Authentification (password → cookie session + CSRF token) |
| `/api/news` | GET | Actualités RSS filtrées par mots-clés |
| `/api/generate` | POST | Génération article via IA (CSRF protégé) |
| `/api/articles` | GET | Liste des articles (filtre `?statut=`) |
| `/api/articles?id=N` | GET | Un article |
| `/api/articles` | POST | Créer un article (CSRF protégé) |
| `/api/articles?id=N` | PUT | Modifier un article (CSRF protégé) |
| `/api/articles?id=N` | DELETE | Supprimer un article (CSRF protégé) |

## Déploiement

1. Créer un projet sur Vercel lié à ce repo
2. Ajouter les variables d'environnement dans Vercel :
   - `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `CEREBRAS_API_KEY`, `MISTRAL_API_KEY`
   - `DATABASE_URL` — URL de connexion Vercel Postgres
   - `SESSION_SECRET` — générer avec : `crypto.randomBytes(32).toString("hex")`
   - `PASSWORD_HASH` — hash bcrypt du mot de passe (générer avec : `node scripts/generate-hash.js <mdp>`)
   - `PEXELS_API_KEY` — clé API Pexels (optionnel, pour les images)
   - `ALLOWED_ORIGIN` — origines CORS (optionnel)
3. `git push` → déploiement automatique
4. Initialiser la base : `psql $DATABASE_URL -f db/schema.sql`

## Développement local

```bash
cp .env.example .env
npm install
node server.mjs        # → http://localhost:3000
```

Pour ajouter une app : créer la section dans `#shell-viewport`, ajouter un nav link `data-app`, implémenter `showMaNouvelleApp()` dans `app.js`.

## Règles de génération d'articles

- Sujet limité à maintenance industrielle, fiabilité, GMAO
- 150–250 mots, 2 accroches (A/B), ton expert accessible
- Prompt injecte `lib/company-context.md` systématiquement
- Réponse JSON : `{titre_interne, accroche_a, accroche_b, corps, hashtags}`
- Refus si hors périmètre (réponse commence par "REFUS:")
