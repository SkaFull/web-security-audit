const { checkSSL } = require('./lib/ssl-checker');
const { EvidenceManager } = require('./lib/evidence-manager');
const { ReportGenerator } = require('./lib/report-generator');

const domains = process.argv.slice(2);

if (domains.length === 0) {
  console.error('Usage: node ssl-cert-checker.js <domain1> [domain2] [domain3] ...');
  console.error('Example: node ssl-cert-checker.js example.com test.com');
  process.exit(1);
}

const outputDir = './reports/ssl-cert-check';
const evidence = new EvidenceManager(outputDir);
const report = new ReportGenerator(outputDir);

async function main() {
  console.log('=== SSL Certificate Checker ===\n');
  
  const allResults = [];

  for (const domain of domains) {
    const result = await checkSSL(domain);
    allResults.push(result);

    evidence.saveEvidence(
      'ssl-check',
      domain,
      'ssl-certificate',
      result
    );
  }

  const sections = [
    {
      title: 'Summary',
      table: {
        headers: ['Domain', 'CAA Status', 'SSL Status', 'Days Remaining'],
        rows: allResults.map(r => [
          r.domain,
          r.caa.status,
          r.certificate.status,
          r.certificate.daysRemaining?.toString() || 'N/A'
        ])
      }
    },
    {
      title: 'Issues',
      list: allResults
        .filter(r => r.caa.status === 'MISSING' || r.certificate.status !== 'VALID')
        .map(r => {
          const issues = [];
          if (r.caa.status === 'MISSING') issues.push('Missing CAA records');
          if (r.certificate.status === 'EXPIRING_SOON') issues.push(`Certificate expires in ${r.certificate.daysRemaining} days`);
          if (r.certificate.status === 'EXPIRED') issues.push('Certificate expired');
          if (r.certificate.status === 'ERROR') issues.push(`SSL error: ${r.certificate.error}`);
          return `${r.domain}: ${issues.join(', ')}`;
        })
    }
  ];

  const md = report.generateMarkdownReport('SSL Certificate Check Report', sections);
  report.saveReport('ssl-cert-check-report.md', md);
  report.saveJsonReport('ssl-cert-check-results.json', allResults);

  console.log('\n=== Check Complete ===');
  console.log(`Total domains: ${allResults.length}`);
  console.log(`CAA missing: ${allResults.filter(r => r.caa.status === 'MISSING').length}`);
  console.log(`SSL issues: ${allResults.filter(r => r.certificate.status !== 'VALID').length}`);
}

main().catch(console.error);
