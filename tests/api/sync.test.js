describe('api/sync.js — module structure', () => {
  it('module exports a function', () => {
    const handler = require('../../api/sync');
    expect(typeof handler).toBe('function');
  });
});

describe('api/auth.js — module structure', () => {
  it('module exports a function', () => {
    const handler = require('../../api/auth');
    expect(typeof handler).toBe('function');
  });
});

describe('api/sync-status.js — module structure', () => {
  it('module exports a function', () => {
    const handler = require('../../api/sync-status');
    expect(typeof handler).toBe('function');
  });
});

describe('api/articles.js — module structure', () => {
  it('module exports a function', () => {
    const handler = require('../../api/articles');
    expect(typeof handler).toBe('function');
  });
});

describe('api/dashboard.js — module structure', () => {
  it('module exports a function', () => {
    const handler = require('../../api/dashboard');
    expect(typeof handler).toBe('function');
  });
});
