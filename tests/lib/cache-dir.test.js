const fs = require('fs');
const path = require('path');
const { getCacheDir, ensureDir, safeWriteFile, safeReadFile, safeDeleteFile } = require('../../lib/cache-dir');

describe('cache-dir.js', () => {

  const testDir = path.join(__dirname, '__test_cache__');

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('getCacheDir returns a string path', () => {
    expect(typeof getCacheDir()).toBe('string');
  });

  it('ensureDir creates directory', () => {
    expect(fs.existsSync(testDir)).toBe(false);
    const result = ensureDir(testDir);
    expect(result).toBe(true);
    expect(fs.existsSync(testDir)).toBe(true);
  });

  it('ensureDir returns true for existing directory', () => {
    fs.mkdirSync(testDir, { recursive: true });
    expect(ensureDir(testDir)).toBe(true);
  });

  it('safeWriteFile writes JSON data', () => {
    fs.mkdirSync(testDir, { recursive: true });
    const filePath = path.join(testDir, 'test.json');
    const data = { hello: 'world', count: 42 };

    const result = safeWriteFile(filePath, data);
    expect(result).toBe(true);

    const raw = fs.readFileSync(filePath, 'utf-8');
    expect(JSON.parse(raw)).toEqual(data);
  });

  it('safeWriteFile writes string data', () => {
    fs.mkdirSync(testDir, { recursive: true });
    const filePath = path.join(testDir, 'test.txt');

    const result = safeWriteFile(filePath, 'plain text');
    expect(result).toBe(true);
    expect(fs.readFileSync(filePath, 'utf-8')).toBe('plain text');
  });

  it('safeReadFile reads written file', () => {
    fs.mkdirSync(testDir, { recursive: true });
    const filePath = path.join(testDir, 'read.json');
    safeWriteFile(filePath, { data: 123 });

    const content = safeReadFile(filePath);
    expect(JSON.parse(content)).toEqual({ data: 123 });
  });

  it('safeReadFile returns null for non-existent file', () => {
    expect(safeReadFile(path.join(testDir, 'nope.txt'))).toBeNull();
  });

  it('safeDeleteFile removes file', () => {
    fs.mkdirSync(testDir, { recursive: true });
    const filePath = path.join(testDir, 'to_delete.txt');
    safeWriteFile(filePath, 'bye');

    expect(safeDeleteFile(filePath)).toBe(true);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('safeDeleteFile returns true for non-existent file', () => {
    expect(safeDeleteFile(path.join(testDir, 'already_gone.txt'))).toBe(true);
  });

  it('safeWriteFile creates nested directories', () => {
    const nested = path.join(testDir, 'a', 'b', 'c');
    const filePath = path.join(nested, 'file.json');

    const result = safeWriteFile(filePath, { nested: true });
    expect(result).toBe(true);
    expect(JSON.parse(safeReadFile(filePath))).toEqual({ nested: true });
  });
});
