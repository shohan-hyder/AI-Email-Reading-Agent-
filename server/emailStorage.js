const { supabase } = require('./supabaseClient');

/**
 * Check if email was already processed (duplicate prevention)
 */
async function isEmailProcessed(emailId) {
  try {
    const { data, error } = await supabase
      .from('processed_emails')
      .select('email_id')
      .eq('email_id', emailId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking processed email:', error.message);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('Exception in isEmailProcessed:', err.message);
    return false;
  }
}

/**
 * Mark email as processed
 */
async function markAsProcessed(email) {
  try {
    const { error } = await supabase
      .from('processed_emails')
      .insert({
        email_id: email.id,
        from_email: email.from,
        from_name: email.from_name || null,
        subject: email.subject,
        body: email.body,
        received_at: email.date || new Date().toISOString()
      });

    if (error) {
      console.error('Error marking email as processed:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Exception in markAsProcessed:', err.message);
    return false;
  }
}

/**
 * Save important email to database
 */
async function saveImportantEmail(email, classification) {
  try {
    const { error } = await supabase
      .from('important_emails')
      .insert({
        email_id: email.id,
        from_email: email.from,
        from_name: email.from_name || null,
        subject: email.subject,
        priority: classification.priority,
        category: classification.category,
        reason: classification.reason,
        ai_method: classification.method || 'mock',
        received_at: email.date || new Date().toISOString()
      });

    if (error) {
      console.error('Error saving important email:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Exception in saveImportantEmail:', err.message);
    return false;
  }
}

/**
 * Get all important emails from database
 */
async function getImportantEmails(limit = 50) {
  try {
    const { data, error } = await supabase
      .from('important_emails')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching important emails:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception in getImportantEmails:', err.message);
    return [];
  }
}

module.exports = {
  isEmailProcessed,
  markAsProcessed,
  saveImportantEmail,
  getImportantEmails
};