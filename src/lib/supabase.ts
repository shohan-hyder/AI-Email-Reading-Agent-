import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type EmailNotification = {
  id: string
  email_id: string
  sender: string
  sender_email: string | null
  subject: string
  body_preview: string | null
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  category: string
  reason: string
  received_at: string
  is_read: boolean
  created_at: string
}

export type AgentRun = {
  id: string
  run_at: string
  emails_processed: number
  emails_flagged: number
  source: string
  status: string
  error_message: string | null
}
