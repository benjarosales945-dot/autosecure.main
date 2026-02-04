const express = require('express');
const app = express();

console.log('✅ Express loaded');

app.get('/api/health', (req, res) => {
  console.log('🔔 Health check request received');
  res.json({ success: true, message: 'API is running' });
});

const PORT = 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on http://0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err.message);
});
