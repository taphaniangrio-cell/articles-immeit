const store = new Map();

const CLEANUP_INTERVAL = 300_000;
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
  const entry = store.get(k) ?? { count: 0, start: now, windowMs };
  if (now - entry.start > windowMs) {
    entry.count = 0;
    entry.start = now;
    entry.windowMs = windowMs;
  }
  entry.count++;
  store.set(k, entry);
  return entry.count <= max;
};
