const { BruteForceTester } = require('./methods/brute-force-test');
const { EvidenceManager } = require('./lib/evidence-manager');
const { ReportGenerator } = require('./lib/report-generator');

const targetDomain = process.argv[2];
const loginPath = process.argv[3] || '/api/v1/login';

if (!targetDomain) {
  console.error('Usage: node brute-force-tester.js <domain> [login-path]');
  console.error('Example: node brute-force-tester.js example.com /api/login');
  process.exit(1);
}

const outputDir = './reports/brute-force-test';
const evidence = new EvidenceManager(outputDir);
const report = new ReportGenerator(outputDir);

const credentials = [
  { username: 'admin', password: 'admin123' },
  { username: 'admin', password: 'password' },
  { username: 'admin', password: '123456' },
  { username: 'administrator', password: 'administrator' },
  { username: 'root', password: 'root' },
  { username: 'test', password: 'test' }
];

async function main() {
  console.log(`=== Brute Force Tester for ${targetDomain} ===\n`);

  const tester = new BruteForceTester(targetDomain, outputDir);

  console.log('Phase 1: Testing login endpoint with credentials');
  await tester.testLoginEndpoint(loginPath, credentials);

  console.log('\nPhase 2: Testing rate limiting');
  await tester.testRateLimiting(loginPath, 20);

  const results = tester.getResults();

  const sections = [
    {
      title: 'Summary',
      table: {
        headers: ['Metric', 'Value'],
        rows: [
          ['Domain', targetDomain],
          ['Login Path', loginPath],
          ['Total Attempts', results.tests.reduce((sum, t) => sum + t.totalAttempts, 0).toString()],
          ['Successful Logins', results.tests.reduce((sum, t) => sum + t.successfulLogins, 0).toString()],
          ['Vulnerabilities', results.vulnerabilities.length.toString()]
        ]
      }
    },
    {
      title: 'Test Results',
      table: {
        headers: ['Endpoint', 'Attempts', 'Successful', 'Avg Time (ms)'],
        rows: results.tests.map(t => [
          t.endpoint,
          t.totalAttempts.toString(),
          t.successfulLogins.toString(),
          t.avgResponseTime.toFixed(2)
        ])
      }
    },
    {
      title: 'Vulnerabilities',
      list: results.vulnerabilities.map(v => `[${v.severity.toUpperCase()}] ${v.type} - ${v.username || v.endpoint}`)
    }
  ];

  const md = report.generateMarkdownReport('Brute Force Test Report', sections);
  report.saveReport('brute-force-test-report.md', md);
  tester.saveResults();

  console.log('\n=== Test Complete ===');
  console.log(`Total attempts: ${results.tests.reduce((sum, t) => sum + t.totalAttempts, 0)}`);
  console.log(`Successful logins: ${results.tests.reduce((sum, t) => sum + t.successfulLogins, 0)}`);
  console.log(`Vulnerabilities: ${results.vulnerabilities.length}`);
}

main().catch(console.error);
