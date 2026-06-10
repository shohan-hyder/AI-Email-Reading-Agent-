/**
 * Supabase Client Configuration
 * Uses the downgraded version compatible with Node.js 20
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] ⚠️  Missing credentials - running without cloud storage');
  module.exports = { supabase: null };
} else {
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('[Supabase] ✓ Connected to cloud database');
  module.exports = { supabase };
}