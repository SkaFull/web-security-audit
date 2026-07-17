const { httpPost } = require('../lib/http-client');
const { EvidenceManager } = require('../lib/evidence-manager');

class BruteForceTester {
  constructor(domain, evidenceDir) {
    this.domain = domain;
    this.evidence = new EvidenceManager(evidenceDir);
    this.results = {
      timestamp: new Date().toISOString(),
      domain,
      tests: [],
      vulnerabilities: []
    };
  }

  async testLoginEndpoint(loginPath, credentials) {
    console.log(`\nTesting login endpoint: ${loginPath}`);
    
    const testResults = [];
    
    for (const cred of credentials) {
      const startTime = Date.now();
      
      const response = await httpPost(this.domain, loginPath, {
        username: cred.username,
        password: cred.password
      }, {
        headers: {
          'Origin': `https://${this.domain}`,
          'Referer': `https://${this.domain}/`
        }
      });

      const duration = Date.now() - startTime;
      
      const result = {
        username: cred.username,
        password: cred.password,
        status: response.status,
        duration,
        success: this.isLoginSuccess(response),
        response: response
      };

      testResults.push(result);
      
      if (result.success) {
        const vuln = {
          type: 'brute-force-success',
          severity: 'critical',
          username: cred.username,
          password: cred.password,
          evidence: JSON.stringify(response, null, 2)
        };
        this.results.vulnerabilities.push(vuln);
        
        this.evidence.saveEvidence(
          'brute-force-success',
          this.domain,
          loginPath,
          vuln
        );
      }

      await this.delay(100);
    }

    this.results.tests.push({
      endpoint: loginPath,
      totalAttempts: credentials.length,
      successfulLogins: testResults.filter(r => r.success).length,
      avgResponseTime: testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length
    });

    return testResults;
  }

  isLoginSuccess(response) {
    if (response.status === 200 && response.body) {
      try {
        const body = JSON.parse(response.body);
        return body.token || body.accessToken || body.success === true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  async testRateLimiting(loginPath, attempts = 10) {
    console.log(`\nTesting rate limiting with ${attempts} rapid attempts`);
    
    const results = [];
    const startTime = Date.now();
    
    for (let i = 0; i < attempts; i++) {
      const response = await httpPost(this.domain, loginPath, {
        username: `test${i}`,
        password: 'wrongpass'
      });
      
      results.push({
        attempt: i + 1,
        status: response.status,
        blocked: response.status === 429 || response.status === 403
      });
    }

    const duration = Date.now() - startTime;
    const blockedCount = results.filter(r => r.blocked).length;
    
    const rateLimitResult = {
      endpoint: loginPath,
      attempts,
      blocked: blockedCount,
      duration,
      hasRateLimiting: blockedCount > 0
    };

    if (!rateLimitResult.hasRateLimiting) {
      this.results.vulnerabilities.push({
        type: 'no-rate-limiting',
        severity: 'high',
        endpoint: loginPath,
        evidence: `${attempts} attempts in ${duration}ms with no blocking`
      });
    }

    return rateLimitResult;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getResults() {
    return this.results;
  }

  saveResults() {
    return this.evidence.saveJson(
      `brute-force-test-${this.domain}-${Date.now()}.json`,
      this.results
    );
  }
}

module.exports = { BruteForceTester };
