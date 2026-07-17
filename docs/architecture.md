# Architecture

## System Overview

Web Security Audit follows a **pipeline-based architecture** with gate-driven sequential execution. Each step is an independent unit that produces specific outputs and must pass a verification gate before the next step begins.

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Entry (bin/cli.js)                   │
├─────────────────────────────────────────────────────────────┤
│  Parse Args → Init State → Step Loop → Final Report          │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Step 0      │  │   Step 1      │  │   Step 22     │
│ Subdomain     │─▶│ Basic         │─▶│  ...    ─────▶│ Final Report  │
│ Enumeration   │  │ Security      │  │               │
└───────────────┘  └───────────────┘  └───────────────┘
        │                  │                  │
        ▼                  ▼                  ▼
   ┌─────────┐       ┌─────────┐       ┌─────────┐
   │ Gate 0  │       │ Gate 1  │       │ Gate 22 │
   │ Verify  │       │ Verify  │       │ Verify  │
   └─────────┘       └─────────┘       └─────────┘
```

## Core Modules

### 1. Evidence Manager (`scripts/lib/evidence-manager.js`)

Manages all evidence collection, file storage, and retrieval.

```
EvidenceManager
├── saveEvidence(type, domain, endpoint, data) → filepath
├── saveJson(filename, data) → filepath
├── saveText(filename, content) → filepath
├── loadJson(filename) → data | null
├── listFiles(pattern) → string[]
└── getSubdir(subdir) → EvidenceManager
```

### 2. HTTP Client (`scripts/lib/http-client.js`)

HTTP client with proxy support and timeout handling.

```
httpGet(hostname, path, options) → { status, headers, body, bodyLength }
httpPost(hostname, path, body, options) → { status, headers, body, bodyLength }
httpRequest(method, hostname, path, options) → { status, headers, body, bodyLength }
```

### 3. Report Generator (`scripts/lib/report-generator.js`)

Generates Markdown and JSON reports from audit findings.

```
ReportGenerator
├── generateMarkdownReport(title, sections) → string
├── generateTable(headers, rows) → string
├── generateVulnerabilityReport(vuln) → string
├── generateSummaryReport(findings) → string
├── saveReport(filename, content) → filepath
└── saveJsonReport(filename, data) → filepath
```

### 4. SSL Checker (`scripts/lib/ssl-checker.js`)

SSL/TLS certificate validation and CAA record checking.

```
checkSSL(domain) → { domain, caa, certificate }
checkCAARecords(domain) → { status, records }
checkSSLCertificate(domain, port) → { status, issuer, daysRemaining, ... }
```

### 5. Subdomain Enumerator (`scripts/lib/subdomain-enumerator.js`)

Certificate Transparency log querying and subdomain extraction.

```
enumerateSubdomains(domain) → { subdomains, sensitiveSubdomains, ... }
queryCTLog(domain) → certs[]
extractSubdomains(certs) → { subdomains, issuers }
analyzeSensitiveSubdomains(subdomains) → string[]
```

## Execution Flow

### Step Lifecycle

```
1. Step Start
   ├── Create step output directory
   ├── Create logs/ and evidence/ subdirectories
   └── Log start timestamp

2. Step Execution
   ├── Load step definition from steps/step-XX.md
   ├── Execute all test items for the step
   ├── Collect HTTP responses
   └── Save evidence files

3. Gate Verification
   ├── Check required output files exist
   ├── Verify coverage.json = 100%
   ├── Verify evidence/ has files
   ├── Verify execution.log has content
   ├── Verify step-commit.json
   └── Output: PASS or FAIL

4. Step Complete
   ├── If gate PASS → proceed to next step
   └── If gate FAIL → retry missing items → re-verify
```

### Cross-Step Feedback

Later steps may discover new information that triggers re-audit of earlier steps:

```
Step 0 (Subdomain Enumeration)
  └── Method 16: Internal service probing → new subdomains → added to list

Step 7 (App Layer)
  └── AD-06: JS Bundle domain extraction → new domains → Step 0 re-audit

Step 8 (CMS Audit)
  └── Config file discovery → new domains → Step 0 re-audit
```

## Degradation Strategy

The tool implements a six-level degradation strategy for resilience:

| Level | Strategy | Condition |
|-------|----------|-----------|
| 1 | Auth + Proxy | Both available |
| 2 | Auth + Direct | Proxy unavailable |
| 3 | No Auth + Proxy | Auth token expired |
| 4 | No Auth + Direct | Both unavailable |
| 5 | WebFetch | curl/PowerShell fails |
| 6 | Offline Analysis | All connections fail |

## Output Structure

Each audit produces a directory tree under `audits/<domain>/`:

```
audits/<domain>/
├── audit-progress.json          # Overall progress
├── step-00-subdomain-discovery/
│   ├── subdomains.json          # Full subdomain list
│   ├── subdomains.md            # Markdown format
│   ├── related-domains.json     # Related domain systems
│   ├── progress.json            # Step progress
│   ├── coverage.json            # Test coverage (must be 100%)
│   ├── vulnerabilities.json     # Found vulnerabilities
│   ├── step-commit.json         # Non-repudiation proof
│   ├── logs/execution.log       # All HTTP requests
│   └── evidence/                # Evidence files
├── step-01-basic-security/
│   └── ... (same structure)
└── step-22-final-report/
    ├── final-report.json
    ├── final-report.md
    └── vulnerabilities.json
```

## Adding a New Audit Step

1. Create `steps/step-XX.md` with:
   - Required output files table
   - Test items (categorized)
   - Execution method (bash/PowerShell commands)
   - Gate verification script
   - Execution checklist

2. Register in `MAIN.md`:
   - Add to execution flow diagram
   - Add to directory structure
   - Add to step overview table

3. Register in `SKILL.md`:
   - Add to step index table
   - Add to step file index

4. Implement in `bin/cli.js` if programmatic execution is needed