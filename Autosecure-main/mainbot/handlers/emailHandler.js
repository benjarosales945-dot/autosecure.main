const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const { queryParams } = require("../../db/database");
const embedWrapper = require("../utils/emails/embedWrapper");
const { ignoreEmails } = require("../../config.json");
const EventEmitter = require('events');
const config = require('../../config.json');
const Imap = require('imap');
const { inspect } = require('util');

// --- Config ---
// Allow overriding via environment or config.json. Fallback to 2525 to avoid collisions with system SMTP.
const SMTP_PORT = process.env.SMTP_PORT || config.smtpPort || config.email?.smtpPort || 2525;
const SMTP_HOST = process.env.SMTP_HOST || config.smtpHost || config.email?.smtpHost || '0.0.0.0'; // Listen on all interfaces
const emailWatchers = new Map();
let client = null; // Discord client (set via initialize)

// --- SMTP Server Setup ---
const smtpServer = new SMTPServer({
    logger: true, // Enable logging
    disabledCommands: ['AUTH'], // Disable authentication (if not needed)
    onData(stream, session, callback) {
        simpleParser(stream)
            .then(parsed => processIncomingEmail(parsed))
            .then(() => callback())
            .catch(err => {
                console.error('Error processing email:', err);
                callback(err);
            });
    },
    onConnect(session, callback) {
        console.log(`New SMTP connection from ${session.remoteAddress}`);
        callback(); // Accept the connection
    },
});

// --- Functions ---
function initialize(discordClient) {
    client = discordClient;
    console.log('?? Email handler initialized with Discord client');
    startSMTPServer();
    // If IMAP is configured, start the poller
    if (config.email && config.email.host && config.email.user && config.email.password) {
        startIMAPPoller();
    }
}

function startSMTPServer() {
    smtpServer.listen(SMTP_PORT, SMTP_HOST, () => {
        console.log(`? SMTP server running on ${SMTP_HOST}:${SMTP_PORT}`);
    });

    smtpServer.on('error', (err) => {
        console.error('? SMTP server error:', err.message);
        setTimeout(startSMTPServer, 5000); // Reconnect after 5s
    });
}

// --- IMAP Poller (optional) ---
function startIMAPPoller() {
    const imapConfig = {
        user: config.email.user,
        password: config.email.password,
        host: config.email.host,
        port: config.email.port || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
    };

    const checkInterval = (config.email.checkInterval || 30) * 1000;

    async function checkMail() {
        const imap = new Imap(imapConfig);

        function openInbox(cb) {
            imap.openBox('INBOX', false, cb);
        }

        imap.once('ready', function() {
            openInbox(function(err, box) {
                if (err) {
                    console.error('[IMAP] openInbox error:', err.message);
                    imap.end();
                    return;
                }

                imap.search(['UNSEEN'], function(err, results) {
                    if (err) {
                        console.error('[IMAP] search error:', err.message);
                        imap.end();
                        return;
                    }

                    if (!results || results.length === 0) {
                        imap.end();
                        return;
                    }

                    const f = imap.fetch(results, { bodies: '' });
                    f.on('message', function(msg, seqno) {
                        let buffer = '';
                        msg.on('body', function(stream/*, info*/) {
                            stream.on('data', function(chunk) {
                                buffer += chunk.toString('utf8');
                            });
                        });
                        msg.once('attributes', function(attrs) {
                            // mark seen
                            const { uid } = attrs;
                            imap.addFlags(uid, '\\Seen', (err) => {
                                if (err) console.error('[IMAP] addFlags error:', err.message);
                            });
                        });
                        msg.once('end', async function() {
                            try {
                                const parsed = await simpleParser(buffer);
                                // Determine recipient: prefer parsed.to
                                const recipient = parsed.to?.value?.[0]?.address || 'unknown@unknown';
                                await processIncomingEmail(parsed);
                            } catch (e) {
                                console.error('[IMAP] parse error:', e.message);
                            }
                        });
                    });
                    f.once('error', function(err) {
                        console.error('[IMAP] fetch error:', err.message);
                    });
                    f.once('end', function() {
                        imap.end();
                    });
                });
            });
        });

        imap.once('error', function(err) {
            console.error('[IMAP] connection error:', err.message);
        });

        imap.once('end', function() {
            // connection ended
        });

        try {
            imap.connect();
        } catch (err) {
            console.error('[IMAP] connect exception:', err.message);
        }
    }

    // Initial run + interval
    checkMail();
    setInterval(checkMail, checkInterval);
    console.log(`? IMAP poller started for ${config.email.user} (domain: ${config.email.domain || 'n/a'})`);
}

async function processIncomingEmail(parsed) {
    const { from, to, subject, text, date } = parsed;
    const recipient = to?.value?.[0]?.address || "unknown@unknown";
    const sender = from?.value?.[0]?.address || "unknown@unknown";

    if (ignoreEmails.includes(sender)) {
        console.log(`?? Ignoring email from ${sender} (in ignore list)`);
        return;
    }

    const code = extractVerificationCode(text || "");
    console.log(`?? New email: ${sender} ? ${recipient}${code ? ` (code: ${code})` : ''}`);

    // Notify watchers (if any)
    if (emailWatchers.has(recipient)) {
        emailWatchers.get(recipient)({
            text,
            time: date || Date.now(),
        });
    }

    // Store in DB
    await storeEmail(recipient, sender, subject || "(no subject)", text || "", date || Date.now());

    // Send Discord notifications (if client is available)
    if (client) {
        await sendNotifications(recipient, parsed);
    }
}

function extractVerificationCode(text) {
    const codeMatch = text.match(/\b\d{6,7}\b/); // Match 6-7 digit codes
    return codeMatch ? codeMatch[0] : null;
}

async function storeEmail(email, from, subject, text, time) {
    try {
        console.log(`[DEBUG] Storing email: receiver=${email}, sender=${from}, time=${time} (type: ${typeof time})`);
        await queryParams(
            `INSERT INTO emails(receiver, sender, subject, description, time) VALUES(?, ?, ?, ?, ?)`,
            [email, from, subject, text, time]
        );
        console.log(`[DEBUG] Email stored successfully for ${email}`);
        
        // Verify it was stored by immediately querying it back
        const verification = await queryParams(
            `SELECT * FROM emails WHERE receiver=? ORDER BY time DESC LIMIT 1`,
            [email]
        );
        console.log(`[DEBUG] Verification query found ${verification.length} emails for ${email}`);
        if (verification.length > 0) {
            console.log(`[DEBUG] Most recent email:`, verification[0]);
        }
    } catch (err) {
        console.error('Failed to store email:', err);
    }
}

async function sendNotifications(email, parsed) {
    try {
        // Support subaddressing / catch-all mapping.
        // Generate candidate addresses to check subscriptions for.
        const candidates = new Set();
        candidates.add(email);

        try {
            const parts = email.split('@');
            const local = parts[0] || '';
            const domain = parts[1] || '';

            // If local contains plus (inbox+user@...), add base (inbox@domain)
            if (local.includes('+')) {
                const [base, tag] = local.split('+', 2);
                candidates.add(`${base}@${domain}`);
                candidates.add(`${local}@${domain}`); // redundant with email but okay
                // If configured domain for tagging exists, add tag@configuredDomain
                if (config.email?.domain) {
                    candidates.add(`${tag}@${config.email.domain}`);
                }
            }

            // If using catch-all and configured domain like inbox.auto-secure.lol,
            // and email is inbox@domain, also consider user@inbox.domain mapping.
            if (config.email?.useCatchAll && config.email?.domain) {
                // if address has form inbox+tag@domain or inbox@domain, try tag@inbox.domain
                if (local.includes('+')) {
                    const [, tag] = local.split('+', 2);
                    candidates.add(`${tag}@${config.email.domain}`);
                } else if (local === config.email.user?.split('@')[0] || local === 'inbox' || local === 'mail') {
                    // nothing to add here specifically
                }
            }
        } catch (e) {
            // ignore parsing issues, fall back to exact email
        }

        const seenUsers = new Set();
        for (const addr of Array.from(candidates)) {
            const subs = await queryParams(`SELECT user_id FROM email_notifier WHERE email = ?`, [addr]);
            if (!subs || subs.length === 0) continue;
            for (const sub of subs) {
                if (seenUsers.has(sub.user_id)) continue;
                seenUsers.add(sub.user_id);
                try {
                    const discordUser = await client.users.fetch(sub.user_id);
                    if (discordUser) {
                        await discordUser.send({
                            content: `📥 New email to **${addr}** (original: ${email})`,
                            embeds: [embedWrapper(parsed.subject || "(no subject)", parsed.text || "")],
                        });
                    }
                } catch (err) {
                    console.error(`Failed to DM user ${sub.user_id}:`, err.message);
                }
            }
        }
    } catch (err) {
        console.error('Error sending notifications:', err);
    }
}

function watchForEmail(email, callback, timeout = 30000) {
    emailWatchers.set(email, callback);
    setTimeout(() => emailWatchers.delete(email), timeout);
}

function shutdown() {
    console.log('?? Shutting down SMTP server...');
    smtpServer.close();
}

module.exports = {
    initialize,
    watchForEmail,
    storeEmail,
    sendNotifications,
    shutdown,
};
