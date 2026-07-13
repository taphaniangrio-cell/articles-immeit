const sanitizeInput = require('../../lib/sanitize');

describe('sanitize.js — sanitizeInput', () => {

  it('escapes HTML entities', () => {
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes ampersand', () => {
    expect(sanitizeInput('a & b')).toBe('a &amp; b');
  });

  it('escapes single quotes', () => {
    expect(sanitizeInput("it's")).toBe("it&#x27;s");
  });

  it('trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('truncates to maxLen', () => {
    expect(sanitizeInput('hello world', 5)).toBe('hello');
  });

  it('reduces 3+ consecutive newlines to 2', () => {
    expect(sanitizeInput('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('preserves 2 consecutive newlines', () => {
    expect(sanitizeInput('a\n\nb')).toBe('a\n\nb');
  });

  it('converts non-string to string', () => {
    expect(sanitizeInput(42)).toBe('42');
    expect(sanitizeInput(null)).toBe('null');
  });

  it('default maxLen is 500', () => {
    const long = 'x'.repeat(600);
    expect(sanitizeInput(long)).toHaveLength(500);
  });
});
