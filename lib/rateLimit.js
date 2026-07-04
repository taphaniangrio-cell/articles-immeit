const store = new Map();

const { CONSTANTS } = require('./constants');

const CLEANUP_INTERVAL = CONSTANTS.RATE_LIMIT_CLEANUP_INTERVAL;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [k, v] of store) {
    if (now - v.start > v.windowMs) store.delete(k);
  }
}

module.exports = function rateLimit(key, route, { max, windowMs }) {
  cleanup();
  const k = `${route}:${key}`;
  const now = Date.now();
  const entry = store.get(k);
  if (!entry || now - entry.start > windowMs) {
    store.set(k, { count: 1, start: now, windowMs });
    return 1 <= max;
  }
  entry.count++;
  return entry.count <= max;
};
