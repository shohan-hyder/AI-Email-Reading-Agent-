
-- Stores email IDs that have been processed (duplicate prevention)
CREATE TABLE IF NOT EXISTS processed_emails (
  id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE processed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_processed_emails" ON processed_emails FOR SELECT TO anon USING (true);
CREATE POLICY "insert_processed_emails" ON processed_emails FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_processed_emails" ON processed_emails FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_processed_emails" ON processed_emails FOR DELETE TO anon USING (true);

-- Stores important email notifications for the dashboard
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id TEXT NOT NULL UNIQUE,
  sender TEXT NOT NULL,
  sender_email TEXT,
  subject TEXT NOT NULL,
  body_preview TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
  category TEXT NOT NULL,
  reason TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_email_notifications" ON email_notifications FOR SELECT TO anon USING (true);
CREATE POLICY "insert_email_notifications" ON email_notifications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_email_notifications" ON email_notifications FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_email_notifications" ON email_notifications FOR DELETE TO anon USING (true);

-- Stores agent run history / stats
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  emails_processed INTEGER DEFAULT 0 NOT NULL,
  emails_flagged INTEGER DEFAULT 0 NOT NULL,
  source TEXT DEFAULT 'mock' NOT NULL,
  status TEXT DEFAULT 'success' NOT NULL,
  error_message TEXT
);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_agent_runs" ON agent_runs FOR SELECT TO anon USING (true);
CREATE POLICY "insert_agent_runs" ON agent_runs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_agent_runs" ON agent_runs FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_agent_runs" ON agent_runs FOR DELETE TO anon USING (true);
