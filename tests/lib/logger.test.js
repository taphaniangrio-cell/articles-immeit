const { log, updateSyncStatus, getSyncStatus } = require('../../lib/logger');

describe('logger.js', () => {

  it('getSyncStatus returns an object', () => {
    const status = getSyncStatus();
    expect(status).toBeDefined();
    expect(typeof status).toBe('object');
  });

  it('updateSyncStatus merges partial data', () => {
    updateSyncStatus({ lastSuccess: '2025-01-01', lastItemCount: 100 });
    const status = getSyncStatus();
    expect(status.lastSuccess).toBe('2025-01-01');
    expect(status.lastItemCount).toBe(100);
  });

  it('updateSyncStatus preserves existing fields', () => {
    updateSyncStatus({ lastSource: 'live' });
    updateSyncStatus({ lastItemCount: 50 });
    const status = getSyncStatus();
    expect(status.lastSource).toBe('live');
    expect(status.lastItemCount).toBe(50);
  });

  it('log does not throw', () => {
    expect(() => log('info', 'test_event', { key: 'value' })).not.to.throw();
    expect(() => log('error', 'test_error', { error: 'something' })).not.to.throw();
    expect(() => log('warn', 'test_warn')).not.to.throw();
  });
});
