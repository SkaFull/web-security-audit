const fs = require('fs');
const path = require('path');

class EvidenceManager {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.ensureDir(baseDir);
  }

  ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  generateTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }

  generateFilename(type, domain, endpoint) {
    const timestamp = this.generateTimestamp();
    const safeDomain = domain.replace(/[^\w.-]/g, '_');
    const safeEndpoint = endpoint.replace(/[^\w.-]/g, '_').substring(0, 50);
    return `${type}-${safeDomain}-${safeEndpoint}-${timestamp}.json`;
  }

  saveEvidence(type, domain, endpoint, data) {
    const filename = this.generateFilename(type, domain, endpoint);
    const filepath = path.join(this.baseDir, filename);

    const evidence = {
      timestamp: new Date().toISOString(),
      type,
      domain,
      endpoint,
      ...data
    };

    fs.writeFileSync(filepath, JSON.stringify(evidence, null, 2), 'utf-8');
    return filepath;
  }

  saveJson(filename, data) {
    const filepath = path.join(this.baseDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    return filepath;
  }

  saveText(filename, content) {
    const filepath = path.join(this.baseDir, filename);
    fs.writeFileSync(filepath, content, 'utf-8');
    return filepath;
  }

  loadJson(filename) {
    const filepath = path.join(this.baseDir, filename);
    if (!fs.existsSync(filepath)) {return null;}
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  }

  listFiles(pattern = '*') {
    const files = fs.readdirSync(this.baseDir);
    if (pattern === '*') {return files;}

    const regex = new RegExp(pattern.replace('*', '.*'));
    return files.filter(f => regex.test(f));
  }

  getSubdir(subdir) {
    const dir = path.join(this.baseDir, subdir);
    this.ensureDir(dir);
    return new EvidenceManager(dir);
  }
}

module.exports = { EvidenceManager };
