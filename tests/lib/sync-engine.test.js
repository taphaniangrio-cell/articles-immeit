const { computeChecksum } = require('../../lib/sync-engine');

describe('sync-engine.js — computeChecksum', () => {

  it('returns a 16-char hex string', () => {
    const checksum = computeChecksum({ items: [{ a: 1 }, { b: 2 }] });
    expect(checksum).toMatch(/^[a-f0-9]{16}$/);
  });

  it('is deterministic for same input', () => {
    const data = { items: [{ x: 'hello' }, { y: 42 }] };
    const c1 = computeChecksum(data);
    const c2 = computeChecksum(data);
    expect(c1).toBe(c2);
  });

  it('changes when items change', () => {
    const c1 = computeChecksum({ items: [{ a: 1 }] });
    const c2 = computeChecksum({ items: [{ a: 2 }] });
    expect(c1).not.toBe(c2);
  });

  it('handles empty items', () => {
    const checksum = computeChecksum({ items: [] });
    expect(checksum).toMatch(/^[a-f0-9]{16}$/);
  });

  it('handles missing items field', () => {
    const checksum = computeChecksum({});
    expect(checksum).toMatch(/^[a-f0-9]{16}$/);
  });

  it('is order-sensitive', () => {
    const c1 = computeChecksum({ items: [{ a: 1 }, { b: 2 }] });
    const c2 = computeChecksum({ items: [{ b: 2 }, { a: 1 }] });
    expect(c1).not.toBe(c2);
  });
});
