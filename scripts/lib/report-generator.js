const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor(outputDir) {
    this.outputDir = outputDir;
    this.ensureDir(outputDir);
  }

  ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  generateTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }

  generateMarkdownReport(title, sections) {
    let md = `# ${title}\n\n`;
    md += `**Generated:** ${new Date().toISOString()}\n\n`;
    md += '---\n\n';

    sections.forEach(section => {
      md += `## ${section.title}\n\n`;

      if (section.content) {
        md += `${section.content}\n\n`;
      }

      if (section.table) {
        md += this.generateTable(section.table.headers, section.table.rows);
        md += '\n';
      }

      if (section.list) {
        section.list.forEach(item => {
          md += `- ${item}\n`;
        });
        md += '\n';
      }
    });

    return md;
  }

  generateTable(headers, rows) {
    let table = `| ${headers.join(' | ')} |\n`;
    table += `| ${headers.map(() => '---').join(' | ')} |\n`;

    rows.forEach(row => {
      table += `| ${row.join(' | ')} |\n`;
    });

    return table;
  }

  generateVulnerabilityReport(vuln) {
    const sections = [
      {
        title: 'Overview',
        table: {
          headers: ['Field', 'Value'],
          rows: [
            ['Title', vuln.title],
            ['Severity', vuln.severity],
            ['Category', vuln.category],
            ['Domain', vuln.domain],
            ['Endpoint', vuln.endpoint]
          ]
        }
      },
      {
        title: 'Description',
        content: vuln.description
      },
      {
        title: 'Evidence',
        content: vuln.evidence
      },
      {
        title: 'Impact',
        content: vuln.impact
      },
      {
        title: 'Remediation',
        content: vuln.remediation
      }
    ];

    return this.generateMarkdownReport(vuln.title, sections);
  }

  generateSummaryReport(findings) {
    const sections = [
      {
        title: 'Summary Statistics',
        table: {
          headers: ['Severity', 'Count'],
          rows: [
            ['Critical', findings.filter(f => f.severity === 'critical').length.toString()],
            ['High', findings.filter(f => f.severity === 'high').length.toString()],
            ['Medium', findings.filter(f => f.severity === 'medium').length.toString()],
            ['Low', findings.filter(f => f.severity === 'low').length.toString()],
            ['Info', findings.filter(f => f.severity === 'info').length.toString()],
            ['Total', findings.length.toString()]
          ]
        }
      },
      {
        title: 'Findings by Category',
        table: {
          headers: ['Category', 'Count'],
          rows: Object.entries(
            findings.reduce((acc, f) => {
              acc[f.category] = (acc[f.category] || 0) + 1;
              return acc;
            }, {})
          ).map(([cat, count]) => [cat, count.toString()])
        }
      },
      {
        title: 'All Findings',
        list: findings.map(f => `[${f.severity.toUpperCase()}] ${f.title} - ${f.domain}${f.endpoint}`)
      }
    ];

    return this.generateMarkdownReport('Security Audit Summary', sections);
  }

  saveReport(filename, content) {
    const filepath = path.join(this.outputDir, filename);
    fs.writeFileSync(filepath, content, 'utf-8');
    return filepath;
  }

  saveJsonReport(filename, data) {
    const filepath = path.join(this.outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    return filepath;
  }
}

module.exports = { ReportGenerator };
