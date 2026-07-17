const { enumerateSubdomains } = require('./lib/subdomain-enumerator');
const { EvidenceManager } = require('./lib/evidence-manager');
const { ReportGenerator } = require('./lib/report-generator');

const domains = process.argv.slice(2);

if (domains.length === 0) {
  console.error('Usage: node ct-log-scanner.js <domain1> [domain2] [domain3] ...');
  console.error('Example: node ct-log-scanner.js example.com test.com');
  process.exit(1);
}

const outputDir = './reports/ct-log-scan';
const evidence = new EvidenceManager(outputDir);
const report = new ReportGenerator(outputDir);

async function main() {
  console.log('=== CT Log Scanner ===\n');
  
  const allResults = [];

  for (const domain of domains) {
    const result = await enumerateSubdomains(domain);
    allResults.push(result);

    evidence.saveEvidence(
      'ct-log-scan',
      domain,
      'crt.sh',
      {
        subdomains: result.subdomains,
        sensitiveSubdomains: result.sensitiveSubdomains,
        issuers: result.issuers,
        certificateCount: result.certificateCount
      }
    );
  }

  const sections = [
    {
      title: 'Summary',
      table: {
        headers: ['Domain', 'Subdomains', 'Sensitive', 'Certificates'],
        rows: allResults.map(r => [
          r.domain,
          r.subdomains.length.toString(),
          r.sensitiveSubdomains.length.toString(),
          r.certificateCount.toString()
        ])
      }
    },
    {
      title: 'Sensitive Subdomains',
      list: allResults.flatMap(r => 
        r.sensitiveSubdomains.map(s => `${r.domain}: ${s}`)
      )
    }
  ];

  const md = report.generateMarkdownReport('CT Log Scan Report', sections);
  report.saveReport('ct-log-scan-report.md', md);
  report.saveJsonReport('ct-log-scan-results.json', allResults);

  console.log('\n=== Scan Complete ===');
  console.log(`Total domains: ${allResults.length}`);
  console.log(`Total subdomains: ${allResults.reduce((sum, r) => sum + r.subdomains.length, 0)}`);
  console.log(`Total sensitive: ${allResults.reduce((sum, r) => sum + r.sensitiveSubdomains.length, 0)}`);
}

main().catch(console.error);
