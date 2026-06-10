/**
 * Email Reader Module
 * Supports: Mock mode (default) | IMAP mode (requires credentials)
 * NOTE: This module ONLY reads emails. Processing is handled by emailAgent.js
 */

const mockEmails = require('./mockEmails.json');

// --- Mock Email Reader ---
async function readMockEmails() {
  console.log('[Reader] Reading mock emails...');
  return mockEmails;
}

// --- IMAP Email Reader ---
async function readImapEmails(config) {
  return new Promise((resolve, reject) => {
    let Imap, simpleParser;
    try {
      Imap = require('node-imap');
      simpleParser = require('mailparser').simpleParser;
    } catch (e) {
      return reject(new Error('IMAP dependencies not installed: ' + e.message));
    }

    const imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host || 'imap.gmail.com',
      port: config.port || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
    });

    const emails = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) return reject(err);

        imap.search(['UNSEEN', ['SINCE', new Date(Date.now() - 24 * 60 * 60 * 1000)]], (err, results) => {
          if (err) return reject(err);
          if (!results || results.length === 0) {
            imap.end();
            return resolve([]);
          }

          const fetch = imap.fetch(results.slice(-20), {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
            struct: true,
          });

          const promises = [];

          fetch.on('message', (msg, seqno) => {
            const chunks = {};
            let uid;

            msg.on('attributes', (attrs) => { uid = attrs.uid; });

            msg.on('body', (stream, info) => {
              const chunks_data = [];
              stream.on('data', (chunk) => chunks_data.push(chunk));
              stream.on('end', () => {
                chunks[info.which] = Buffer.concat(chunks_data).toString('utf8');
              });
            });

            msg.once('end', () => {
              const p = simpleParser(
                Object.values(chunks).join('\r\n')
              ).then((parsed) => {
                emails.push({
                  id: `imap-${uid}`,
                  from: parsed.from?.value?.[0]?.address || 'unknown@unknown.com',
                  from_name: parsed.from?.value?.[0]?.name || 'Unknown',
                  subject: parsed.subject || '(No Subject)',
                  body: parsed.text || parsed.html?.replace(/<[^>]+>/g, ' ') || '',
                  received_at: (parsed.date || new Date()).toISOString(),
                });
              }).catch(() => {});
              promises.push(p);
            });
          });

          fetch.once('end', async () => {
            await Promise.all(promises);
            imap.end();
            console.log(`[Reader] Fetched ${emails.length} emails from IMAP`);
            resolve(emails);
          });

          fetch.once('error', reject);
        });
      });
    });

    imap.once('error', reject);
    imap.once('end', () => {});
    imap.connect();
  });
}

// --- Main reader function ---
async function readEmails(config = {}) {
  const mode = config.mode || process.env.EMAIL_MODE || 'mock';

  if (mode === 'imap') {
    const imapConfig = {
      user: config.user || process.env.IMAP_USER,
      password: config.password || process.env.IMAP_PASSWORD,
      host: config.host || process.env.IMAP_HOST || 'imap.gmail.com',
      port: parseInt(config.port || process.env.IMAP_PORT || '993'),
    };

    if (!imapConfig.user || !imapConfig.password) {
      console.warn('[Reader] IMAP credentials missing, falling back to mock mode');
      return readMockEmails();
    }

    try {
      return await readImapEmails(imapConfig);
    } catch (err) {
      console.error(`[Reader] IMAP failed: ${err.message}, falling back to mock`);
      return readMockEmails();
    }
  }

  // Default: mock mode
  return readMockEmails();
}

module.exports = { readEmails };