/**
 * AI Email Agent - Backend Service
 * REST API endpoints for frontend communication
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const { startAgent, runAgent } = require('./emailAgent');
const { getNotifications, getStats } = require('./supabaseStorage');
const { supabase } = require('./supabaseClient');

const app = express();
const PORT = process.env.AGENT_PORT || 3001;

// For demo: Allow all origins
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// --- Health Check ---
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: process.env.EMAIL_MODE || 'mock',
    ai: process.env.GEMINI_API_KEY ? 'Gemini' : 'Rule-based',
    storage: supabase ? 'Supabase' : 'None',
    uptime: process.uptime(),
  });
});

// --- Get all notifications (FRONTEND EXPECTS THIS) ---
app.get('/notifications', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const notifications = await getNotifications(limit);
    
    res.json({
      success: true,
      notifications: notifications,
      count: notifications.length,
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message, 
      notifications: [] 
    });
  }
});

// --- Get statistics ---
app.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Trigger agent run (FRONTEND EXPECTS THIS) ---
app.post('/run', async (req, res) => {
  try {
    console.log('[API] Manual agent run triggered');
    await runAgent();
    res.json({ success: true, message: 'Agent run completed' });
  } catch (err) {
    console.error('Error running agent:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Reset all data (FRONTEND EXPECTS THIS) ---
app.post('/reset', async (req, res) => {
  try {
    console.log('[API] Reset requested');
    
    if (!supabase) {
      return res.status(500).json({ 
        success: false, 
        error: 'Supabase not connected' 
      });
    }

    // Clear all Supabase tables
    await supabase.from('email_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('processed_emails').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Clear agent_runs if it exists
    try {
      await supabase.from('agent_runs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      // Table might not exist, that's ok
    }

    console.log('[API] ✓ All data cleared');
    res.json({ success: true, message: 'All data cleared' });
  } catch (err) {
    console.error('Error resetting data:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Backward compatibility endpoints ---
app.get('/api/emails', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const notifications = await getNotifications(limit);
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching emails:', err);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

app.post('/api/run', async (req, res) => {
  try {
    await runAgent();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reset', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not connected' });
    }

    await supabase.from('email_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('processed_emails').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    res.json({ success: true });
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
  console.log(`[Server] ☁️  Storage: ${supabase ? 'Supabase (Cloud)' : 'None'}`);
  console.log(`[Server] ========================================\n`);
  
  // Start the agent
  startAgent();
});