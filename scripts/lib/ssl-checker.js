const https = require('https');
const net = require('net');
const { httpGet } = require('./http-client');

async function checkCAARecords(domain) {
  try {
    const result = await httpGet('dns.google', `/resolve?name=${domain}&type=CAA`);

    if (result.error) {
      return { status: 'ERROR', error: result.error, records: [] };
    }

    const data = JSON.parse(result.body);

    if (data.Answer && data.Answer.length > 0) {
      return {
        status: 'PRESENT',
        records: data.Answer.map(r => r.data),
        raw: data
      };
    } else {
      return { status: 'MISSING', records: [] };
    }
  } catch (e) {
    return { status: 'ERROR', error: e.message, records: [] };
  }
}

async function checkSSLCertificate(domain, port = 443) {
  return new Promise((resolve) => {
    const socket = net.connect(port, domain, () => {
      const tlsSocket = new require('tls').TLSSocket(socket, {
        isServer: false,
        rejectUnauthorized: false
      });

      tlsSocket.on('secureConnect', () => {
        const cert = tlsSocket.getPeerCertificate();

        if (!cert || !cert.valid_from) {
          tlsSocket.destroy();
          resolve({ status: 'ERROR', error: 'No certificate' });
          return;
        }

        const notBefore = new Date(cert.valid_from);
        const notAfter = new Date(cert.valid_to);
        const daysRemaining = Math.floor((notAfter - new Date()) / (1000 * 60 * 60 * 24));

        let status = 'VALID';
        if (daysRemaining < 0) {
          status = 'EXPIRED';
        } else if (daysRemaining < 30) {
          status = 'EXPIRING_SOON';
        }

        tlsSocket.destroy();
        resolve({
          status,
          subject: cert.subject?.CN || cert.subject?.O || 'Unknown',
          issuer: cert.issuer?.CN || cert.issuer?.O || 'Unknown',
          validFrom: notBefore.toISOString(),
          validTo: notAfter.toISOString(),
          daysRemaining,
          serialNumber: cert.serialNumber,
          fingerprint: cert.fingerprint,
          subjectAltNames: cert.subjectaltname,
          raw: cert
        });
      });

      tlsSocket.on('error', (e) => {
        socket.destroy();
        resolve({ status: 'ERROR', error: e.message });
      });

      tlsSocket.setTimeout(10000, () => {
        tlsSocket.destroy();
        resolve({ status: 'ERROR', error: 'timeout' });
      });
    });

    socket.on('error', (e) => {
      resolve({ status: 'ERROR', error: e.message });
    });

    socket.setTimeout(10000, () => {
      socket.destroy();
      resolve({ status: 'ERROR', error: 'timeout' });
    });
  });
}

async function checkSSL(domain) {
  console.log(`\n=== Checking SSL for ${domain} ===`);

  const [caa, cert] = await Promise.all([
    checkCAARecords(domain),
    checkSSLCertificate(domain)
  ]);

  console.log(`CAA Records: ${caa.status}`);
  if (caa.records.length > 0) {
    caa.records.forEach(r => console.log(`  - ${r}`));
  }

  console.log(`SSL Certificate: ${cert.status}`);
  if (cert.status === 'VALID' || cert.status === 'EXPIRING_SOON') {
    console.log(`  Subject: ${cert.subject}`);
    console.log(`  Issuer: ${cert.issuer}`);
    console.log(`  Valid: ${cert.validFrom} to ${cert.validTo}`);
    console.log(`  Days remaining: ${cert.daysRemaining}`);
  }

  return {
    domain,
    caa,
    certificate: cert,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  checkCAARecords,
  checkSSLCertificate,
  checkSSL
};
