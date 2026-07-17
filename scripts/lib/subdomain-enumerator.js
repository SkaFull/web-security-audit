const https = require('https');
const { httpGet } = require('./http-client');

async function queryCTLog(domain) {
  const url = `https://crt.sh/?q=%25.${domain}&output=json`;
  console.log(`Querying CT log: ${url}`);

  const result = await httpGet('crt.sh', `/?q=%25.${domain}&output=json`, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (result.error || result.status !== 200) {
    console.log(`CT log query failed: ${result.error || result.status}`);
    return [];
  }

  try {
    const certs = JSON.parse(result.body);
    console.log(`Found ${certs.length} certificates`);
    return certs;
  } catch (e) {
    console.log(`Error parsing CT log response: ${e.message}`);
    return [];
  }
}

function extractSubdomains(certs) {
  const subdomains = new Set();
  const issuers = new Set();

  certs.forEach(cert => {
    if (cert.name_value) {
      const names = cert.name_value.split('\n');
      names.forEach(name => {
        const cleanName = name.trim().toLowerCase();
        if (cleanName && !cleanName.startsWith('*')) {
          subdomains.add(cleanName);
        } else if (cleanName.startsWith('*.')) {
          const baseDomain = cleanName.substring(2);
          subdomains.add(baseDomain);
        }
      });
    }

    if (cert.issuer_name) {
      issuers.add(cert.issuer_name);
    }
  });

  return {
    subdomains: Array.from(subdomains).sort(),
    issuers: Array.from(issuers)
  };
}

function analyzeSensitiveSubdomains(subdomains) {
  const sensitiveKeywords = [
    'admin', 'vpn', 'internal', 'dev', 'staging', 'test', 'api',
    'dashboard', 'panel', 'console', 'portal', 'sso', 'login', 'auth',
    'grafana', 'jenkins', 'gitlab', 'vault', 'bastion', 'ops', 'mgmt',
    'monitoring', 'debug', 'sandbox', 'uat', 'preprod', 'prod'
  ];

  const sensitive = [];
  subdomains.forEach(sub => {
    const subdomain = sub.split('.')[0];
    if (sensitiveKeywords.some(kw => subdomain.includes(kw))) {
      sensitive.push(sub);
    }
  });

  return sensitive;
}

async function enumerateSubdomains(domain) {
  console.log(`\n=== Enumerating subdomains for ${domain} ===`);

  const certs = await queryCTLog(domain);
  const { subdomains, issuers } = extractSubdomains(certs);
  const sensitive = analyzeSensitiveSubdomains(subdomains);

  console.log('\nResults:');
  console.log(`  Total subdomains: ${subdomains.length}`);
  console.log(`  Sensitive subdomains: ${sensitive.length}`);
  console.log(`  Certificate issuers: ${issuers.length}`);

  return {
    domain,
    subdomains,
    sensitiveSubdomains: sensitive,
    issuers,
    certificateCount: certs.length
  };
}

module.exports = {
  queryCTLog,
  extractSubdomains,
  analyzeSensitiveSubdomains,
  enumerateSubdomains
};
