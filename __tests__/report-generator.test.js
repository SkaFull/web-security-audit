const { ReportGenerator } = require('../scripts/lib/report-generator');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('ReportGenerator', () => {
  let testDir;
  let report;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `report-test-${Date.now()}`);
    report = new ReportGenerator(testDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('creates output directory on construction', () => {
    expect(fs.existsSync(testDir)).toBe(true);
  });

  test('generateTable creates valid markdown table', () => {
    const table = report.generateTable(
      ['Name', 'Value'],
      [['Alice', '30'], ['Bob', '25']]
    );

    expect(table).toContain('| Name | Value |');
    expect(table).toContain('| --- | --- |');
    expect(table).toContain('| Alice | 30 |');
    expect(table).toContain('| Bob | 25 |');
  });

  test('generateMarkdownReport creates complete report', () => {
    const sections = [
      {
        title: 'Summary',
        table: {
          headers: ['Key', 'Value'],
          rows: [['Total', '3']]
        }
      },
      {
        title: 'Description',
        content: 'This is a test report.'
      },
      {
        title: 'Items',
        list: ['Item 1', 'Item 2']
      }
    ];

    const md = report.generateMarkdownReport('Test Report', sections);

    expect(md).toContain('# Test Report');
    expect(md).toContain('## Summary');
    expect(md).toContain('| Total | 3 |');
    expect(md).toContain('## Description');
    expect(md).toContain('This is a test report.');
    expect(md).toContain('## Items');
    expect(md).toContain('- Item 1');
    expect(md).toContain('- Item 2');
  });

  test('generateVulnerabilityReport creates vulnerability report', () => {
    const vuln = {
      title: 'SQL Injection',
      severity: 'high',
      category: 'injection',
      domain: 'example.com',
      endpoint: '/api/users',
      description: 'SQL injection in user API',
      evidence: 'curl output here',
      impact: 'Data breach',
      remediation: 'Use parameterized queries'
    };

    const md = report.generateVulnerabilityReport(vuln);

    expect(md).toContain('# SQL Injection');
    expect(md).toContain('| SQL Injection');
    expect(md).toContain('| high');
    expect(md).toContain('SQL injection in user API');
  });

  test('generateSummaryReport creates summary with severity counts', () => {
    const findings = [
      { title: 'V1', severity: 'critical', category: 'injection', domain: 'a.com', endpoint: '/api' },
      { title: 'V2', severity: 'high', category: 'config', domain: 'b.com', endpoint: '/' },
      { title: 'V3', severity: 'medium', category: 'config', domain: 'c.com', endpoint: '/login' }
    ];

    const md = report.generateSummaryReport(findings);

    expect(md).toContain('| Critical | 1 |');
    expect(md).toContain('| High | 1 |');
    expect(md).toContain('| Medium | 1 |');
    expect(md).toContain('| Total | 3 |');
    expect(md).toContain('[CRITICAL] V1');
    expect(md).toContain('[HIGH] V2');
  });

  test('saveReport writes to file', () => {
    const filepath = report.saveReport('test.md', '# Test');
    expect(fs.existsSync(filepath)).toBe(true);
    expect(fs.readFileSync(filepath, 'utf-8')).toBe('# Test');
  });

  test('saveJsonReport writes JSON to file', () => {
    const data = { results: [1, 2, 3] };
    const filepath = report.saveJsonReport('test.json', data);
    expect(fs.existsSync(filepath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(filepath, 'utf-8'))).toEqual(data);
  });
});