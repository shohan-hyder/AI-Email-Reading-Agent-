/**
 * AI Email Classifier
 * Hybrid approach: Claude API (primary) + Rule-based fallback
 *
 * Returns structured decision:
 *   { important: boolean, priority: 'HIGH'|'MEDIUM'|'LOW', category: string, reason: string }
 */

const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// --- Rule-Based Classifier (always available, no API key needed) ---

const RULES = [
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
    ],
    reason: 'Email contains spam, newsletter, or promotional content indicators.',
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
      /error\s*rate/i,
      /cpu\s*(usage|at)\s*\d+%/i,
      /memory\s*(usage|at)\s*\d+%/i,
      /disk\s*(usage|full|at\s*\d+%)/i,
      /connection\s*pool\s*exhaust/i,
      /database\s*(down|error|fail)/i,
      /CRITICAL.*server/i,
      /incident.*triggered/i,
      /pagerduty/i,
      /alert.*threshold/i,
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
      /refund\s*request/i,
      /unusual\s*charges/i,
      /bill.*340%/i,
      /payment.*required/i,
    ],
    reason: 'Payment failure, billing issue, or financial anomaly detected.',
  },
  {
    name: 'CLIENT_COMPLAINT',
    important: true,
    priority: 'HIGH',
    patterns: [
      /urgent/i,
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
      /immediate.*fix/i,
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
      /your\s*(account|plan)\s*(has been|will be)\s*(renew|charg)/i,
    ],
    reason: 'Subscription renewal or billing notification.',
  },
];

function ruleBasedClassify(email) {
  const fullText = `${email.subject} ${email.body}`.toLowerCase();
  const subject = email.subject.toLowerCase();

  // Check each rule in order (first match wins)
  for (const rule of RULES) {
    const matched = rule.patterns.some((pattern) => pattern.test(fullText));
    if (matched) {
      return {
        important: rule.important,
        priority: rule.priority,
        category: rule.name,
        reason: rule.reason,
        method: 'rule-based',
      };
    }
  }

  // Default: not important
  return {
    important: false,
    priority: 'LOW',
    category: 'OTHER',
    reason: 'Email does not match any known important pattern.',
    method: 'rule-based',
  };
}

// --- Claude AI Classifier ---

async function claudeClassify(email) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const prompt = `You are an intelligent email triage agent. Analyze the following email and determine if it is important for a business.

Email Details:
FROM: ${email.from_name || email.from} <${email.from}>
SUBJECT: ${email.subject}
BODY: ${email.body}

Classify this email and respond with ONLY valid JSON in this exact format:
{
  "important": true or false,
  "priority": "HIGH" or "MEDIUM" or "LOW",
  "category": one of: "PAYMENT_ISSUE", "SERVER_DOWN", "CLIENT_COMPLAINT", "SECURITY_ALERT", "BILLING_INQUIRY", "SUBSCRIPTION", "SPAM", "NEWSLETTER", "OTHER",
  "reason": "one clear sentence explaining why this email is or is not important"
}

Guidelines:
- Mark as important (true) for: payment failures, server alerts, client complaints, security issues, overdue invoices, chargeback disputes, critical operational issues
- Mark as NOT important (false) for: newsletters, promotional emails, digest emails, spam, routine notifications with no action needed
- HIGH priority: immediate action required (outages, payment failures, legal threats, critical errors)
- MEDIUM priority: important but not emergency (billing inquiries, moderate complaints, subscription expiry warnings)
- LOW priority: informational but worth noting (subscription renewals, automated reports, minor notifications)`;

  const message = await client.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse Claude response as JSON');
  }

  const result = JSON.parse(jsonMatch[0]);

  return {
    important: Boolean(result.important),
    priority: ['HIGH', 'MEDIUM', 'LOW'].includes(result.priority) ? result.priority : 'LOW',
    category: result.category || 'OTHER',
    reason: result.reason || 'AI classified this email.',
    method: 'claude-ai',
  };
}

// --- Hybrid Classifier (exported) ---

async function classifyEmail(email) {
  // Try Claude first if API key is set
  if (ANTHROPIC_API_KEY) {
    try {
      const result = await claudeClassify(email);
      console.log(`[AI] Claude classified "${email.subject}" → important=${result.important}, category=${result.category}`);
      return result;
    } catch (err) {
      console.warn(`[AI] Claude failed, falling back to rule-based: ${err.message}`);
    }
  }

  // Fall back to rule-based
  const result = ruleBasedClassify(email);
  console.log(`[AI] Rule-based classified "${email.subject}" → important=${result.important}, category=${result.category}`);
  return result;
}

module.exports = { classifyEmail, ruleBasedClassify };
