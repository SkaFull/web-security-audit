# Web Security Audit

[English](README.md) | [简体中文](README.zh-CN.md) | [香港繁體](README.zh-HK.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> Universal web security audit tool with systematic per-domain scanning, covering **600+ test items** across **23 audit steps**.

## Overview

Web Security Audit is a comprehensive, systematic web security auditing tool designed for security professionals and penetration testers. It employs a **gate-driven per-domain scanning methodology** to ensure 100% test coverage and zero omissions.

Unlike traditional scanners that batch-scan all domains at once, this tool systematically audits **one domain at a time** through 23 sequential steps, each verified by a mandatory gate check before proceeding.

### Key Features

- **23-step systematic audit** from subdomain enumeration to final report generation
- **600+ test items** covering security headers, SSL/TLS, API endpoints, CMS, WebSocket, authentication, and more
- **Gate-driven execution** with mandatory verification at each step (PowerShell scripts)
- **Per-domain deep audit** (215+ tests per subdomain)
- **Cross-step feedback** mechanism - later discoveries trigger re-audit of earlier steps
- **Six-level degradation strategy** for reliable execution in various network conditions
- **Dual-format output** (JSON + Markdown) with full evidence collection
- **CVSS v3.1, CWE, OWASP Top 10** mapping in final reports
- **Compliance analysis** (PCI DSS, ISO 27001, GDPR)

## Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **PowerShell** 5.1+ (for gate verification scripts, Windows only)
- **curl** (for HTTP testing)

### Installation

```bash
git clone https://github.com/SkaFull/web-security-audit.git
cd web-security-audit
npm install
```

### Basic Usage

```bash
# Run the full audit pipeline
npm run audit -- --target example.com

# Or use the CLI directly
node bin/cli.js --target example.com

# With authentication token and proxy
node bin/cli.js --target example.com --auth-token eyJhbG... --proxy 127.0.0.1:7890
```

### Individual Tool Usage

```bash
# SSL certificate checker
npm run ssl-check -- example.com test.com

# CT log scanner
npm run ct-scan -- example.com

# API security tester
npm run api-test -- example.com [auth-token]

# JWT forgery tester
npm run jwt-test -- example.com eyJhbG...

# Brute force tester
npm run brute-test -- example.com /api/login
```

## AI Assistant Integration

This Skill is natively designed for AI coding assistants. Drop it into your tool and start auditing with a single prompt — no CLI setup required.

### Trae IDE

Copy the skill folder into Trae's skills directory and invoke directly:

```
.skills/
└── web-security-audit/    # Copy this entire folder here
```

Then in Trae, simply say:

> "Audit https://www.example.com with authToken eyJhbG... and proxy 127.0.0.1:7890"

The Skill auto-executes all 23 steps, no manual intervention needed.

### Claude Code

Register as a custom slash command in `.claude/skills/`:

```bash
cp -r web-security-audit .claude/skills/
```

Then use in Claude Code:

```
/skill:web-security-audit Audit https://www.example.com
```

Or add to `CLAUDE.md` as a project instruction:

```markdown
# CLAUDE.md
- When user asks for security audit, invoke the web-security-audit skill
- Target: ${USER_INPUT_DOMAIN}
- Auth: ${USER_INPUT_TOKEN}
```

### Codex (OpenAI)

Use as a custom instruction in Codex or via OpenAI Agents SDK:

```javascript
// agents.config.js
import { webSecurityAudit } from './skills/web-security-audit';
// Or drop the skill folder into your Codex workspace
```

Then prompt:

> "Run web-security-audit skill on https://www.example.com"

### Cursor

Add to `.cursorrules`:

```markdown
## Security Audit Skill
When I ask to audit a domain, use the web-security-audit skill at:
.skills/web-security-audit/

Execute all 23 steps automatically. Do not skip any step.
```

Then prompt:

> "Audit https://www.example.com"

### Claw

Place the skill in `~/.claw/skills/` or the project's `.claw/skills/`:

```bash
mkdir -p .claw/skills
cp -r web-security-audit .claw/skills/
```

### GitHub Copilot

Add to `.github/copilot-instructions.md`:

```markdown
## Security Audit
When user requests a security audit, load and execute the web-security-audit
skill from .skills/web-security-audit/MAIN.md. Follow all 23 steps.
```

### Quick Prompt Template

No matter which tool you use, the prompt format is the same:

```
Audit https://<target-domain> [with authToken <jwt>] [and proxy <host:port>]
```

Examples:

```
Audit https://www.example.com
Audit https://www.example.com with authToken eyJhbGciOiJFUzI1NiJ9... and proxy 127.0.0.1:7890
```

## Architecture

```
web-security-audit/
├── bin/
│   └── cli.js                 # CLI entry point
├── scripts/
│   ├── lib/                   # Core library modules
│   │   ├── evidence-manager.js    # Evidence collection & storage
│   │   ├── http-client.js         # HTTP client with proxy support
│   │   ├── report-generator.js    # PDF/JSON/Markdown report generation
│   │   ├── ssl-checker.js         # SSL/TLS certificate validation
│   │   └── subdomain-enumerator.js # CT log & DNS enumeration
│   ├── methods/               # Audit method implementations
│   │   ├── api-deep-test.js       # API endpoint testing
│   │   ├── brute-force-test.js    # Brute force testing
│   │   ├── jwt-forgery-test.js    # JWT vulnerability testing
│   │   └── ssrf-test.js           # SSRF vulnerability testing
│   ├── api-security-tester.js # API security test entry
│   ├── brute-force-tester.js  # Brute force test entry
│   ├── ct-log-scanner.js      # CT log scan entry
│   ├── jwt-forgery-tester.js  # JWT forgery test entry
│   └── ssl-cert-checker.js    # SSL certificate check entry
├── steps/                     # Step definition files (Markdown)
│   ├── step-00.md ~ step-22.md
├── templates/                 # Output templates
│   ├── final-report.md
│   ├── vuln-detail.md
│   ├── positive-findings.md
│   └── audit-state-template.json
├── docs/                      # Documentation
├── MAIN.md                    # Full execution flow reference
├── SKILL.md                   # Core principles and enforcement
└── README.md
```

## Audit Steps

### Phase 1: Reconnaissance (Step 0)

**Step 0 — Subdomain Enumeration** (20 methods)
Discover all subdomains and related domain systems using 20 enumeration methods: CT log transparency, DNS brute-force, SSL certificate parsing, JS source extraction, reverse DNS, search engine dorking, and more. Also identifies independent domain systems (e.g., `example-group.com`, `example-sandbox.com`) that are related to the target but on different apex domains. Outputs complete subdomain inventory with accessibility status.

### Phase 2: Core Security (Steps 1-5)

**Step 1 — Basic Security Headers** (100+ tests)
Comprehensive audit of HTTP security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CORS headers, cookie security attributes (Secure, HttpOnly, SameSite), SSL/TLS configuration, server info leakage, and more. Each missing or misconfigured header is flagged with CVSS scoring.

**Step 2 — Advanced Security** (60+ tests)
Deep dive into authentication mechanisms, API endpoint discovery, infrastructure exposure (`.git/`, `.env`, backup files, admin panels), file upload endpoints, error page information leakage, and internal service exposure. Tests for common misconfigurations that expose sensitive internal resources.

**Step 3 — Specialized Vulnerability Testing** (50+ tests)
Active vulnerability probes for SQL injection, XSS (reflected/stored/DOM), SSRF, command injection, XXE, SSTI, path traversal, and LDAP injection. Each test uses multiple payload variants and bypass techniques. Includes WAF/IDS evasion patterns.

**Step 4 — Open Redirect Detection** (25 tests)
Tests all discovered URL parameters and paths with 20+ redirect payload variants: protocol-relative, double-encoding, parameter pollution, CRLF injection, and common bypass techniques. Each parameter is tested individually with evidence capture.

**Step 5 — HTTP Methods & Rate Limits** (40 tests)
Enumerates allowed HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS, TRACE, CONNECT), tests for dangerous method exposure, rate limiting on authentication endpoints, and brute-force protection assessment. Identifies over-permissive method configurations.

### Phase 3: Deep Audit (Steps 6-14)

**Step 6 — Subdomain Deep Audit** (215+ tests per subdomain)
Re-runs the complete Step 1-5 audit pipeline on every accessible subdomain discovered in Step 0. Each subdomain gets a full 215+ test battery. Results are compared across subdomains to identify systemic weaknesses and configuration drift.

**Step 7 — Application Layer Deep Audit** (50+ tests)
JavaScript bundle reverse engineering: extracts API endpoints, internal paths, feature flags, and hardcoded credentials from JS source maps and bundles. Config file discovery (`.env`, `config.json`, `settings.yml`), WebSocket endpoint discovery, and GraphQL introspection testing.

**Step 8 — CMS Audit** (40+ tests)
Detects and tests CMS platforms (WordPress, Drupal, Joomla, Magento, Shopify). Identifies version, theme, plugin exposure, default admin paths, REST API exposure, XML-RPC, and CMS-specific vulnerabilities. Tests for known CMS misconfigurations.

**Step 9 — Trading/Platform Audit** (40 tests)
Specialized tests for trading, payment, and financial platforms. Covers trading API security, payment gateway integration, KYC endpoint security, account security (2FA, session management, password policies), and financial transaction integrity.

**Step 10 — Supply Chain Security** (25 tests)
Audits third-party scripts, CDN dependencies, and SDK integrations. Checks Subresource Integrity (SRI) hashes, outdated library versions, known-vulnerable dependencies, and external script loading from untrusted sources.

**Step 11 — CSP Deep Scan** (30 tests)
Extracts and analyzes Content-Security-Policy headers across all domains. Identifies internal domains leaked in CSP directives, tests for CSP bypass risks (unsafe-inline, unsafe-eval, wildcard sources), and maps the full CSP trust chain.

**Step 12 — WordPress Plugin Scanning** (25 tests)
Enumerates WordPress plugins and themes via common paths, readme files, and version fingerprints. Cross-references discovered versions against known CVE databases. Tests for vulnerable plugin endpoints and unauthenticated access.

**Step 13 — False Positive Verification** (20 tests)
Validates all previous findings to eliminate false positives. Checks WAF/CDN interference, confirms redirect chains, verifies wildcard DNS resolution, and distinguishes genuine vulnerabilities from environmental artifacts. Ensures report accuracy.

**Step 14 — CORS Deep Testing** (25 tests per domain)
Per-domain CORS configuration testing with credentials. Tests for `Access-Control-Allow-Origin` reflection, null origin bypass, subdomain trust exploitation, and preflight request handling. Each domain is tested independently with multiple origin values.

### Phase 4: Specialized Tests (Steps 15-21)

**Step 15 — Response Body Analysis** (30 tests)
Deep extraction from response bodies: email addresses, internal IPs, AWS keys, API tokens, database connection strings, debug information, stack traces, and other sensitive data inadvertently exposed in HTML/JSON responses.

**Step 16 — User Enumeration** (20 tests)
Tests authentication endpoints for user enumeration vulnerabilities. Checks login forms, password reset flows, registration pages, and API endpoints for differential responses that reveal valid usernames. Tests timing-based and response-based enumeration vectors.

**Step 17 — Rate Limit Testing** (15 tests)
Per-endpoint rate limiting assessment. Tests each authentication-related endpoint with burst requests, identifies rate limit thresholds, tests bypass techniques (header manipulation, IP rotation simulation), and evaluates lockout policies.

**Step 18 — Cookie Security Audit** (15 tests)
Per-domain comprehensive cookie audit: Secure flag, HttpOnly flag, SameSite policy, Domain/Path scope, expiration, session fixation resistance, and cookie injection points. Tests for cookie tampering and session hijacking vectors.

**Step 19 — WebSocket Security** (15 tests)
Discovers WebSocket endpoints, tests authentication requirements, checks for Cross-Site WebSocket Hijacking (CSWSH), validates origin checking, and tests for message injection and DoS via WebSocket frames.

**Step 20 — WordPress Deep Scan** (20 tests)
Advanced WordPress testing: timthumb vulnerability scanning, wpscan pattern matching, database backup exposure, debug log access, and known WordPress core/plugin exploit verification.

**Step 21 — Subdomain Enhancement** (10 additional methods)
Supplementary enumeration using the data gathered in all previous steps. Leverages discovered internal domains, CSP entries, JS bundle references, and API responses to uncover previously hidden subdomains and attack surface.

### Phase 5: Reporting (Step 22)

**Step 22 — Final Report Generation**
Compiles all findings into a comprehensive report with CVSS v3.1 scoring, CWE mapping, OWASP Top 10 categorization, and compliance analysis (PCI DSS, ISO 27001, GDPR). Generates dual-format output (JSON + Markdown) with executive summary, technical details, evidence references, and remediation recommendations.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PROXY_HOST` | HTTP proxy host | `127.0.0.1` |
| `PROXY_PORT` | HTTP proxy port | `7890` |
| `AUTH_TOKEN` | Authentication token for auth-required tests | - |
| `TIMEOUT` | HTTP request timeout (ms) | `15000` |
| `RETRY_COUNT` | Max retries for failed tests | `3` |

### CLI Options

```
Usage: web-security-audit [options]

Options:
  --target <domain>      Target domain to audit (required)
  --auth-token <token>   Authentication token for auth-required tests
                          (JWT / Bearer / API Key / session cookie)
  --proxy <host:port>    Proxy address (default: 127.0.0.1:7890)
  --output <dir>         Output directory (default: ./audits)
  --steps <range>        Step range to run (e.g., "0-5" or "1,3,5")
  --skip-gate            Skip gate verification (not recommended)
  --help                 Show help
```

> **Note on `--auth-token`**: This is a generic parameter name. The actual token type and header name varies per website. Common examples:
> - `Authorization: Bearer <jwt>` (most APIs)
> - `X-Auth-Token: <token>` (some platforms)
> - `Cookie: session=<value>` (web apps)
> - `X-API-Key: <key>` (API services)
>
> The tool uses the token you provide and attaches it according to the detected auth scheme of the target site. If you're unsure, check the website's authenticated request headers in your browser's DevTools.

## Output Structure

```
audits/<domain>/
├── audit-progress.json
├── step-00-subdomain-discovery/
│   ├── subdomains.json
│   ├── subdomains.md
│   ├── related-domains.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/execution.log
│   └── step-commit.json
├── step-01-basic-security/
│   ├── basic-security.json
│   ├── basic-security.md
│   ├── vulnerabilities.json
│   ├── evidence/
│   ├── logs/execution.log
│   └── step-commit.json
├── ... (steps 2-21)
└── step-22-final-report/
    ├── final-report.json
    ├── final-report.md
    └── vulnerabilities.json
```

## Documentation

- [Full Execution Flow](MAIN.md) - Detailed step-by-step with gate verification scripts
- [Core Principles](SKILL.md) - Enforcement protocols, degradation strategy, evidence requirements
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Security Policy](SECURITY.md) - Vulnerability reporting
- [Code of Conduct](CODE_OF_CONDUCT.md) - Community standards
- [Changelog](CHANGELOG.md) - Version history

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

This tool is designed for **authorized security testing only**. Always obtain written permission before testing any target.

For security vulnerability reports, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © 2026 OLS Security Audit Contributors