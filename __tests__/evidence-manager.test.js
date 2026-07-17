const { EvidenceManager } = require('../scripts/lib/evidence-manager');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('EvidenceManager', () => {
  let testDir;
  let evidence;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `evidence-test-${Date.now()}`);
    evidence = new EvidenceManager(testDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('creates directory on construction', () => {
    expect(fs.existsSync(testDir)).toBe(true);
  });

  test('saveJson writes valid JSON file', () => {
    const data = { key: 'value', count: 42 };
    evidence.saveJson('test.json', data);

    const filePath = path.join(testDir, 'test.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const loaded = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(loaded).toEqual(data);
  });

  test('loadJson returns null for non-existent file', () => {
    const result = evidence.loadJson('nonexistent.json');
    expect(result).toBeNull();
  });

  test('loadJson returns parsed data for existing file', () => {
    const data = { test: true };
    evidence.saveJson('data.json', data);
    const result = evidence.loadJson('data.json');
    expect(result).toEqual(data);
  });

  test('saveText writes content to file', () => {
    const content = 'Hello, World!';
    evidence.saveText('test.txt', content);

    const filePath = path.join(testDir, 'test.txt');
    expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
  });

  test('getSubdir creates and returns new EvidenceManager', () => {
    const subEvidence = evidence.getSubdir('sub');
    const subDir = path.join(testDir, 'sub');
    expect(fs.existsSync(subDir)).toBe(true);
    expect(subEvidence).toBeInstanceOf(EvidenceManager);
  });

  test('saveEvidence creates timestamped file', () => {
    const filepath = evidence.saveEvidence('ssl-check', 'example.com', '/', {
      status: 'valid'
    });

    expect(fs.existsSync(filepath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    expect(content.type).toBe('ssl-check');
    expect(content.domain).toBe('example.com');
    expect(content.status).toBe('valid');
  });

  test('listFiles with pattern filter', () => {
    evidence.saveJson('a.json', {});
    evidence.saveJson('b.json', {});
    evidence.saveText('c.txt', '');

    const jsonFiles = evidence.listFiles('*.json');
    expect(jsonFiles).toHaveLength(2);
    expect(jsonFiles).toContain('a.json');
    expect(jsonFiles).toContain('b.json');
  });
});