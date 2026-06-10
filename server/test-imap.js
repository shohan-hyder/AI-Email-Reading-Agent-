const Imap = require('node-imap');

const imap = new Imap({
  user: '',
  password: '',
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

imap.once('ready', () => {
  console.log('✅ IMAP Connection SUCCESS!');
  imap.end();
  process.exit(0);
});

imap.once('error', (err) => {
  console.log('❌ IMAP Connection FAILED:', err.message);
  process.exit(1);
});

imap.connect();