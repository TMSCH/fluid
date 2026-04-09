/**
 * Simple CORS proxy for OpenAI API calls from the browser.
 * Routes through the environment's HTTP proxy for egress.
 * Runs on port 3001.
 */
const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = 3001;
const TARGET = 'https://api.openai.com';

// Get the proxy URL from environment
const HTTPS_PROXY = process.env.https_proxy || process.env.HTTPS_PROXY || '';

function makeProxiedRequest(targetUrl, method, headers, body) {
  return new Promise((resolve, reject) => {
    if (HTTPS_PROXY) {
      // Use CONNECT tunnel through the HTTP proxy
      const proxyUrl = new URL(HTTPS_PROXY);
      const proxyReq = http.request({
        hostname: proxyUrl.hostname,
        port: proxyUrl.port,
        method: 'CONNECT',
        path: `${targetUrl.hostname}:443`,
        headers: {
          Host: `${targetUrl.hostname}:443`,
          'Proxy-Authorization': proxyUrl.username
            ? 'Basic ' + Buffer.from(`${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password || '')}`).toString('base64')
            : undefined,
        },
      });

      proxyReq.on('connect', (connectRes, socket) => {
        if (connectRes.statusCode !== 200) {
          reject(new Error(`Proxy CONNECT failed: ${connectRes.statusCode}`));
          socket.destroy();
          return;
        }

        const tlsReq = https.request({
          hostname: targetUrl.hostname,
          port: 443,
          path: targetUrl.pathname + targetUrl.search,
          method: method,
          headers: { ...headers, host: targetUrl.hostname },
          socket: socket,
          agent: false,
        }, resolve);

        tlsReq.on('error', reject);
        if (body) tlsReq.write(body);
        tlsReq.end();
      });

      proxyReq.on('error', reject);
      proxyReq.end();
    } else {
      // Direct HTTPS request (no proxy)
      const req = https.request({
        hostname: targetUrl.hostname,
        port: 443,
        path: targetUrl.pathname + targetUrl.search,
        method: method,
        headers: { ...headers, host: targetUrl.hostname },
      }, resolve);

      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    }
  });
}

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // Collect request body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    const targetUrl = new URL(req.url, TARGET);
    const headers = { ...req.headers };
    delete headers['host'];
    delete headers['connection'];
    delete headers['keep-alive'];
    delete headers['origin'];
    delete headers['referer'];

    const proxyRes = await makeProxiedRequest(targetUrl, req.method, headers, body.length > 0 ? body : null);

    // Forward the response with CORS headers
    const responseHeaders = { ...proxyRes.headers };
    responseHeaders['access-control-allow-origin'] = '*';
    res.writeHead(proxyRes.statusCode, responseHeaders);
    proxyRes.pipe(res);
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`API proxy running on http://localhost:${PORT}`);
  if (HTTPS_PROXY) {
    console.log(`Using egress proxy: ${HTTPS_PROXY.substring(0, 50)}...`);
  }
});
