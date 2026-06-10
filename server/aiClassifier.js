/**
 * AI Email Classifier
 * Hybrid approach: Gemini API (primary) + Rule-based fallback
 *
 * Returns structured decision:
 * { important: boolean, priority: 'HIGH'|'MEDIUM'|'LOW', category: string, reason: string }
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- Rule-Based Classifier (always available, no API key needed) ---
const RULES = [
  {
    name: 'SPAM', important: false, priority: 'LOW',
    patterns: [/unsubscribe/i, /newsletter/i, /promotional/i, /\d+%s*off/i, /frees*gift/i, /you('ve| have) won/i, /claim your prize/i, /limited time offer/i, /click here to claim/i, /daily digest/i, /top (products|stories|reads)/i, /marketing (strategies|tips)/i],
    reason: 'Email contains spam, newsletter, or promotional content indicators.',
  },
  {
    name: 'SERVER_DOWN', important: true, priority: 'HIGH',
    patterns: [/servers*(down|unavailable|crash)/i, /services*unavailable/i, /outage/i, /b500s*errorb/i, /errors*rate/i, /cpus*(usage|at)s*\d+%/i, /memorys*(usage|at)s*\d+%/i, /disks*(usage|full|ats*\d+%)/i, /connections*pools*exhaust/i, /databases*(down|error|fail)/i, /CRITICAL.*server/i, /incident.*triggered/i, /pagerduty/i, /alert.*threshold/i],
    reason: 'Critical server or infrastructure alert detected requiring immediate attention.',
  },
  {
    name: 'PAYMENT_ISSUE', important: true, priority: 'HIGH',
    patterns: [/payments*fail(ed)?/i, /payments*declin(ed)?/i, /transactions*fail(ed)?/i, /billings*error/i, /invoices*(overdue|past due)/i, /chargeback/i, /refunds*request/i, /unusuals*charges/i, /bill.*\d+%/i, /payment.*required/i],
    reason: 'Payment failure, billing issue, or financial anomaly detected.',
  },
  {
    name: 'CLIENT_COMPLAINT', important: true, priority: 'HIGH',
    patterns: [/urgent/i, /unacceptable/i, /legals*action/i, /escalat(e|ing)/i, /switchings*provider/i, /verys*disappointed/i, /extremelys*frustrated/i, /completelys*(broken|wrong)/i, /losings*business/i, /considering.*competitor/i, /immediates*attention/i, /immediate.*fix/i],
    reason: 'Urgent client complaint or critical customer request requiring immediate response.',
  },
  {
    name: 'SECURITY_ALERT', important: true, priority: 'HIGH',
    patterns: [/unauthorizeds*(access|usage|charge)/i, /securitys*(breach|alert|incident)/i, /suspiciouss*activit/i, /accounts*compromis/i, /datas*breach/i],
    reason: 'Security alert or potential unauthorized activity detected.',
  },
  {
    name: 'SUBSCRIPTION', important: true, priority: 'LOW',
    patterns: [/subscriptions*(renew(al|ed)|expir)/i, /plans*wills*renew/i, /trials*end/i, /yours*(account|plan)s*(has been|will be)s*(renew|charg)/i],
    reason: 'Subscription renewal or billing notification.',
  },
];

function ruleBasedClassify(email) {
  const fullText = `${email.subject} ${email.body}`.toLowerCase();
  for (const rule of RULES) {
    const matched = rule.patterns.some((pattern) => pattern.test(fullText));
    if (matched) {
      return { important: rule.important, priority: rule.priority, category: rule.name, reason: rule.reason, method: 'rule-based' };
    }
  }
  return { important: false, priority: 'LOW', category: 'OTHER', reason: 'Email does not match any known important pattern.', method: 'rule-based' };
}

// --- Gemini AI Classifier ---
async function geminiClassify(email) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const responseText = response.text();

  // Extract JSON from response
  const jsonMatch = responseText.match(/{[\s\S]*}/);
  if (!jsonMatch) throw new Error('Could not parse Gemini response as JSON');

  const resultJson = JSON.parse(jsonMatch[0]);

  return {
    important: Boolean(resultJson.important),
    priority: ['HIGH', 'MEDIUM', 'LOW'].includes(resultJson.priority) ? resultJson.priority : 'LOW',
    category: resultJson.category || 'OTHER',
    reason: resultJson.reason || 'AI classified this email.',
    method: 'gemini-ai',
  };
}

// --- Hybrid Classifier (exported) ---
async function classifyEmail(email) {
  // Try Gemini first if API key is set
  if (GEMINI_API_KEY) {
    try {
      const result = await geminiClassify(email);
      console.log(`[AI] Gemini classified "${email.subject}" → important=${result.important}, category=${result.category}`);
      return result;
    } catch (err) {
      console.warn(`[AI] Gemini failed, falling back to rule-based: ${err.message}`);
    }
  }

  // Fall back to rule-based
  const result = ruleBasedClassify(email);
  console.log(`[AI] Rule-based classified "${email.subject}" → important=${result.important}, category=${result.category}`);
  return result;
}

module.exports = { classifyEmail, ruleBasedClassify };