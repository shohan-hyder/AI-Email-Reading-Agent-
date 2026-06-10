const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { startAgent, runAgent } = require('./emailAgent');
const { getNotifications, getStats } = require('./supabaseStorage');

const app = express();
const PORT = process.env.AGENT_PORT || 3001;

app.use(cors());
app.use(express.json());

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mode: process.env.EMAIL_MODE || 'mock',
    supabase: !!process.env.SUPABASE_URL,
    timestamp: new Date().toISOString()
  });
});

// --- Get Dashboard Notifications (FRONTEND EXPECTS THIS) ---
app.get('/notifications', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const emails = await getNotifications(limit);
    res.json(emails);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// --- Also keep /api/emails for backward compatibility ---
app.get('/api/emails', async (req, res) => {
  try {
    const emails = await getNotifications(100);
    res.json(emails);
  } catch (err) {
    console.error('Error fetching emails:', err);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// --- Get Dashboard Statistics ---
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// --- Reset all data (FRONTEND EXPECTS /reset) ---
app.post('/reset', async (req, res) => {
  try {
    const { supabase } = require('./supabaseClient');
    if (!supabase) return res.status(500).json({ error: 'Supabase not connected' });

    await supabase.from('email_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('processed_emails').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('[API] ✓ Database reset successfully');
    res.json({ success: true, message: 'All data cleared' });
  } catch (err) {
    console.error('Error resetting data:', err);
    res.status(500).json({ error: 'Failed to reset data' });
  }
});

// --- Trigger agent (FRONTEND EXPECTS /run) ---
app.post('/run', async (req, res) => {
  try { 
    await runAgent(); 
    res.json({ success: true, message: 'Agent run completed' }); 
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// --- Also add /api versions for compatibility ---
app.post('/api/reset', async (req, res) => {
  try {
    const { supabase } = require('./supabaseClient');
    if (!supabase) return res.status(500).json({ error: 'Supabase not connected' });

    await supabase.from('email_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('processed_emails').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('[API] ✓ Database reset successfully');
    res.json({ success: true, message: 'All data cleared' });
  } catch (err) {
    console.error('Error resetting data:', err);
    res.status(500).json({ error: 'Failed to reset data' });
  }
});

app.post('/api/run', async (req, res) => {
  try { 
    await runAgent(); 
    res.json({ success: true, message: 'Agent run completed' }); 
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

app.post('/api/trigger', async (req, res) => {
  try { 
    await runAgent(); 
    res.json({ success: true, message: 'Agent run completed' }); 
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`\n[Server] ========================================`);
  console.log(`[Server] 🚀 AI Email Agent API on port ${PORT}`);
  console.log(`[Server] 📧 Email mode: ${process.env.EMAIL_MODE || 'mock'}`);
  console.log(`[Server] 🤖 AI provider: ${process.env.GEMINI_API_KEY ? 'Gemini' : 'Rule-based'}`);
  console.log(`[Server] ☁️  Storage: ${process.env.SUPABASE_URL ? 'Supabase (Cloud)' : 'None'}`);
  console.log(`[Server] ========================================\n`);
  
  // Start the agent
  startAgent();
});