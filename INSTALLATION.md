# Correctif synchronisation SharePoint ↔ tableau de bord — IMMEIT

## Ce qui a été trouvé (cause racine)

Le système reposait entièrement sur une connexion interactive (device code) qui doit être
refaite par un humain **environ chaque heure**, et qui ne fonctionnait que si un PC précis
tournait en continu (rien n'était configuré côté Vercel). Résultat : dès que ce PC était
éteint, ou que personne ne relançait la connexion à temps, le site continuait de tourner
mais servait des données de plus en plus périmées, sans erreur visible. Deux bugs
secondaires aggravaient le problème : la publication du cache GitHub était codée en dur sur
le chemin `C:\Users\Moustapha\...` (donc invisible ailleurs), et le cron GitHub Actions
toutes les 30 min ne faisait en pratique que recopier les données déjà en cache, sans jamais
aller chercher de nouvelles données.

## Le correctif

- **Une seule connexion humaine, définitive.** Le jeton (et surtout son refresh token) est
  désormais stocké de façon persistante dans votre base Postgres partagée, réutilisé
  silencieusement par tous les environnements (poste local, Vercel, GitHub Actions).
- Le tableau de bord lit désormais SharePoint **en direct à chaque ouverture**, pas
  seulement via le cron.
- Le cache GitHub se publie via l'API REST (avec `GITHUB_TOKEN`, déjà dans votre `.env`) —
  fonctionne depuis n'importe quel environnement, plus seulement depuis un PC précis.
- Tout passe par un seul chemin de code (`lib/auto-sync.js` → `performSync()`), utilisé à
  la fois par le cron et par le bouton "Sync" — plus de divergence entre les deux.
- 100% gratuit, aucune nouvelle variable Vercel à configurer.

## Installation (10 minutes)

1. **Copier les fichiers** de ce dossier dans votre projet, en écrasant les anciens (mêmes
   chemins relatifs : `lib/`, `api/`, `scripts/`, `package.json`, `.env.example`, `AGENTS.md`).

2. **Installer la nouvelle dépendance** (`@azure/msal-node`, déjà présente indirectement
   mais maintenant déclarée explicitement) :
   ```
   npm install
   ```

3. **Connexion initiale unique** (depuis votre poste, avec `.env` configuré comme
   aujourd'hui — `DATABASE_URL` doit être présent) :
   ```
   node scripts/connect-sharepoint.js
   ```
   Un lien + code s'affichent : ouvrez le lien, entrez le code, connectez-vous normalement.
   Le script confirme ensuite la lecture du fichier de suivi. **C'est la dernière fois que
   cette étape est nécessaire** (sauf révocation de session côté Microsoft 365 — vous
   seriez alors prévenu par email).

4. **Déployer** (git add/commit/push comme d'habitude → déploiement Vercel automatique).
   Aucune nouvelle variable d'environnement à ajouter dans Vercel : dès l'étape 3 effectuée,
   Vercel relit le même jeton via la base de données partagée.

5. **Vérifier** : ouvrez le tableau de bord sur le site en production, les données doivent
   être à jour. Le bouton "Sync" doit renvoyer un message de succès avec la source `live`
   ou `delegated_silent`/`delegated_interactive` (pas `db_cache`/`file_cache`/`github_cache`,
   qui indiqueraient un repli).

## Optionnel : aller encore plus loin

Si vous obtenez un jour les droits admin Azure AD (ou qu'un collègue IT peut les donner),
`scripts/setup-azure-app.mjs` prépare une App Registration en mode "application" — cela
élimine même la dépendance à un refresh token humain (qui, en théorie, pourrait être révoqué
par une politique de sécurité du tenant). Non nécessaire pour que tout fonctionne
aujourd'hui, seulement pour une robustesse maximale à très long terme.
