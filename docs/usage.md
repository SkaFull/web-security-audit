# Usage Guide

## Installation

### Prerequisites

- **Node.js** >= 18.0.0
- **PowerShell** 5.1+ (for gate verification, Windows only)
- **curl** (recommended for HTTP testing)

### Setup

```bash
git clone https://github.com/SkaFull/web-security-audit.git
cd web-security-audit
npm install
```

## Basic Usage

### Full Audit Pipeline

```bash
# Basic audit
npm run audit -- --target example.com

# With auth token and proxy
npm run audit -- --target example.com --auth-token eyJhbG... --proxy 127.0.0.1:7890

# Specify output directory
npm run audit -- --target example.com --output ./my-audit-results

# Run specific steps only
npm run audit -- --target example.com --steps 0-5
npm run audit -- --target example.com --steps 1,3,5,7
```

### Individual Tools

```bash
# SSL Certificate Checker
npm run ssl-check -- example.com test.com

# CT Log Scanner
npm run ct-scan -- example.com

# API Security Tester
npm run api-test -- example.com [auth-token]

# JWT Forgery Tester
npm run jwt-test -- example.com eyJhbG...

# Brute Force Tester
npm run brute-test -- example.com /api/login
```

## Authentication

### Providing an Auth Token

For authenticated testing (CORS with credentials, WebSocket auth, rate limiting), provide a JWT auth token:

```bash
# Via CLI
npm run audit -- --target example.com --auth-token eyJhbGciOiJFUzI1NiJ9...

# Via environment variable
export AUTH_TOKEN=eyJhbGciOiJFUzI1NiJ9...
npm run audit -- --target example.com
```

### Proxy Configuration

```bash
# Via CLI
npm run audit -- --target example.com --proxy 127.0.0.1:7890

# Via environment variable
export PROXY_HOST=127.0.0.1
export PROXY_PORT=7890
npm run audit -- --target example.com
```

## Understanding the Output

### Audit Directory Structure

Each audit produces a directory at `audits/<domain>/` with per-step subdirectories.

### Key Files

| File | Purpose |
|------|---------|
| `audit-progress.json` | Overall audit progress and status |
| `step-*/coverage.json` | Test coverage for this step (must be 100%) |
| `step-*/vulnerabilities.json` | Vulnerabilities found in this step |
| `step-*/logs/execution.log` | All HTTP requests made during this step |
| `step-*/step-commit.json` | Non-repudiation proof of step completion |
| `step-22-final-report/final-report.md` | Complete audit report with CVSS, CWE, OWASP |

### Report Format

The final report includes:
- **Audit Summary**: overview of all findings
- **Vulnerability Details**: per-vulnerability with CVSS, CWE, OWASP, remediation
- **Domain Distribution Matrix**: vulnerabilities by domain
- **Compliance Analysis**: PCI DSS, ISO 27001, GDPR mapping
- **Repair Roadmap**: P0/P1/P2/P3 priority recommendations

## Step-by-Step Execution

### Step 0: Subdomain Enumeration
Discovers all subdomains and related domain systems using 20+ methods.

### Step 1: Basic Security
Checks security headers, SSL/TLS, cookies, and info leaks (100+ tests).

### Step 2: Advanced Security
Tests authentication, API endpoints, infrastructure exposure (60+ tests).

### Step 3: Specialized Testing
Tests SQLi, XSS, SSRF, command injection, XXE, SSTI (50+ tests).

### Step 4: Open Redirect
Tests 20+ payload variants across all URL parameters.

### Step 5: HTTP Methods & Rate Limits
Enumerates HTTP methods and tests rate limiting.

### Step 6: Subdomain Deep Audit
Runs steps 1-5 on every accessible subdomain (215+ tests each).

### Step 7: App Layer Deep Audit
Reverse engineers JS bundles, detects config leaks, tests WebSocket.

### Step 8: CMS Audit
Detects and tests WordPress, Drupal, Joomla installations.

### Step 9-21: Specialized Audits
Trading platforms, supply chain, CSP scanning, WordPress plugins, false positive verification, CORS, user enumeration, rate limiting, cookie security, WebSocket, subdomain enhancement.

### Step 22: Final Report
Generates the complete audit report with all findings.

## Advanced Usage

### Custom Step Execution

Run only specific steps for targeted testing:

```bash
# Only security headers
npm run audit -- --target example.com --steps 1

# Subdomain discovery + basic security
npm run audit -- --target example.com --steps 0-1

# CMS and WordPress testing
npm run audit -- --target example.com --steps 8,12,20
```

### Programmatic Usage

```javascript
const { EvidenceManager } = require('web-security-audit/scripts/lib/evidence-manager');
const { ReportGenerator } = require('web-security-audit/scripts/lib/report-generator');
const { enumerateSubdomains } = require('web-security-audit/scripts/lib/subdomain-enumerator');

async function customAudit(domain) {
  const evidence = new EvidenceManager('./audits/custom');
  const report = new ReportGenerator('./audits/custom');

  const subdomains = await enumerateSubdomains(domain);
  console.log(`Found ${subdomains.subdomains.length} subdomains`);

  // ... custom audit logic
}
```

## Troubleshooting

### Proxy Connection Issues

If the proxy is unavailable, the tool automatically degrades to direct connection. Check the `execution.log` for degradation messages.

### Auth Token Expired

If the auth token returns 401, the tool degrades to no-auth mode. Provide a fresh token for authenticated testing.

### Missing PowerShell

Gate verification requires PowerShell 5.1+. On non-Windows systems, use `--skip-gate` to bypass (not recommended for production audits).

### Large Target Sites

For sites with many subdomains, the audit may take significant time. Use `--steps` to run specific steps incrementally.