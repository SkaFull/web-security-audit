const https = require('https');
const http = require('http');

const DEFAULT_PROXY = { host: '127.0.0.1', port: 7890 };

function httpRequest(method, hostname, path, options = {}) {
  return new Promise((resolve) => {
    const proxy = options.proxy || DEFAULT_PROXY;
    const port = options.port || 443;
    const headers = {
      'Accept': 'application/json',
      'User-Agent': options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...options.headers
    };

    if (options.body) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const proxyReq = http.request({
      host: proxy.host,
      port: proxy.port,
      method: 'CONNECT',
      path: hostname + ':' + port
    });

    proxyReq.on('connect', (res, socket) => {
      const req = https.request({
        socket,
        method,
        host: hostname,
        path,
        port,
        rejectUnauthorized: false,
        headers
      }, (resp) => {
        let data = '';
        resp.on('data', (chunk) => data += chunk);
        resp.on('end', () => resolve({
          status: resp.statusCode,
          headers: resp.headers,
          body: data,
          bodyLength: data.length
        }));
      });

      req.on('error', (e) => resolve({ error: e.message }));
      req.setTimeout(options.timeout || 15000, () => {
        req.destroy();
        resolve({ error: 'timeout' });
      });

      if (options.body) {req.write(options.body);}
      req.end();
    });

    proxyReq.on('error', (e) => resolve({ error: 'proxy failed: ' + e.message }));
    proxyReq.setTimeout(5000, () => {
      proxyReq.destroy();
      resolve({ error: 'proxy timeout' });
    });
    proxyReq.end();
  });
}

async function httpGet(hostname, path, options = {}) {
  return httpRequest('GET', hostname, path, options);
}

async function httpPost(hostname, path, body, options = {}) {
  return httpRequest('POST', hostname, path, { ...options, body: JSON.stringify(body) });
}

async function httpPut(hostname, path, body, options = {}) {
  return httpRequest('PUT', hostname, path, { ...options, body: JSON.stringify(body) });
}

async function httpDelete(hostname, path, options = {}) {
  return httpRequest('DELETE', hostname, path, options);
}

module.exports = {
  httpRequest,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  DEFAULT_PROXY
};
