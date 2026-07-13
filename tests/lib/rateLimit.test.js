const rateLimit = require('../../lib/rateLimit');

describe('rateLimit.js', () => {

  it('allows first request within window', () => {
    const result = rateLimit('127.0.0.1', '/api/test', { max: 3, windowMs: 60000 });
    expect(result).toBe(true);
  });

  it('allows up to max requests', () => {
    rateLimit('10.0.0.1', '/api/test-max', { max: 2, windowMs: 60000 });
    const second = rateLimit('10.0.0.1', '/api/test-max', { max: 2, windowMs: 60000 });
    expect(second).toBe(true);
  });

  it('blocks after exceeding max', () => {
    const key = 'block-test-' + Date.now();
    rateLimit(key, '/api/block', { max: 2, windowMs: 60000 });
    rateLimit(key, '/api/block', { max: 2, windowMs: 60000 });
    const third = rateLimit(key, '/api/block', { max: 2, windowMs: 60000 });
    expect(third).toBe(false);
  });

  it('different routes are independent', () => {
    const key = 'route-test-' + Date.now();
    rateLimit(key, '/api/routeA', { max: 1, windowMs: 60000 });
    const result = rateLimit(key, '/api/routeB', { max: 1, windowMs: 60000 });
    expect(result).toBe(true);
  });

  it('different keys are independent', () => {
    rateLimit('ip-a', '/api/same-route', { max: 1, windowMs: 60000 });
    const result = rateLimit('ip-b', '/api/same-route', { max: 1, windowMs: 60000 });
    expect(result).toBe(true);
  });

  it('resets after window expires', async () => {
    const key = 'window-test-' + Date.now();
    rateLimit(key, '/api/window', { max: 1, windowMs: 100 });
    expect(rateLimit(key, '/api/window', { max: 1, windowMs: 100 })).toBe(false);

    await new Promise(r => setTimeout(r, 120));
    const result = rateLimit(key, '/api/window', { max: 1, windowMs: 100 });
    expect(result).toBe(true);
  });
});
