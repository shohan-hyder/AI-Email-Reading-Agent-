/**
 * Browser-side Agent Runner
 * Loads mock emails, classifies them, deduplicates, and stores in Supabase
 */

import { supabase } from './supabase'
import { classifyEmail, type MockEmail } from './classifier'

// Inline mock emails (same as server/mockEmails.json)
const MOCK_EMAILS: MockEmail[] = [
  {
    id: 'mock-001',
    from: 'billing@stripe.com',
    from_name: 'Stripe Billing',
    subject: 'Payment Failed - Action Required',
    body: 'We were unable to process your payment of $499.00 for your subscription. Your card ending in 4242 was declined. Please update your payment method to avoid service interruption.',
    received_at: '2026-06-08T08:15:00Z',
  },
  {
    id: 'mock-002',
    from: 'alerts@monitoring.io',
    from_name: 'Server Monitor',
    subject: 'CRITICAL: Production Server Down - CPU 98% / Service Unavailable',
    body: 'ALERT LEVEL: CRITICAL\nServer: prod-web-01\nStatus: Service Unavailable\nCPU Usage: 98%\nMemory: 94%\nError: 500 Internal Server Error on all endpoints\nImmediate action required.',
    received_at: '2026-06-08T09:30:00Z',
  },
  {
    id: 'mock-003',
    from: 'newsletter@techdigest.com',
    from_name: 'Tech Digest Weekly',
    subject: 'Your Weekly Tech Digest - Top Stories This Week',
    body: 'Good morning! Here are your top tech stories for this week. Click here to unsubscribe if you no longer wish to receive this newsletter. This is a promotional email.',
    received_at: '2026-06-08T07:00:00Z',
  },
  {
    id: 'mock-004',
    from: 'john.smith@enterprise-client.com',
    from_name: 'John Smith',
    subject: 'URGENT: System completely broken - clients cannot access portal',
    body: 'This is completely unacceptable. Our clients have been unable to access the customer portal for 3 hours. We are losing business every minute. I demand immediate attention. If not resolved, we will be escalating to legal action.',
    received_at: '2026-06-08T10:45:00Z',
  },
  {
    id: 'mock-005',
    from: 'offers@amazondeal.com',
    from_name: 'Amazon Deals',
    subject: '🔥 Exclusive offer: 50% OFF everything today only! FREE GIFT inside',
    body: 'Congratulations! You have been selected for our exclusive 50% discount promotion. Click here to claim your free gift. Limited time offer! Unsubscribe | Privacy Policy.',
    received_at: '2026-06-08T06:30:00Z',
  },
  {
    id: 'mock-006',
    from: 'accounts@bigcorp-client.com',
    from_name: 'BigCorp Accounts',
    subject: 'Invoice #INV-2026-0891 - Payment Overdue 30 Days',
    body: 'Invoice #INV-2026-0891 for $12,450.00 is now 30 days overdue. Please arrange payment immediately to avoid account suspension and late fees.',
    received_at: '2026-06-08T11:00:00Z',
  },
  {
    id: 'mock-007',
    from: 'no-reply@github.com',
    from_name: 'GitHub',
    subject: 'Your GitHub subscription renewal - Pro Plan',
    body: 'Your GitHub Pro plan will renew on July 1, 2026 for $7.00/month. No action needed if you wish to continue your subscription has been renewed.',
    received_at: '2026-06-08T08:00:00Z',
  },
  {
    id: 'mock-008',
    from: 'security@auth-system.com',
    from_name: 'Infrastructure Monitor',
    subject: 'ALERT: Database connection pool exhausted - all queries failing',
    body: 'SEVERITY: HIGH\nComponent: PostgreSQL Database\nIssue: Connection pool exhausted (500/500 connections used)\nImpact: All API endpoints returning database errors. Connection pool exhausted causing database failing on all endpoints.',
    received_at: '2026-06-08T09:20:00Z',
  },
  {
    id: 'mock-009',
    from: 'sarah.jones@startup-client.com',
    from_name: 'Sarah Jones',
    subject: 'Very disappointed with your service - considering switching providers',
    body: 'I have been a customer for 2 years and I am extremely frustrated with the recent service degradation. I am seriously considering moving to a competitor. Please get back to me urgently.',
    received_at: '2026-06-08T13:00:00Z',
  },
  {
    id: 'mock-010',
    from: 'noreply@medium.com',
    from_name: 'Medium Daily Digest',
    subject: 'Stories from your network - Today\'s top reads',
    body: 'Your daily Medium digest is ready. 5 new stories from writers you follow. Unsubscribe from digest emails. View in browser.',
    received_at: '2026-06-08T07:30:00Z',
  },
  {
    id: 'mock-011',
    from: 'billing@aws.amazon.com',
    from_name: 'AWS Billing',
    subject: 'Your AWS bill is ready - Unusual charges detected',
    body: 'Your AWS bill for May 2026 is $4,892.34, which is 340% higher than your previous month. Unusual charges have been detected. This may indicate unauthorized usage.',
    received_at: '2026-06-08T12:00:00Z',
  },
  {
    id: 'mock-012',
    from: 'deals@shopify-partner.com',
    from_name: 'Shopify Partner Network',
    subject: 'New partner resources available this week',
    body: 'Hello partner! We have updated our resource library with new guides and marketing materials. Partner network newsletter update. Unsubscribe from partner emails.',
    received_at: '2026-06-08T09:00:00Z',
  },
  {
    id: 'mock-013',
    from: 'ops-alert@pagerduty.com',
    from_name: 'PagerDuty',
    subject: 'TRIGGERED: High error rate - 500 errors spiking to 45%',
    body: 'Incident #INC-44821 has been triggered. Service: Production API. Error rate threshold exceeded. Current error rate: 45%. PagerDuty alert triggered. Acknowledge this incident immediately.',
    received_at: '2026-06-08T11:32:00Z',
  },
  {
    id: 'mock-014',
    from: 'contact@newsletter-service.com',
    from_name: 'Digital Marketing Weekly',
    subject: '5 marketing strategies you need to know in 2026',
    body: 'This week we cover the top 5 digital marketing strategies for 2026. Newsletter about marketing strategies. Unsubscribe | View online.',
    received_at: '2026-06-08T08:45:00Z',
  },
  {
    id: 'mock-015',
    from: 'michael.chen@corporate-enterprise.com',
    from_name: 'Michael Chen',
    subject: 'Chargeback dispute - Transaction ID #TXN-928471',
    body: 'We are filing a chargeback dispute for transaction #TXN-928471 for $3,200.00. The services promised were not delivered. We have notified our bank to initiate chargeback proceedings.',
    received_at: '2026-06-08T14:00:00Z',
  },
  {
    id: 'mock-016',
    from: 'no-reply@spotify.com',
    from_name: 'Spotify',
    subject: 'Your Spotify Premium subscription renewed',
    body: 'Your Spotify Premium subscription has been renewed. You have been charged $9.99. Subscription renewal confirmed.',
    received_at: '2026-06-08T00:01:00Z',
  },
  {
    id: 'mock-017',
    from: 'devops@internal-monitoring.com',
    from_name: 'Infrastructure Monitor',
    subject: 'CRITICAL: Disk usage at 97% on prod-db-01 - immediate action required',
    body: 'CRITICAL ALERT: Disk usage at 97% on prod-db-01. Free Space: 3.2 GB remaining. Impact: Database writes will fail when disk is full. Immediate action required to prevent complete service outage.',
    received_at: '2026-06-08T15:00:00Z',
  },
  {
    id: 'mock-018',
    from: 'spam@prizewinner-2026.com',
    from_name: 'Prize Winner Notification',
    subject: "You've won! Claim your $10,000 prize - limited time",
    body: "CONGRATULATIONS! Claim your $10,000 prize now! Limited time offer! Unsubscribe if you don't want more offers. This is a promotional email.",
    received_at: '2026-06-08T05:00:00Z',
  },
  {
    id: 'mock-019',
    from: 'emily.watson@key-account.com',
    from_name: 'Emily Watson',
    subject: 'Urgent: API integration completely broken after your last update',
    body: 'Since your platform update last night, our entire API integration has stopped working. We are getting 401 errors on all endpoints. This is blocking our entire workflow. We need this fixed immediately — please escalate this.',
    received_at: '2026-06-08T16:00:00Z',
  },
  {
    id: 'mock-020',
    from: 'team@producthunt.com',
    from_name: 'Product Hunt',
    subject: "Product Hunt Daily - Today's top products",
    body: "Good morning! Here are today's top products on Product Hunt. Daily digest newsletter. Unsubscribe from daily digest.",
    received_at: '2026-06-08T06:00:00Z',
  },
]

export type RunStats = {
  processed: number
  flagged: number
  skipped: number
  errors: number
}

async function isProcessed(emailId: string): Promise<boolean> {
  const { data } = await supabase
    .from('processed_emails')
    .select('id')
    .eq('id', emailId)
    .maybeSingle()
  return !!data
}

async function markProcessed(emailId: string): Promise<void> {
  await supabase
    .from('processed_emails')
    .insert({ id: emailId })
}

export async function runMockAgent(onProgress?: (msg: string) => void): Promise<RunStats> {
  const log = (msg: string) => {
    console.log(msg)
    onProgress?.(msg)
  }

  const stats: RunStats = { processed: 0, flagged: 0, skipped: 0, errors: 0 }

  log(`Processing ${MOCK_EMAILS.length} mock emails...`)

  for (const email of MOCK_EMAILS) {
    // Duplicate check
    const already = await isProcessed(email.id)
    if (already) {
      log(`Skipping duplicate: ${email.id}`)
      stats.skipped++
      continue
    }

    // Mark processed immediately
    await markProcessed(email.id)
    stats.processed++

    // Classify
    const result = classifyEmail(email)

    if (result.important) {
      const bodyPreview = email.body.slice(0, 300).replace(/\s+/g, ' ').trim()

      const { error } = await supabase.from('email_notifications').insert({
        email_id: email.id,
        sender: email.from_name || email.from,
        sender_email: email.from,
        subject: email.subject,
        body_preview: bodyPreview,
        priority: result.priority,
        category: result.category,
        reason: result.reason,
        received_at: email.received_at,
      })

      if (error && error.code !== '23505') {
        log(`Error saving ${email.id}: ${error.message}`)
        stats.errors++
      } else {
        stats.flagged++
        log(`✓ FLAGGED: "${email.subject}" [${result.priority}][${result.category}]`)
      }
    } else {
      log(`✗ IGNORED: "${email.subject}" [${result.category}]`)
    }
  }

  // Record run
  await supabase.from('agent_runs').insert({
    emails_processed: stats.processed,
    emails_flagged: stats.flagged,
    source: 'mock',
    status: stats.errors > 0 ? 'partial' : 'success',
  })

  return stats
}

export async function resetAndRerun(onProgress?: (msg: string) => void): Promise<RunStats> {
  onProgress?.('Resetting processed emails...')
  await supabase.from('processed_emails').delete().neq('id', '__never__')
  await supabase.from('email_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  onProgress?.('Reset complete. Running agent...')
  return runMockAgent(onProgress)
}

export { MOCK_EMAILS }
