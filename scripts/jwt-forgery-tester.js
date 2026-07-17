const { JWTForgeryTester } = require('./methods/jwt-forgery-test');
const { EvidenceManager } = require('./lib/evidence-manager');
const { ReportGenerator } = require('./lib/report-generator');

const targetDomain = process.argv[2];
const jwtToken = process.argv[3];

if (!targetDomain || !jwtToken) {
  console.error('Usage: node jwt-forgery-tester.js <domain> <jwt-token>');
  console.error('Example: node jwt-forgery-tester.js example.com eyJhbG...');
  process.exit(1);
}

const outputDir = './reports/jwt-forgery-test';

const evidence = new EvidenceManager(outputDir);
const report = new ReportGenerator(outputDir);

const protectedEndpoints = [
  '/api/v1/user/profile',
  '/api/v1/user/info',
  '/api/v1/account',
  '/api/v1/admin/users',
  '/api/v1/protected/info',
  '/api/v1/protected/data'
];

async function main() {
  console.log(`=== JWT Forgery Tester for ${targetDomain} ===\n`);

  const tester = new JWTForgeryTester(targetDomain, outputDir);

  console.log('Phase 1: Testing algorithm:none vulnerability');
  const algNoneResult = await tester.testJWTAlgorithmNone(jwtToken);

  console.log('\nPhase 2: Testing weak secret vulnerability');
  const weakSecretResults = await tester.testJWTWeakSecret(jwtToken, protectedEndpoints);

  const results = tester.getResults();

  const sections = [
    {
      title: 'Summary',
      table: {
        headers: ['Test', 'Result'],
        rows: [
          ['Algorithm None', algNoneResult.success ? 'TESTED' : 'SKIPPED'],
          ['Weak Secret Tests', weakSecretResults.length.toString()],
          ['Vulnerabilities Found', results.vulnerabilities.length.toString()]
        ]
      }
    },
    {
      title: 'Vulnerabilities',
      list: results.vulnerabilities.map(v => `[${v.severity.toUpperCase()}] ${v.type} - ${v.endpoint || 'N/A'}`)
    }
  ];

  const md = report.generateMarkdownReport('JWT Forgery Test Report', sections);
  report.saveReport('jwt-forgery-test-report.md', md);
  tester.saveResults();

  console.log('\n=== Test Complete ===');
  console.log(`Vulnerabilities: ${results.vulnerabilities.length}`);
}

main().catch(console.error);
