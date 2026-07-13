const { createSession, destroySession, requireAuth, requireCsrf } = require('../../lib/auth');

process.env.SESSION_SECRET = 'test-secret-key-for-unit-tests-32chars!';

describe('auth.js', () => {

  // ── createSession ───────────────────────────────────────────────────

  describe('createSession', () => {
    it('returns a string with 3 dot-separated parts', () => {
      const token = createSession();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('generates unique tokens each call', () => {
      const t1 = createSession();
      const t2 = createSession();
      expect(t1).not.toBe(t2);
    });

    it('has a valid HMAC signature as third part', () => {
      const token = createSession();
      const parts = token.split('.');
      expect(parts[2]).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  // ── destroySession ──────────────────────────────────────────────────

  describe('destroySession', () => {
    it('does not throw when called with null/undefined', () => {
      expect(() => destroySession(null)).not.to.throw();
      expect(() => destroySession(undefined)).not.to.throw();
    });
  });

  // ── requireAuth ─────────────────────────────────────────────────────

  describe('requireAuth', () => {
    function mockReq(cookie) {
      return { headers: { cookie: cookie || '' }, url: '/test', method: 'GET' };
    }

    function mockRes() {
      const res = { _status: 200, _body: null };
      res.status = (s) => { res._status = s; return res; };
      res.json = (b) => { res._body = b; return res; };
      return res;
    }

    it('calls handler when valid session cookie is present', async () => {
      const token = createSession();
      const handler = async (req, res) => { res.status(200).json({ ok: true }); };
      const wrapped = requireAuth(handler);

      const res = mockRes();
      await wrapped(mockReq(`session=${token}`), res);
      expect(res._status).toBe(200);
      expect(res._body.ok).toBe(true);
    });

    it('returns 401 when no session cookie', async () => {
      const handler = async () => {};
      const wrapped = requireAuth(handler);

      const res = mockRes();
      await wrapped(mockReq(''), res);
      expect(res._status).toBe(401);
    });

    it('returns 401 with invalid session', async () => {
      const handler = async () => {};
      const wrapped = requireAuth(handler);

      const res = mockRes();
      await wrapped(mockReq('session=invalid.token.here'), res);
      expect(res._status).toBe(401);
    });

    it('extracts session from multiple cookies', async () => {
      const token = createSession();
      const handler = async (req, res) => { res.status(200).json({ ok: true }); };
      const wrapped = requireAuth(handler);

      const res = mockRes();
      await wrapped(mockReq(`foo=bar; session=${token}; baz=qux`), res);
      expect(res._status).toBe(200);
    });
  });

  // ── requireCsrf ─────────────────────────────────────────────────────

  describe('requireCsrf', () => {
    function mockReqRes(method, cookie, header) {
      const req = {
        method,
        headers: { cookie: cookie || '', 'x-csrf-token': header || '' },
        url: '/test',
      };
      const res = { _status: 200, _body: null };
      res.status = (s) => { res._status = s; return res; };
      res.json = (b) => { res._body = b; return res; };
      return { req, res };
    }

    it('allows GET requests without CSRF', () => {
      const { req, res } = mockReqRes('GET', '', '');
      expect(requireCsrf(req, res)).toBe(true);
    });

    it('allows HEAD requests without CSRF', () => {
      const { req, res } = mockReqRes('HEAD', '', '');
      expect(requireCsrf(req, res)).toBe(true);
    });

    it('allows OPTIONS requests without CSRF', () => {
      const { req, res } = mockReqRes('OPTIONS', '', '');
      expect(requireCsrf(req, res)).toBe(true);
    });

    it('rejects POST without CSRF token', () => {
      const { req, res } = mockReqRes('POST', '', '');
      expect(requireCsrf(req, res)).toBe(false);
      expect(res._status).toBe(403);
    });

    it('rejects POST with mismatched CSRF', () => {
      const { req, res } = mockReqRes('POST', 'csrf=aaa', 'bbb');
      expect(requireCsrf(req, res)).toBe(false);
      expect(res._status).toBe(403);
    });

    it('accepts POST with matching CSRF', () => {
      const { req, res } = mockReqRes('POST', 'csrf=abc123', 'abc123');
      expect(requireCsrf(req, res)).toBe(true);
    });

    it('rejects PUT without CSRF', () => {
      const { req, res } = mockReqRes('PUT', '', '');
      expect(requireCsrf(req, res)).toBe(false);
    });

    it('rejects DELETE without CSRF', () => {
      const { req, res } = mockReqRes('DELETE', '', '');
      expect(requireCsrf(req, res)).toBe(false);
    });
  });
});
