const { httpGet, httpPost } = require('../lib/http-client');
const { EvidenceManager } = require('../lib/evidence-manager');

class APIDeepTester {
  constructor(domain, evidenceDir) {
    this.domain = domain;
    this.evidence = new EvidenceManager(evidenceDir);
    this.results = {
      timestamp: new Date().toISOString(),
      domain,
      endpoints: [],
      vulnerabilities: []
    };
  }

  getCommonEndpoints() {
    return [
      { path: '/api/v1/health', method: 'GET', auth: false },
      { path: '/api/v1/config', method: 'GET', auth: false },
      { path: '/api/v1/users', method: 'GET', auth: true },
      { path: '/api/v1/admin', method: 'GET', auth: true },
      { path: '/actuator', method: 'GET', auth: false },
      { path: '/actuator/health', method: 'GET', auth: false },
      { path: '/actuator/env', method: 'GET', auth: false },
      { path: '/actuator/beans', method: 'GET', auth: false },
      { path: '/actuator/mappings', method: 'GET', auth: false },
      { path: '/debug', method: 'GET', auth: false },
      { path: '/swagger-ui.html', method: 'GET', auth: false },
      { path: '/v1/api-docs', method: 'GET', auth: false },
      { path: '/graphql', method: 'POST', auth: true },
      { path: '/.env', method: 'GET', auth: false },
      { path: '/wp-admin', method: 'GET', auth: false }
    ];
  }

  async testEndpoint(endpoint, authToken = null) {
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    let response;
    if (endpoint.method === 'GET') {
      response = await httpGet(this.domain, endpoint.path, { headers });
    } else {
      response = await httpPost(this.domain, endpoint.path, {}, { headers });
    }

    const result = {
      endpoint: endpoint.path,
      method: endpoint.method,
      status: response.status,
      bodyLength: response.bodyLength,
      authRequired: endpoint.auth,
      accessible: response.status < 400,
      response
    };

    if (result.accessible) {
      const vuln = this.analyzeEndpointVulnerability(endpoint, response);
      if (vuln) {
        result.vulnerability = vuln;
        this.results.vulnerabilities.push(vuln);
        
        this.evidence.saveEvidence(
          vuln.type,
          this.domain,
          endpoint.path,
          vuln
        );
      }
    }

    this.results.endpoints.push(result);
    return result;
  }

  analyzeEndpointVulnerability(endpoint, response) {
    if (endpoint.path.includes('actuator') && response.status === 200) {
      return {
        type: 'actuator-exposed',
        severity: 'high',
        endpoint: endpoint.path,
        description: 'Spring Boot Actuator endpoint exposed',
        evidence: `Status: ${response.status}, Body length: ${response.bodyLength}`
      };
    }

    if (endpoint.path === '/debug' && response.status === 200) {
      return {
        type: 'debug-endpoint-exposed',
        severity: 'high',
        endpoint: endpoint.path,
        description: 'Debug endpoint exposed in production',
        evidence: `Status: ${response.status}, Body length: ${response.bodyLength}`
      };
    }

    if (endpoint.path.includes('swagger') && response.status === 200) {
      return {
        type: 'api-docs-exposed',
        severity: 'medium',
        endpoint: endpoint.path,
        description: 'API documentation exposed',
        evidence: `Status: ${response.status}, Body length: ${response.bodyLength}`
      };
    }

    if (endpoint.path === '/.env' && response.status === 200) {
      return {
        type: 'env-file-exposed',
        severity: 'critical',
        endpoint: endpoint.path,
        description: 'Environment file exposed',
        evidence: `Status: ${response.status}, Body length: ${response.bodyLength}`
      };
    }

    if (endpoint.auth && response.status === 200) {
      return {
        type: 'auth-bypass',
        severity: 'critical',
        endpoint: endpoint.path,
        description: 'Authenticated endpoint accessible without proper auth',
        evidence: `Status: ${response.status}, Body length: ${response.bodyLength}`
      };
    }

    return null;
  }

  async testAllEndpoints(authToken = null) {
    console.log(`\n=== Testing ${this.domain} endpoints ===`);
    
    const endpoints = this.getCommonEndpoints();
    
    for (const endpoint of endpoints) {
      console.log(`Testing: ${endpoint.method} ${endpoint.path}`);
      await this.testEndpoint(endpoint, authToken);
      await this.delay(100);
    }

    return this.results;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getResults() {
    return this.results;
  }

  saveResults() {
    return this.evidence.saveJson(
      `api-deep-test-${this.domain}-${Date.now()}.json`,
      this.results
    );
  }
}

module.exports = { APIDeepTester };
