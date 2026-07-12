## Objective
- Faire fonctionner le sync SharePoint de manière 100% autonome (local et Vercel) sans
  aucune intervention humaine récurrente. **Statut : atteint** (voir "Architecture" ci-dessous).

## Architecture (depuis la refonte auth SharePoint)
Un seul point d'entrée d'authentification Graph : `lib/graph-auth.js`. Deux modes, essayés
dans cet ordre à chaque demande de jeton :

1. **App-only (client_credentials)** — actif seulement si `SHAREPOINT_CLIENT_ID` +
   `SHAREPOINT_CLIENT_SECRET` sont configurés (App Registration Azure AD + permission
   Application `Sites.Selected`/`Sites.Read.All`, consentement admin). Zéro état à
   conserver. **Non configuré actuellement** (nécessite des droits admin Azure AD sur le
   tenant `d852d5cd-724c-4128-8812-ffa5db3f8507`) — voir `scripts/setup-azure-app.mjs` si
   ces droits deviennent disponibles.
2. **Délégué silencieux (MSAL, cache persistant en base)** — mode actif par défaut. Une
   unique connexion interactive (device code), faite une fois via
   `node scripts/connect-sharepoint.js`, suffit : le refresh token est stocké dans la table
   Postgres partagée `dashboard_cache` (clé `msal_token_cache`, voir
   `lib/msal-cache-plugin.js`) et réutilisé silencieusement par TOUS les environnements
   (poste local, Vercel, GitHub Actions) — plus besoin qu'un PC particulier tourne en
   continu. Suit le pattern officiel "distributed cache plugin" de `@azure/msal-node`.
3. Device code interactif = dernier recours, jamais déclenché automatiquement depuis une
   requête API (seulement si `allowInteractive:true`, réservé au script de setup et à la
   boucle locale `server.mjs`). Si le refresh token venait à être révoqué, une alerte email
   ("⚠️ Reconnexion SharePoint nécessaire") est envoyée (throttle 1x/24h) — voir
   `lib/email-alert.js` → `sendReconnectAlert()`.

`lib/sharepoint.js` porte la logique de fetch Graph (site → fichier → onglet → lignes) et
utilise `graph-auth.getGraphToken()` quel que soit le mode actif — un seul chemin de code,
plus de divergence entre implémentations.

`lib/auto-sync.js` est l'orchestrateur unique (`performSync()`) : tente le fetch live, puis
sauvegarde dans TOUS les caches partagés (Postgres, fichier local, GitHub via API REST —
plus de `git push` local codé en dur), déclenche diff-detector + email-alert, émet
`dashboard-updated`. Utilisé à la fois par `api/sync.js` (cron Vercel + GitHub Actions +
bouton "Sync") et par la boucle locale — même code, même comportement partout.

## Important Details
- `api/dashboard.js` tente une lecture live à CHAQUE ouverture du tableau de bord (pas
  seulement via cron) : dès que la connexion initiale est faite, les données affichées sont
  véritablement en direct, indépendamment de la fréquence du cron.
- Vercel CRON limité à 1x/jour (hobby) → `0 5 * * *` : sert de filet de secours, pas de
  mécanisme principal de fraîcheur (voir point précédent).
- GitHub Actions backup : `*/30 * * * *`, déclenche désormais un vrai fetch live (avant
  cette refonte, il ne faisait que recopier le cache existant sur lui-même — inutile en
  pratique tant que le mode app-only ou délégué persistant n'était pas fonctionnel).
- `GITHUB_TOKEN` sert de fallback pour `CRON_SECRET` dans l'auth du CRON, ET est utilisé par
  `lib/github-cache.js` pour publier le cache via l'API REST GitHub (Contents API).

## Work State
### Completed (refonte auth — voir historique de conversation pour le détail)
- `lib/graph-auth.js` : fournisseur de jeton unique (app-only + délégué silencieux + device
  code en dernier recours explicite)
- `lib/msal-cache-plugin.js` : cache MSAL distribué, persistant en Postgres (repli fichier)
- `lib/sharepoint.js` : fetch Graph unifié, utilise graph-auth, valeurs par défaut pour
  site/fichier/onglet (fonctionne sans configuration), capture `lastModifiedBy`
- `lib/auto-sync.js` : simplifié en orchestrateur unique `performSync()`
- `lib/github-cache.js` : publication via API REST GitHub (plus de git shell-out local codé
  en dur sur un poste spécifique)
- `api/sync.js` : délègue entièrement à `autoSync.performSync()`
- `api/dashboard.js` : tente toujours une lecture live (plus de garde `isConfigured()`
  bloquante)
- `scripts/connect-sharepoint.js` : script de connexion initiale unique

### À faire (uniquement si vous voulez aller plus loin)
- [ ] Exécuter `node scripts/connect-sharepoint.js` une première fois (prérequis : avoir
      déployé ce code ET configuré `DATABASE_URL` en local)
- [ ] Optionnel : demander les droits admin Azure AD pour activer le mode app-only
      (`scripts/setup-azure-app.mjs`) et éliminer même la dépendance au refresh token

## Relevant Files
- `lib/graph-auth.js` : authentification Graph (app-only + délégué)
- `lib/msal-cache-plugin.js` : persistance du cache MSAL (Postgres)
- `lib/sharepoint.js` : fetch des données SharePoint (site/fichier/onglet/lignes)
- `lib/auto-sync.js` : orchestrateur de synchronisation (`performSync`)
- `lib/github-cache.js` : cache de secours GitHub (lecture + publication via API REST)
- `api/sync.js` : endpoint POST (cron Vercel/GitHub Actions + bouton "Sync")
- `api/dashboard.js` : `GET /api/dashboard`, lecture live à chaque ouverture
- `scripts/connect-sharepoint.js` : connexion initiale unique (device code)
- `scripts/setup-azure-app.mjs` : assistant app-only (nécessite droits admin Azure AD)
- `vercel.json` : CRON `0 5 * * *` + maxDuration 60s + cache headers HTML
- `.github/workflows/sync.yml` : GitHub Actions toutes les 30 min
- `.env.example` : documente les variables (toutes optionnelles pour le mode délégué)
- `AGENTS.md` : ce fichier
