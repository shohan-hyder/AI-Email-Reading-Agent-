/**
 * AI Email Agent - Main Processing Loop
 * Uses Supabase for duplicate prevention and notifications
 */

const { readEmails } = require('./emailReader');
const { classifyEmail } = require('./aiClassifier');
const { 
  isEmailProcessed, 
  markAsProcessed, 
  saveNotification 
} = require('./supabaseStorage');

let isRunning = false;

async function runAgent() {
  if (isRunning) {
    console.log('[Agent] ⏭️  Previous run still in progress, skipping...');
    return;
  }

  isRunning = true;
  const startTime = Date.now();
  const stats = { processed: 0, flagged: 0, skipped: 0, source: 'mock' };

  try {
    console.log('\n[Agent] ========================================');
    console.log(`[Agent] Starting run at ${new Date().toISOString()}`);
    console.log(`[Agent] Mode: ${process.env.EMAIL_MODE || 'mock'}`);

    // Step 1: Read emails
    const emails = await readEmails();
    stats.source = process.env.EMAIL_MODE || 'mock';

    if (!emails || emails.length === 0) {
      console.log('[Agent] No new emails to process');
      return;
    }

    console.log(`[Agent] Found ${emails.length} emails to process`);

    // Step 2: Process each email
    for (const email of emails) {
      try {
        // Check for duplicates (PDF: "never show same email more than once")
        const alreadyProcessed = await isEmailProcessed(email.id);
        if (alreadyProcessed) {
          stats.skipped++;
          console.log(`[Agent] ⏭️  SKIP (duplicate): ${email.subject}`);
          continue;
        }

        // Classify with AI (Gemini or rule-based)
        const classification = await classifyEmail(email);
        stats.processed++;

        // Mark as processed (prevents future duplicates)
        await markAsProcessed(email.id, stats.source);

        // If important, save to dashboard
        if (classification.important) {
          await saveNotification(email, classification);
          stats.flagged++;
          console.log(`[Agent] 🚩 FLAGGED: ${email.subject} [${classification.priority}]`);
        } else {
          console.log(`[Agent] ✓ IGNORED: ${email.subject}`);
        }
      } catch (err) {
        console.error(`[Agent] Error processing email ${email.id}:`, err.message);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Agent] ✅ Run completed in ${duration}ms`);
    console.log(`[Agent] 📊 Stats:`, stats);
    console.log('[Agent] ========================================\n');

  } catch (err) {
    console.error('[Agent] Fatal error:', err.message);
    stats.status = 'error';
    stats.errorMessage = err.message;
  } finally {
    isRunning = false;
  }
}

// Start the agent with polling
function startAgent() {
  const pollInterval = parseInt(process.env.POLL_INTERVAL_MS || '120000');
  
  console.log(`[Agent] 🚀 Starting AI Email Agent`);
  console.log(`[Agent] ⏱️  Poll interval: ${pollInterval / 1000}s`);
  
  // Run immediately
  runAgent();
  
  // Then poll on interval
  setInterval(runAgent, pollInterval);
}

module.exports = { runAgent, startAgent };