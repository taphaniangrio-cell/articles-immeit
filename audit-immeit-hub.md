# Audit IMMEIT Hub — v107

**Date :** 03/07/2026
**Périmètre :** 35 fichiers audités (9 API, 12 lib, 4 public, configs, DB)

---

## 🔴 Sécurité

| # | Gravité | Fichier | Problème |
|---|---------|---------|----------|
| S1 | **Critique** | `api/auth.js:38` | Fallback comparaison en clair du mot de passe si `PASSWORD_HASH` non défini. Aucun utilitaire fourni pour générer le hash bcrypt. |
| S2 | **Haute** | `lib/cors.js:9-14` | `Access-Control-Allow-Credentials: true` avec `Access-Control-Allow-Origin: *` si `ALLOWED_ORIGIN` contient `*`. Violation de la spec CORS (bloqué par navigateurs). |
| S3 | **Haute** | `api/generate.js:63-73` | Messages d'erreur exposant des détails internes (`Crédits insuffisants pour…`, `Modèle "…" indisponible`) — information disclosure. |
| S4 | **Haute** | `lib/rateLimit.js` | Rate limiting in-memory (Map) — inefficace sur Vercel serverless où chaque instance a sa propre mémoire. Une IP peut saturer l'API en contournant via différentes instances. |
| S5 | **Haute** | `lib/auth.js:25` | Session revocation in-memory (Set) — perdue sur redéploiement Vercel. Un token volé reste valide jusqu'à expiration (7 jours). |
| S6 | **Moyenne** | `api/articles.js:44-49` | PUT `/api/articles` sans validation des champs — tout champ non listé dans `ALLOWED_COLUMNS` est ignoré, mais les champs autorisés ne sont pas typés/vérifiés. |
| S7 | **Moyenne** | `.env.example:9` | `ADMIN_PASSWORD=changeme` et `SESSION_SECRET=generer-avec-crypto-randomBytes-32-hex` — valeurs par défaut triviales qui peuvent se retrouver en prod. |
| S8 | **Moyenne** | `public/app.js:337` | Authentification via localStorage `immeit_session: '1'` — pas de jeton JWT, simple flag. Une XSS donne un accès permanent. |
| S9 | **Basse** | `lib/sanitize.js` | Sanitizer ne couvre pas tous les vecteurs XSS (ex: attributs HTML, `javascript:` URLs). |
| S10 | **Basse** | Général | Pas de CSRF token. `SameSite=Lax` atténue partiellement mais ne protège pas les requêtes GET (news, articles). |

---

## 🟠 Performance & Scalabilité

| # | Gravité | Fichier | Problème |
|---|---------|---------|----------|
| P1 | **Haute** | `lib/rss-fetcher.js:168-224` | Traduction RSS via Groq API à chaque rafraîchissement — coût API récurrent, latence ajoutée (4s + appel Groq). |
| P2 | **Moyenne** | `public/app.js:598-614` | `loadArticles()` charge 50 articles à chaque filtre — pas de vrai cache client. |
| P3 | **Moyenne** | `public/app.js:1908` | App monolithique de 1908 lignes — pas de code splitting, tout est chargé même sur la page de login. |
| P4 | **Moyenne** | `lib/rss-fetcher.js:27` | `FETCH_TIMEOUT = 4000` ms très agressif — certains flux RSS peuvent timeout légitimement. |
| P5 | **Basse** | Général | Pas de compression Brotli/Gzip sur les assets statiques dans `vercel.json`. |
| P6 | **Basse** | `vercel.json` | `maxDuration: 60` secondes peut être insuffisant pour les appels IA longs (timeout 90s dans `ai-client.js`). |

---

## 🟡 Qualité du code

| # | Fichier | Problème |
|---|---------|----------|
| Q1 | `public/app.js` | 1908 lignes dans un seul fichier, pas de modules. Mélange de responsabilités (routage, éditeur, dashboard, KPI). |
| Q2 | `server.mjs` vs `api/*.js` | Mix ESM (`import` dans server.mjs) et CommonJS (`require` dans les API). Incohérence maintenable. |
| Q3 | `server.mjs:167-169` vs `vercel.json` | Headers de sécurité dupliqués (dans les deux endroits). Peut causer des conflits. |
| Q4 | `lib/auto-sync.js:31` | `CLIENT_ID` hardcodé (`1950a258-227b-4e31-a9cf-717495945fc2`) — Azure AD public client ID, devrait être documenté. |
| Q5 | `api/auth.js:36` | `bcrypt.compareSync()` bloque l'event loop. Utiliser `compare()` asynchrone. |
| Q6 | Multiples fichiers | Timeouts dispersés (4000ms, 5000ms, 8000ms, 15000ms, 30000ms, 90000ms, 120000ms) — pas de constantes centralisées. |
| Q7 | Général | Aucune documentation JSDoc/TSDoc, aucune typage, pas de tests automatisés. |
| Q8 | `api/dashboard.js:80-87` | Parsing manuel `JSON.parse()` sans try/catch sur des données DB potentiellement corrompues. |
| Q9 | `lib/db.js:28` | `query()` définit un timeout de connexion à 5s mais pas de timeout pour la requête elle-même. |
| Q10 | `lib/sharepoint.js:108` | Cache token in-memory — perdu sur Vercel serverless, chaque requête refait l'auth OAuth. |

---

## 🔵 Architecture

| # | Problème |
|---|----------|
| A1 | **State in-memory sur serverless** — Sessions, rate limiting, revoked tokens, cache tokens SharePoint sont tous en mémoire. Vercel peut avoir N instances, l'état n'est pas partagé. |
| A2 | **Deux flows SharePoint** — `auto-sync.js` (InteractiveBrowserCredential, local dev) vs `sharepoint.js` (client_credentials, serverless). Logique métier dupliquée. |
| A3 | **Caching complexe** — Dashboard data passe par 3 couches (auto-sync local, DB cache, fichier JSON) sans stratégie d'invalidation claire. |
| A4 | **Pas de migration DB versionnée** — Le `schema.sql` est un mélange de CREATE TABLE et ALTER TABLE, exécuté en un bloc. Pas de migrations historiques. |
| A5 | **Aucune isolation des apps** — Le "hub" n'a pas de routage URL, pas d'isolation entre les apps (articles, dashboard). Tout partage le même scope global. |

---

## 🟣 Dépendances

| # | Problème |
|---|----------|
| D1 | `@azure/identity-broker` — Dépendance native nécessitant des binaires de platforme. Échoue silencieusement (`lib/auto-sync.js:15-16`), mais le package est téléchargé à chaque `npm install`. |
| D2 | `@azure/keyvault-secrets` en devDependencies — Non utilisé dans le code actuel. |
| D3 | Pas de `node-fetch` — Le code utilise `fetch` natif (Node 18+), ce qui est correct pour Vercel mais pas garanti en local si Node < 18. |
| D4 | `@neondatabase/serverless` nécessite `ws` et `bufferutil` comme peers — non listés dans `package.json`. |
| D5 | `package.json` utilise des `^` (caret ranges) pour toutes les dépendances — pas de lockfile fiable pour les déploiements reproductibles (bien que `package-lock.json` existe). |

---

## 🟢 Configuration & Déploiement

| # | Problème |
|---|----------|
| C1 | `SESSION_SECRET` manquant dans la doc déploiement (`README.md`) et `CLAUDE.md` — requis par `lib/auth.js` mais pas documenté comme variable d'environnement nécessaire. |
| C2 | `.env` fichier présent sur le disque (visible dans `git status` ?) — risques si commit accidentel. Vérifier que `.gitignore` est correct. |
| C3 | `audit-immeit-hub.md` non gitignoré, `favicon.svg` non versionné (untracked). |
| C4 | Version mismatch potentiel — CSS/JS utilisent `?v=107`, le HTML utilise `v107` dans le footer. Cohérent aujourd'hui mais dérive possible. |
| C5 | `.vercel/` dans `.gitignore` — bon, mais `cookies.txt` est aussi ignoré et présent dans le repo. |
| C6 | `vercel.json` ne définit pas de rewrites pour SPA — les routes non-API qui ne sont pas des fichiers statiques retournent 404. |

---

## 📋 Recommandations prioritaires

### Immédiat (critique)
1. **Ajouter un hash bcrypt du mot de passe** dans la config et supprimer la comparaison en clair (S1)
2. **Supprimer `Access-Control-Allow-Credentials` quand l'origine est `*`** dans `cors.js` (S2)
3. **Implémenter un rate limiting basé sur DB** (Postgres) ou au minimum passer à une store externe (Redis/Upstash) (S4/P4)
4. **Nettoyer les messages d'erreur API** pour ne pas divulguer de détails internes (S3)

### Court terme (2 semaines)
5. **Briser `app.js` en modules** (router, editor, dashboard, auth, api-client) (Q1, A5)
6. **Centraliser les timeouts et constantes** dans un fichier `lib/constants.js` (Q6)
7. **Ajouter `SESSION_SECRET` à la documentation de déploiement** (C1)
8. **Remplacer `bcrypt.compareSync()` par la version async** (Q5)
9. **Uniformiser les deux flows SharePoint** en un seul (auto-sync comme wrapper de sharepoint.js) (A2)
10. **Documenter `PASSWORD_HASH` et fournir un script** pour le générer (S1, C1)

### Moyen terme (1-2 mois)
11. **Implémenter un vrai système de migrations DB versionnées** (A4)
12. **Ajouter un cache Redis/Upstash** pour sessions, rate limiting, cache RSS (A1, S4, S5)
13. **Réduire la dépendance à `@azure/identity-broker`** — package natif problématique en CI/serverless (D1)
14. **Ajouter des tests** (au moins API avec Vitest ou Node test runner) (Q7)
15. **Mettre en place un pipeline de lint/typecheck** dans la CI

---

## 📊 Statistiques

| Métrique | Valeur |
|----------|--------|
| Fichiers JS | 22 (9 API + 12 lib + 1 server.mjs) |
| Lignes totales JS | ~4 800 |
| Lignes CSS | 2 189 |
| Lignes HTML | 303 |
| Dépendances prod | 5 |
| Dépendances dev | 1 (inutilisée) |
| Routes API | 9 |
| Issues de sécurité | 10 |
| Issues de performance | 6 |
| Issues de qualité | 10 |
| Issues d'architecture | 5 |
| Issues de dépendances | 5 |
| Issues de configuration | 6 |
| **Total** | **42** |
