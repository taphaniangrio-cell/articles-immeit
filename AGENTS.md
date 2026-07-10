## Objective
- Faire fonctionner le sync SharePoint de manière 100% autonome (local et Vercel) sans aucune intervention humaine

## Important Details
- Aucune variable SharePoint configurée sur Vercel → sync live impossible en production (seulement cache DB)
- Device code MSAL avec `@azure/identity` : non-bloquant, tourne en arrière-plan, token caché après 1ère auth
- Vercel CRON limité à 1x/jour (hobby) → `0 5 * * *`
- GitHub Actions backup : `*/30 * * * *` (nécessite `CRON_SECRET` dans les secrets GitHub)
- `GITHUB_TOKEN` sert de fallback pour `CRON_SECRET` dans l'auth du CRON (local)

## Work State
### Completed
- `lib/auto-sync.js` : chaîne de fallback complète (client credentials → device code/@azure/identity → DB cache → file cache)
  - Device code non-bloquant : `_deviceCodePromise` en arrière-plan, `raceTimeout()` pour ne pas bloquer le démarrage
  - `startBackgroundAuth()` appelé dans `sync()` pour amorcer l'auth sans attendre
  - Prompt device code affiché dans les logs PM2, utilisateur peut auth à son rythme
- `api/sync.js` : accepte `x-vercel-cron: 1` ou `Authorization: Bearer <CRON_SECRET|GITHUB_TOKEN>` sans session
- `vercel.json` : CRON `0 5 * * *` (1x/jour) + maxDuration 60s
- `.github/workflows/sync.yml` : cron `*/30 * * * *` + `workflow_dispatch`
- `CRON_SECRET` généré (`3nf60LMXlBuVv2pGskIiHcOwr5aKFbP1`) et défini dans Vercel env (Production)
- PM2 `immeit-server` actif + tâche planifiée `IMMEIT-Server` au logon Windows
- Déploiement Vercel production fait

### Done
- ✅ Device code authentifié (token jusqu'à 11:49, refresh automatique)
- ✅ CRON_SECRET ajouté dans les secrets GitHub Actions

## Relevant Files
- `lib/auto-sync.js` : coeur du sync, fallback chain + token management + Graph API fetch
- `api/sync.js` : endpoint POST, accepte CRON/auth bearer ou session
- `server.mjs` : startup message, lance `sync()` + `startContinuousSync()`
- `vercel.json` : CRON `0 5 * * *` + maxDuration 60s
- `.github/workflows/sync.yml` : GitHub Actions toutes les 30 min
- `.env.example` : documente `CRON_SECRET`
- `package.json` : dépend `@azure/identity`
- `AGENTS.md` : ce fichier
