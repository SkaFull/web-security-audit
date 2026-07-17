const { APIDeepTester } = require('./methods/api-deep-test');
const { SSRFTester } = require('./methods/ssrf-test');
const { EvidenceManager } = require('./lib/evidence-manager');
const { ReportGenerator } = require('./lib/report-generator');

const targetDomain = process.argv[2];
const authToken = process.argv[3] || null;

if (!targetDomain) {
  console.error('Usage: node api-security-tester.js <domain> [auth-token]');
  console.error('Example: node api-security-tester.js example.com eyJhbG...');
  process.exit(1);
}

const outputDir = './reports/api-security-test';

const evidence = new EvidenceManager(outputDir);
const report = new ReportGenerator(outputDir);

async function main() {
  console.log(`=== API Security Tester for ${targetDomain} ===\n`);

  const apiTester = new APIDeepTester(targetDomain, outputDir);
  const ssrfTester = new SSRFTester(targetDomain, outputDir);

  console.log('Phase 1: Testing common API endpoints');
  await apiTester.testAllEndpoints(authToken);

  console.log('\nPhase 2: Testing SSRF vulnerabilities');
  const ssrfEndpoints = [
    '/api/v1/proxy',
    '/api/v1/fetch',
    '/api/v1/request',
    '/_api/fetch_url',
    '/_api/request'
  ];

  for (const endpoint of ssrfEndpoints) {
    console.log(`Testing SSRF on: ${endpoint}`);
    await ssrfTester.testProxyEndpoint(endpoint, 'url');
    await ssrfTester.testProxyEndpoint(endpoint, 'target');
  }

  const apiResults = apiTester.getResults();
  const ssrfResults = ssrfTester.getResults();

  const allVulnerabilities = [
    ...apiResults.vulnerabilities,
    ...ssrfResults.vulnerabilities
  ];

  const sections = [
    {
      title: 'Summary',
      table: {
        headers: ['Category', 'Count'],
        rows: [
          ['Total Endpoints Tested', apiResults.endpoints.length.toString()],
          ['Total SSRF Tests', ssrfResults.tests.length.toString()],
          ['Vulnerabilities Found', allVulnerabilities.length.toString()],
          ['Critical', allVulnerabilities.filter(v => v.severity === 'critical').length.toString()],
          ['High', allVulnerabilities.filter(v => v.severity === 'high').length.toString()],
          ['Medium', allVulnerabilities.filter(v => v.severity === 'medium').length.toString()]
        ]
      }
    },
    {
      title: 'Vulnerabilities',
      list: allVulnerabilities.map(v => `[${v.severity.toUpperCase()}] ${v.type} - ${v.endpoint}`)
    }
  ];

  const md = report.generateMarkdownReport('API Security Test Report', sections);
  report.saveReport('api-security-test-report.md', md);
  
  evidence.saveJson('api-test-results.json', apiResults);
  evidence.saveJson('ssrf-test-results.json', ssrfResults);
  evidence.saveJson('all-vulnerabilities.json', allVulnerabilities);

  console.log('\n=== Test Complete ===');
  console.log(`Endpoints tested: ${apiResults.endpoints.length}`);
  console.log(`SSRF tests: ${ssrfResults.tests.length}`);
  console.log(`Vulnerabilities: ${allVulnerabilities.length}`);
}

main().catch(console.error);
