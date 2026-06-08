/**
 * Browser-side AI Email Classifier
 * Rule-based with rich pattern matching
 * Used for in-browser demo mode (no server needed)
 */

export type ClassificationResult = {
  important: boolean
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  category: string
  reason: string
  method: string
}

export type MockEmail = {
  id: string
  from: string
  from_name: string
  subject: string
  body: string
  received_at: string
}

type ClassificationRule = {
  name: string
  important: boolean
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  patterns: RegExp[]
  reason: string
}

const RULES: ClassificationRule[] = [
  {
    name: 'SPAM',
    important: false,
    priority: 'LOW',
    patterns: [
      /unsubscribe/i,
      /newsletter/i,
      /promotional/i,
      /\d+%\s*off/i,
      /free\s*gift/i,
      /you('ve| have) won/i,
      /claim your prize/i,
      /limited time offer/i,
      /click here to claim/i,
      /daily digest/i,
      /top (products|stories|reads)/i,
      /marketing (strategies|tips)/i,
      /view in browser/i,
      /partner (network|resources)/i,
    ],
    reason: 'Email is promotional, a newsletter, or spam — no action required.',
  },
  {
    name: 'SERVER_DOWN',
    important: true,
    priority: 'HIGH',
    patterns: [
      /server\s*(down|unavailable|crash)/i,
      /service\s*unavailable/i,
      /outage/i,
      /\b500\s*error\b/i,
      /error\s*rate.*\d+%/i,
      /cpu\s*(usage|at)\s*\d+%/i,
      /memory\s*(usage|at)\s*\d+%/i,
      /disk\s*(usage|full|at\s*\d+%)/i,
      /connection\s*pool\s*exhaust/i,
      /database.*failing/i,
      /CRITICAL.*server/i,
      /incident.*triggered/i,
      /pagerduty/i,
      /threshold.*exceeded/i,
      /prod-.*down/i,
      /immediate action required.*disk/i,
    ],
    reason: 'Critical server or infrastructure alert detected requiring immediate attention.',
  },
  {
    name: 'PAYMENT_ISSUE',
    important: true,
    priority: 'HIGH',
    patterns: [
      /payment\s*fail(ed)?/i,
      /payment\s*declin(ed)?/i,
      /transaction\s*fail(ed)?/i,
      /billing\s*error/i,
      /invoice\s*(overdue|past due)/i,
      /chargeback/i,
      /unusual\s*charges/i,
      /\d{3}%\s*(higher|more)/i,
      /payment.*required/i,
      /card.*declined/i,
      /payment.*action required/i,
    ],
    reason: 'Payment failure, billing issue, or financial anomaly detected requiring immediate review.',
  },
  {
    name: 'CLIENT_COMPLAINT',
    important: true,
    priority: 'HIGH',
    patterns: [
      /unacceptable/i,
      /legal\s*action/i,
      /escalat(e|ing)/i,
      /switching\s*provider/i,
      /very\s*disappointed/i,
      /extremely\s*frustrated/i,
      /completely\s*(broken|wrong)/i,
      /losing\s*business/i,
      /considering.*competitor/i,
      /immediate\s*attention/i,
      /demand.*fix/i,
      /integration.*broken/i,
      /401.*errors.*all/i,
    ],
    reason: 'Urgent client complaint or critical customer request requiring immediate response.',
  },
  {
    name: 'SECURITY_ALERT',
    important: true,
    priority: 'HIGH',
    patterns: [
      /unauthorized\s*(access|usage|charge)/i,
      /security\s*(breach|alert|incident)/i,
      /suspicious\s*activit/i,
      /account\s*compromis/i,
      /data\s*breach/i,
    ],
    reason: 'Security alert or potential unauthorized activity detected.',
  },
  {
    name: 'SUBSCRIPTION',
    important: true,
    priority: 'LOW',
    patterns: [
      /subscription\s*(renew(al|ed)|expir)/i,
      /plan\s*will\s*renew/i,
      /trial\s*end/i,
      /has been renewed/i,
      /charged.*subscription/i,
    ],
    reason: 'Subscription renewal or billing notification — informational.',
  },
]

export function classifyEmail(email: MockEmail): ClassificationResult {
  const fullText = `${email.subject} ${email.body}`

  for (const rule of RULES) {
    const matched = rule.patterns.some((pattern) => pattern.test(fullText))
    if (matched) {
      return {
        important: rule.important,
        priority: rule.priority,
        category: rule.name,
        reason: rule.reason,
        method: 'rule-based',
      }
    }
  }

  return {
    important: false,
    priority: 'LOW',
    category: 'OTHER',
    reason: 'Email does not match any known important criteria.',
    method: 'rule-based',
  }
}
