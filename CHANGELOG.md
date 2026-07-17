# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-17

### Added
- Initial release of Web Security Audit tool
- 23-step systematic audit methodology (step 0-22)
- Gate-driven execution system with mandatory verification
- 20+ subdomain enumeration methods (CT logs, DNS brute-force, SSL certs, JS extraction)
- 600+ total test items across all audit steps
- HTTP security headers audit (CSP, HSTS, XFO, XCTO, Referrer-Policy, etc.)
- SSL/TLS configuration audit (certificate validation, cipher suites, TLS versions)
- Advanced security testing (authentication, API endpoints, infrastructure exposure)
- Specialized vulnerability testing (SQL injection, XSS, SSRF, command injection, XXE, SSTI)
- Open redirect detection (20+ payload variants, multiple parameter names)
- HTTP method enumeration and rate limiting tests
- Per-subdomain deep audit (215+ tests per subdomain)
- Application layer auditing (JS Bundle reverse engineering, config file analysis)
- CMS-specific testing (WordPress, Drupal, Joomla)
- Trading/payment platform specialized audit
- Supply chain security audit (third-party scripts, SRI)
- CSP internal domain scanning
- WordPress plugin/theme vulnerability scanning
- False positive verification mechanism
- Per-domain CORS depth testing (with credentials)
- Response body deep information extraction
- Authentication endpoint user enumeration
- Per-endpoint rate limiting tests
- Per-domain cookie security audit
- WebSocket endpoint discovery and security testing
- WordPress deep scanning (timthumb, wpscan patterns)
- Enhanced subdomain enumeration (10 additional methods)
- Final report generation with CVSS, CWE, OWASP mapping, compliance analysis
- Cross-step feedback mechanism (new domain discovery triggers re-audit)
- Six-level degradation strategy (auth+proxy → auth+direct → no-auth+proxy → no-auth+direct → WebFetch → offline)
- Execution log mechanism (execution.log) for anti-skip verification
- Step commit mechanism (step-commit.json) for non-repudiation
- Evidence manager for audit evidence collection
- Markdown/JSON dual-format report generation
- CLI tools: ssl-cert-checker, ct-log-scanner, api-security-tester, jwt-forgery-tester, brute-force-tester
- 4 output templates (final-report, vuln-detail, positive-findings, audit-state)