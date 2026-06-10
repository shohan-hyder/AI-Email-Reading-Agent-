/**
 * Supabase Storage Layer
 * Handles duplicate prevention and notification storage
 * This is the PRODUCTION-READY way to satisfy PDF requirements
 */

const { supabase } = require('./supabaseClient');

/**
 * Check if email was already processed (DUPLICATE PREVENTION)
 * PDF Requirement: "Once an email is processed, never show it again"
 */
async function isEmailProcessed(emailId) {
  if (!supabase) return false; // Fallback if Supabase not configured
  
  try {
    const { data, error } = await supabase
      .from('processed_emails')
      .select('email_id')
      .eq('email_id', emailId)
      .maybeSingle();

    if (error) {
      console.error('[Supabase] Error checking processed:', error.message);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('[Supabase] Exception:', err.message);
    return false;
  }
}

/**
 * Mark email as processed (prevents duplicates)
 */
async function markAsProcessed(emailId, source = 'mock') {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('processed_emails')
      .upsert({ 
        email_id: emailId, 
        source: source 
      }, { 
        onConflict: 'email_id' 
      });

    if (error) {
      console.error('[Supabase] Error marking processed:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Exception:', err.message);
    return false;
  }
}

/**
 * Save important email to dashboard notifications
 * PDF Requirement: "If important, appears on dashboard"
 */
async function saveNotification(email, classification) {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('email_notifications')
      .upsert({
        email_id: email.id,
        from_email: email.from,
        from_name: email.from_name || 'Unknown',
        subject: email.subject,
        body: email.body || '',
        priority: classification.priority,
        category: classification.category,
        reason: classification.reason,
        ai_method: classification.method || 'gemini-ai',
        received_at: email.received_at || email.date || new Date().toISOString()
      }, {
        onConflict: 'email_id'
      });

    if (error) {
      console.error('[Supabase] Error saving notification:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Exception:', err.message);
    return false;
  }
}

/**
 * Get all notifications for the dashboard
 * PDF Requirement: "Dashboard shows all important emails"
 */
async function getNotifications(limit = 100) {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('email_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Supabase] Error fetching notifications:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[Supabase] Exception:', err.message);
    return [];
  }
}

/**
 * Get statistics for the dashboard header
 */
async function getStats() {
  if (!supabase) return { total: 0, high: 0, medium: 0, low: 0 };
  
  try {
    const { count: total } = await supabase
      .from('email_notifications')
      .select('*', { count: 'exact', head: true });

    const { count: high } = await supabase
      .from('email_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('priority', 'HIGH');

    const { count: medium } = await supabase
      .from('email_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('priority', 'MEDIUM');

    const { count: low } = await supabase
      .from('email_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('priority', 'LOW');

    return { total: total || 0, high: high || 0, medium: medium || 0, low: low || 0 };
  } catch (err) {
    return { total: 0, high: 0, medium: 0, low: 0 };
  }
}

module.exports = {
  isEmailProcessed,
  markAsProcessed,
  saveNotification,
  getNotifications,
  getStats
};