const Imap = require('imap');
const fs = require('fs');
const path = require('path');

const cfgPath = path.join(__dirname, '..', 'config.json');
if (!fs.existsSync(cfgPath)) {
  console.error('No se encontró config.json en', cfgPath);
  process.exit(1);
}

const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const emailCfg = cfg.email;
if (!emailCfg) {
  console.error('No hay sección `email` en config.json');
  process.exit(1);
}

console.log('Probando IMAP con:', emailCfg.host, ':', emailCfg.port, 'usuario=', emailCfg.user);

const imap = new Imap({
  user: emailCfg.user,
  password: emailCfg.password,
  host: emailCfg.host,
  port: emailCfg.port,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

imap.once('ready', function() {
  console.log('[IMAP TEST] Conectado correctamente (ready)');
  imap.end();
});

imap.once('error', function(err) {
  console.error('[IMAP TEST] Error de conexión:', err && err.message ? err.message : err);
  process.exit(1);
});

imap.once('end', function() {
  console.log('[IMAP TEST] Conexión finalizada');
});

imap.connect();
setTimeout(() => {
  console.error('[IMAP TEST] Timeout: no se pudo conectar en 15s');
  process.exit(1);
}, 15000);
