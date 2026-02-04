const http = require('http');
const crypto = require('crypto');

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const payloadObj = { userId: '691361579417075846', license: '', exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600 };
const payload = b64url(JSON.stringify(payloadObj));
const secret = 'autosecure-license-key-secret-2024';
const signature = crypto.createHmac('sha256', secret).update(header + '.' + payload).digest('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const token = `${header}.${payload}.${signature}`;

console.log('Generated token:', token);

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/user-data',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/json'
  },
  timeout: 15000
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      console.log('Body:', JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log('Body (raw):', data);
    }
  });
});

req.on('error', (e) => console.error('Request error:', e.message));
req.on('timeout', () => { console.error('Request timed out'); req.destroy(); });
req.end();
