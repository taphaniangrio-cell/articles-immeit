// lib/github-throttle.js
//
// Module partagé pour gérer le throttle des publications GitHub.
// Évite la duplication de code entre auto-sync.js et sync-engine.js.

let _lastGithubPublish = 0;
const GITHUB_PUBLISH_INTERVAL_MS = 60 * 60 * 1000; // 1 heure max

/**
 * Vérifie si une publication GitHub est autorisée (throttle respecté).
 * @returns {boolean} true si la publication est autorisée
 */
function canPublish() {
  const now = Date.now();
  return (now - _lastGithubPublish) >= GITHUB_PUBLISH_INTERVAL_MS;
}

/**
 * Enregistre qu'une publication a été effectuée.
 */
function markPublished() {
  _lastGithubPublish = Date.now();
}

/**
 * Retourne le temps écoulé depuis la dernière publication (en secondes).
 * @returns {number} secondes depuis la dernière publication
 */
function getTimeSinceLastPublish() {
  return Math.round((Date.now() - _lastGithubPublish) / 1000);
}

module.exports = {
  canPublish,
  markPublished,
  getTimeSinceLastPublish,
  GITHUB_PUBLISH_INTERVAL_MS,
};
