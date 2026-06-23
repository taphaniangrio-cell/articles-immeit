const store = new Map();

module.exports = function rateLimit(key, route, { max, windowMs }) {
  const k = `${route}:${key}`;
  const now = Date.now();
  const entry = store.get(k) ?? { count: 0, start: now };
  if (now - entry.start > windowMs) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count++;
  store.set(k, entry);
  return entry.count <= max;
};
