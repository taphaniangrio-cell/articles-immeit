const { CONSTANTS } = require('../../lib/constants');

describe('constants.js', () => {

  it('exports all required timeout constants', () => {
    expect(CONSTANTS.FETCH_TIMEOUT).toBeGreaterThan(0);
    expect(CONSTANTS.SHAREPOINT_REQUEST_TIMEOUT).toBeGreaterThan(0);
    expect(CONSTANTS.SHAREPOINT_HTTPS_TIMEOUT).toBeGreaterThan(0);
    expect(CONSTANTS.AI_REQUEST_TIMEOUT).toBeGreaterThan(0);
    expect(CONSTANTS.IMAGE_FETCH_TIMEOUT).toBeGreaterThan(0);
  });

  it('exports all cache TTL constants', () => {
    expect(CONSTANTS.RSS_CACHE_TTL).toBeGreaterThan(0);
    expect(CONSTANTS.IMAGE_CACHE_TTL).toBeGreaterThan(0);
    expect(CONSTANTS.SESSION_TTL).toBeGreaterThan(0);
    expect(CONSTANTS.AUTO_SYNC_REFRESH_INTERVAL).toBeGreaterThan(0);
  });

  it('exports all rate limit configs', () => {
    expect(CONSTANTS.RATE_LIMIT_AUTH).toHaveProperty('max');
    expect(CONSTANTS.RATE_LIMIT_AUTH).toHaveProperty('windowMs');
    expect(CONSTANTS.RATE_LIMIT_AUTH.max).toBeGreaterThan(0);
    expect(CONSTANTS.RATE_LIMIT_ARTICLES.max).toBeGreaterThan(0);
    expect(CONSTANTS.RATE_LIMIT_GENERATE.max).toBeGreaterThan(0);
  });

  it('exports DB config', () => {
    expect(CONSTANTS.DB_CONNECTION_TIMEOUT).toBeGreaterThan(0);
    expect(CONSTANTS.DB_POOL_MAX).toBeGreaterThan(0);
    expect(CONSTANTS.DB_QUERY_RETRIES).toBeGreaterThanOrEqual(0);
  });

  it('exports security config', () => {
    expect(CONSTANTS.BCRYPT_SALT_ROUNDS).toBeGreaterThanOrEqual(10);
    expect(CONSTANTS.MAX_PAYLOAD_SIZE).toBeGreaterThan(0);
  });

  it('exports pagination config', () => {
    expect(CONSTANTS.ARTICLES_PAGE_SIZE).toBeGreaterThan(0);
    expect(CONSTANTS.DASHBOARD_TABLE_ROWS).toBeGreaterThan(0);
  });
});
