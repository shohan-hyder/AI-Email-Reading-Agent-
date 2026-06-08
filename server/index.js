/**
 * AI Email Agent - Backend Service
 * Runs the agent on a schedule and exposes REST endpoints
 * Features: Agent polling, mock/IMAP modes, Supabase + SQLite hybrid storage
 */

require('dotenv').config({ path: '../.env' });
require('dotenv').config(); // also check local .env

const express = require('express');
const cors = require('cors');
const { runAgent, resetProcessedEmails, getStats } = require('./emailAgent');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.AGENT_PORT || 3001;
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '120000'); // default 2 minutes

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: process.env.EMAIL_MODE || 'mock',
    pollIntervalMs: POLL_INTERVAL_MS,
    timestamp: new Date().toISOString(),
  });
});

// --- Get all notifications ---
app.get('/notifications', async (req, res) => {
  try {
    const priority = req.query.priority;
    const category = req.query.category;
    const limit = parseInt(req.query.limit || '50');
    const offset = parseInt(req.query.offset || '0');

    const notifications = await db.getNotifications({
      priority: priority || null,
      category: category || null,
      limit,
      offset,
    });

    const stats = await db.getStats();

    res.json({
      success: true,
      notifications,
      stats,
      pagination: { limit, offset },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Mark notification as read ---
app.post('/notifications/:emailId/read', async (req, res) => {
  try {
    const { emailId } = req.params;
    const success = await db.markAsRead(emailId);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Delete notification ---
app.delete('/notifications/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;
    const success = await db.deleteNotification(emailId);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Get statistics ---
app.get('/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Manual trigger endpoint ---
app.post('/run', async (req, res) => {
  console.log('[Server] Manual agent run triggered');
  try {
    const stats = await runAgent();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Reset endpoint (demo/testing) ---
app.post('/reset', async (req, res) => {
  console.log('[Server] Reset triggered');
  try {
    await resetProcessedEmails();
    res.json({ success: true, message: 'Processed emails reset. Next run will reprocess all.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Scheduled polling ---
async function scheduledRun() {
  console.log(`\n[Scheduler] Triggering scheduled run...`);
  await runAgent();
}

// --- Start HTTP server ---
function startServer() {
  app.listen(PORT, () => {
    console.log(`[Server] AI Email Agent listening on port ${PORT}`);
    console.log(`[Server] Email mode: ${process.env.EMAIL_MODE || 'mock'}`);
    console.log(`[Server] Poll interval: ${POLL_INTERVAL_MS / 1000}s`);
    console.log(
      `[Server] AI provider: ${process.env.ANTHROPIC_API_KEY ? 'Claude API' : 'Rule-based (no API key)'}`,
    );
    console.log(
      `[Server] Storage: ${process.env.SUPABASE_URL ? 'Supabase (hybrid)' : 'SQLite (local)'}`,
    );
    
    // Start agent polling AFTER server is listening
    console.log('[Server] Starting initial agent run...');
    runAgent()
      .then(() => {
        console.log(`[Scheduler] Scheduling next run in ${POLL_INTERVAL_MS / 1000}s`);
        setInterval(scheduledRun, POLL_INTERVAL_MS);
      })
      .catch((err) => {
        console.error(`[Server] Initial run failed: ${err.message}`);
        // Still start scheduler even if initial run fails
        setInterval(scheduledRun, POLL_INTERVAL_MS);
      });
  });
}

// --- Initialize database and start server ---
console.log('[Server] Initializing database...');
db.initDB()
  .then(() => {
    console.log('[Server] Database initialized successfully');
    startServer();
  })
  .catch((err) => {
    console.error(`[Server] Database init failed: ${err.message}`);
    console.log('[Server] Continuing with in-memory storage...');
    startServer();
  });

// --- Graceful shutdown ---
process.on('SIGTERM', async () => {
  console.log('[Server] Shutting down gracefully...');
  await db.closeDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Server] Interrupted, closing database...');
  await db.closeDB();
  process.exit(0);
});
