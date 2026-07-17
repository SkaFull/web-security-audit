const { enumerateSubdomains } = require('../scripts/lib/subdomain-enumerator');

describe('subdomain-enumerator', () => {
  test('extractSubdomains handles empty certs array', () => {
    const { extractSubdomains } = require('../scripts/lib/subdomain-enumerator');
    const result = extractSubdomains([]);
    expect(result.subdomains).toEqual([]);
    expect(result.issuers).toEqual([]);
  });

  test('extractSubdomains deduplicates names', () => {
    const { extractSubdomains } = require('../scripts/lib/subdomain-enumerator');
    const certs = [
      { name_value: 'a.example.com\nb.example.com', issuer_name: 'CA1' },
      { name_value: 'a.example.com\nc.example.com', issuer_name: 'CA1' }
    ];
    const result = extractSubdomains(certs);
    expect(result.subdomains).toHaveLength(3);
    expect(result.subdomains).toContain('a.example.com');
    expect(result.subdomains).toContain('b.example.com');
    expect(result.subdomains).toContain('c.example.com');
  });

  test('extractSubdomains strips wildcard prefix', () => {
    const { extractSubdomains } = require('../scripts/lib/subdomain-enumerator');
    const certs = [
      { name_value: '*.example.com', issuer_name: 'CA1' }
    ];
    const result = extractSubdomains(certs);
    expect(result.subdomains).toContain('example.com');
  });

  test('analyzeSensitiveSubdomains identifies sensitive subdomains', () => {
    const { analyzeSensitiveSubdomains } = require('../scripts/lib/subdomain-enumerator');
    const subdomains = [
      'admin.example.com',
      'www.example.com',
      'api.example.com',
      'grafana.internal.example.com',
      'blog.example.com',
      'dev.example.com'
    ];

    const result = analyzeSensitiveSubdomains(subdomains);
    expect(result).toContain('admin.example.com');
    expect(result).toContain('api.example.com');
    expect(result).toContain('grafana.internal.example.com');
    expect(result).toContain('dev.example.com');
    expect(result).not.toContain('www.example.com');
    expect(result).not.toContain('blog.example.com');
  });
});