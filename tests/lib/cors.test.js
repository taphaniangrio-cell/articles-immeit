const cors = require('../../lib/cors');

describe('cors.js', () => {

  function mockRes() {
    const headers = {};
    const res = { _headers: headers, _status: null, _ended: false };
    res.setHeader = (k, v) => { headers[k] = v; };
    res.getHeader = (k) => headers[k];
    res.writeHead = (s) => { res._status = s; };
    res.end = () => { res._ended = true; };
    return res;
  }

  it('sets Access-Control-Allow-Origin for allowed origin', () => {
    const res = mockRes();
    const req = { method: 'GET', headers: { origin: 'http://localhost:3000' } };
    const handled = cors(res, req);
    expect(handled).toBe(false);
    expect(res._headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
    expect(res._headers['Access-Control-Allow-Credentials']).toBe('true');
  });

  it('does not set origin header for unknown origin', () => {
    const res = mockRes();
    const req = { method: 'GET', headers: { origin: 'https://evil.com' } };
    cors(res, req);
    expect(res._headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('returns true and sends 204 for OPTIONS', () => {
    const res = mockRes();
    const req = { method: 'OPTIONS', headers: { origin: 'http://localhost:3000' } };
    const handled = cors(res, req);
    expect(handled).toBe(true);
    expect(res._status).toBe(204);
    expect(res._ended).toBe(true);
  });

  it('returns false for non-OPTIONS requests', () => {
    const res = mockRes();
    const req = { method: 'POST', headers: { origin: 'http://localhost:3000' } };
    const handled = cors(res, req);
    expect(handled).toBe(false);
  });

  it('always sets Allow-Methods and Allow-Headers', () => {
    const res = mockRes();
    const req = { method: 'GET', headers: { origin: 'http://localhost:3000' } };
    cors(res, req);
    expect(res._headers['Access-Control-Allow-Methods']).toContain('GET');
    expect(res._headers['Access-Control-Allow-Headers']).toContain('Content-Type');
  });
});
