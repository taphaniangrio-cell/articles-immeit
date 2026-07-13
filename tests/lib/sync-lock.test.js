const { acquire, release, isLocked, getLockInfo } = require('../../lib/sync-lock');

describe('sync-lock.js', () => {

  beforeEach(() => {
    release();
  });

  afterEach(() => {
    release();
  });

  it('is not locked initially', () => {
    release();
    expect(isLocked()).toBeFalsy();
  });

  it('acquires lock successfully', () => {
    const result = acquire();
    expect(result).toBe(true);
    expect(isLocked()).toBe(true);
  });

  it('blocks second acquisition', () => {
    acquire();
    const second = acquire();
    expect(second).toBe(false);
  });

  it('releases lock', () => {
    acquire();
    release();
    expect(isLocked()).toBeFalsy();
  });

  it('allows re-acquisition after release', () => {
    acquire();
    release();
    const result = acquire();
    expect(result).toBe(true);
  });

  it('getLockInfo returns lock details when locked', () => {
    acquire();
    const info = getLockInfo();
    expect(info).toBeDefined();
    expect(info.pid).toBe(process.pid);
    expect(info.lockedAt).toBeGreaterThan(0);
    expect(info.hostname).toBeDefined();
  });

  it('getLockInfo returns null when no lock file', () => {
    release();
    const info = getLockInfo();
    expect(info === null || info === undefined).toBe(true);
  });
});
