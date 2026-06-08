/**
 * Core Email Agent
 * Orchestrates: reading → classifying → deduplicating → storing
 * Hybrid: Supabase (cloud) + SQLite (local fallback)
 */

const { createClient } = require('@supabase/supabase-js');
const { readEmails } = require('./emailReader');
const { classifyEmail } = require('./aiClassifier');
const db = require('./db');

let supabase = null;
let useSupabase = false;

// Initialize Supabase if credentials provided
if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
  try {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
    );
    useSupabase = true;
    console.log('[Agent] Supabase enabled for cloud storage');
  } catch (err) {
    console.warn(`[Agent] Supabase initialization failed: ${err.message}. Using SQLite fallback.`);
  }
}

// --- Duplicate prevention: check if email has been processed ---

async function isProcessed(emailId) {
  // Try SQLite first (always available)
  const isProcessedLocal = await db.isProcessed(emailId);
  if (isProcessedLocal) return true;

  // Try Supabase if available
  if (useSupabase && supabase) {
    try {
      const { data, error } = await supabase
        .from('processed_emails')
        .select('id')
        .eq('id', emailId)
        .maybeSingle();

      if (!error && data) return true;
    } catch (err) {
      console.warn(`[Agent] Supabase check failed, relying on SQLite: ${err.message}`);
    }
  }

  return false;
}

async function markProcessed(emailId) {
  // Always mark in SQLite (local)
  await db.markProcessed(emailId);

  // Try Supabase if available
  if (useSupabase && supabase) {
    try {
      await supabase.from('processed_emails').insert({ id: emailId }).single();
    } catch (err) {
      if (!err.message.includes('23505')) {
        // 23505 = unique violation (already processed, safe to ignore)
        console.warn(`[Agent] Supabase mark processed failed: ${err.message}`);
      }
    }
  }
}

// --- Save notification to dashboard ---

async function saveNotification(email, classification) {
  const bodyPreview = email.body ? email.body.slice(0, 300).replace(/\s+/g, ' ').trim() : '';

  // Always save locally first
  await db.saveNotification(email, classification);

  // Try Supabase if available
  if (useSupabase && supabase) {
    try {
      await supabase.from('email_notifications').insert({
        email_id: email.id,
        sender: email.from_name || email.from,
        sender_email: email.from,
        subject: email.subject,
        body_preview: bodyPreview,
        priority: classification.priority,
        category: classification.category,
        reason: classification.reason,
        received_at: email.received_at || new Date().toISOString(),
      });
    } catch (err) {
      console.warn(`[Agent] Supabase save failed, using local storage: ${err.message}`);
    }
  }

  return true;
}

// --- Record agent run stats (local only) ---

async function recordRun(stats) {
  // Log locally for debugging
  console.log(`[Agent] Run stats: ${JSON.stringify(stats)}`);

  // Try Supabase if available
  if (useSupabase && supabase) {
    try {
      await supabase.from('agent_runs').insert({
        emails_processed: stats.processed,
        emails_flagged: stats.flagged,
        source: stats.source || 'mock',
        status: stats.status || 'success',
        error_message: stats.errorMessage || null,
      });
    } catch (err) {
      console.warn(`[Agent] Recording run to Supabase failed: ${err.message}`);
    }
  }
}

// --- Main agent run function ---

async function runAgent(options = {}) {
  const source = process.env.EMAIL_MODE || 'mock';
  console.log(`\n[Agent] ========================================`);
  console.log(`[Agent] Starting run at ${new Date().toISOString()}`);
  console.log(`[Agent] Mode: ${source}`);

  const stats = { processed: 0, flagged: 0, skipped: 0, source, status: 'success' };

  try {
    // Step 1: Read emails
    const emails = await readEmails({ mode: source });
    console.log(`[Agent] Found ${emails.length} emails to process`);

    // Step 2: Process each email
    for (const email of emails) {
      // Check for duplicates
      const alreadyProcessed = await isProcessed(email.id);
      if (alreadyProcessed) {
        console.log(`[Agent] Skipping duplicate: ${email.id}`);
        stats.skipped++;
        continue;
      }

      // Step 3: Mark as processed immediately (prevent race conditions)
      await markProcessed(email.id);
      stats.processed++;

      // Step 4: Classify with AI
      let classification;
      try {
        classification = await classifyEmail(email);
      } catch (err) {
        console.error(`[Agent] Classification failed for ${email.id}: ${err.message}`);
        classification = {
          important: false,
          priority: 'LOW',
          category: 'ERROR',
          reason: `Classification failed: ${err.message}`,
          method: 'error-fallback',
        };
      }

      // Step 5: Save if important
      if (classification.important) {
        const saved = await saveNotification(email, classification);
        if (saved) {
          stats.flagged++;
          console.log(`[Agent] ✓ FLAGGED: "${email.subject}" [${classification.priority}] [${classification.category}]`);
        }
      } else {
        console.log(`[Agent] ✗ IGNORED: "${email.subject}" [${classification.category}]`);
      }
    }

    console.log(`[Agent] Run complete: ${stats.processed} processed, ${stats.flagged} flagged, ${stats.skipped} skipped`);
  } catch (err) {
    stats.status = 'error';
    stats.errorMessage = err.message;
    console.error(`[Agent] Fatal error: ${err.message}`);
  }

  // Record run stats
  await recordRun(stats);

  return stats;
}

// --- Reset processed emails (for demo/testing) ---

async function resetProcessedEmails() {
  // Reset SQLite
  await db.resetAll();

  // Try Supabase if available
  if (useSupabase && supabase) {
    try {
      await supabase.from('processed_emails').delete().neq('id', '__never__');
      await supabase.from('email_notifications').delete().neq('id', 0);
    } catch (err) {
      console.warn(`[Agent] Supabase reset failed: ${err.message}`);
    }
  }

  console.log('[Agent] Reset complete (local + cloud)');
}

// --- Get statistics ---

async function getStats() {
  return await db.getStats();
}

module.exports = { runAgent, resetProcessedEmails, getStats };
