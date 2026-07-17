# Security Policy

## Reporting a Vulnerability

**Do not report security vulnerabilities in public GitHub issues.**

If you discover a security vulnerability in this project, please report it responsibly:

1. **Email**: Send details to security@skaful.com
2. **Encryption**: Use our PGP key if available
3. **Include**: 
   - Description of the vulnerability
   - Steps to reproduce
   - Impact assessment
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Triage**: Within 5 business days
- **Fix**: Depends on severity:
  - Critical: 24-72 hours
  - High: 1 week
  - Medium: 2 weeks
  - Low: Next release cycle

## Disclosure Policy

- We follow coordinated vulnerability disclosure
- Credit will be given to the reporter (unless anonymity is requested)
- CVE assignment will be pursued for critical vulnerabilities

## Scope

This security policy covers:
- The `web-security-audit` tool code
- The `scripts/` modules
- The `bin/cli.js` entry point

This policy does NOT cover:
- Third-party dependencies (report those to the respective maintainers)
- Example audit reports in the repository

## Safe Usage

This tool is designed for authorized security testing only. Always:
- Obtain written permission before testing any target
- Follow the target's responsible disclosure policy
- Do not use this tool for unauthorized access

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |