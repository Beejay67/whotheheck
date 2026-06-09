const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {

  // Serve index.html
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const file = fs.readFileSync(path.join(__dirname, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(file);
    return;
  }

  // Proxy to Anthropic
  if (req.method === 'POST' && req.url === '/api/proxy') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const proxy = https.request(options, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', () => {
          res.writeHead(apiRes.statusCode, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(data);
        });
      });

      proxy.on('error', (e) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      });

      proxy.write(body);
      proxy.end();
    });
    return;
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
