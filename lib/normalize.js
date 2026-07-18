// lib/normalize.js
//
// Fonctions de normalisation partagées pour le traitement des données.
// Évite la duplication entre sharepoint.js, diff-detector.js, multi-dates.js, etc.

/**
 * Normalise un header en clé snake_case lowercase.
 * Gère les espaces, espaces insécables, slashs, et caractères spéciaux.
 * @param {string} h - Le header à normaliser
 * @returns {string} La clé normalisée
 */
function normalizeKey(h) {
  return String(h).trim().toLowerCase().replace(/[\s\u00a0\/]+/g, '_').replace(/[^a-z0-9_]/g, '');
}

/**
 * Normalise une valeur pour comparaison (sans accents, lowercase, espaces unifiés).
 * Utilisé pour le matching de valeurs (pas pour les clés).
 * @param {string} v - La valeur à normaliser
 * @returns {string} La valeur normalisée
 */
function normMatch(v) {
  return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s\u00a0]+/g, ' ').trim().toLowerCase();
}

/**
 * Nettoie les caractères Unicode de remplacement \uFFFD d'une valeur.
 * @param {string} v - La valeur à nettoyer
 * @returns {string} La valeur nettoyée
 */
function stripUnicode(v) {
  return String(v).normalize('NFC').replace(/\uFFFD/g, '');
}

/**
 * Nettoie les caractères Unicode de remplacement \uFFFD de tous les items.
 * Modifie les items en place.
 * @param {Array<Object>} items - Les items à nettoyer
 * @returns {Array<Object>} Les items nettoyés (même référence)
 */
function stripItemsUnicode(items) {
  for (const item of items) {
    for (const k of Object.keys(item)) {
      if (typeof item[k] === 'string') item[k] = stripUnicode(item[k]);
    }
  }
  return items;
}

module.exports = { normalizeKey, normMatch, stripUnicode, stripItemsUnicode };
