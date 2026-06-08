# 🔌 API Reference

Complete documentation of all API endpoints for the AI Email Reading Agent backend.

**Base URL:** `http://localhost:3001` (local) | `http://your-domain.com` (production)

---

## 📊 Notifications Endpoints

### Get All Notifications

Retrieve email notifications with optional filtering.

```
GET /notifications
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `priority` | string | (none) | Filter by priority: `HIGH`, `MEDIUM`, or `LOW` |
| `category` | string | (none) | Filter by category: `PAYMENT_ISSUE`, `SERVER_DOWN`, etc. |
| `limit` | number | 50 | Max results to return (1-100) |
| `offset` | number | 0 | Pagination offset |

**Example Request:**

```bash
# Get all HIGH priority notifications
curl "http://localhost:3001/notifications?priority=HIGH"

# Get all PAYMENT_ISSUE emails, 25 per page, page 1
curl "http://localhost:3001/notifications?category=PAYMENT_ISSUE&limit=25&offset=0"

# Get all notifications, paginate 50 at a time
curl "http://localhost:3001/notifications?limit=50&offset=0"
```

**Example Response:**

```json
{
  "success": true,
  "notifications": [
    {
      "id": 1,
      "email_id": "mock-001",
      "sender": "Stripe Billing",
      "sender_email": "billing@stripe.com",
      "subject": "Payment Failed - Action Required",
      "body_preview": "We were unable to process your payment of $499.00 for your subscription...",
      "priority": "HIGH",
      "category": "PAYMENT_ISSUE",
      "reason": "Payment failure, billing issue, or financial anomaly detected.",
      "received_at": "2026-06-08T08:15:00Z",
      "is_read": false,
      "created_at": "2026-06-08T08:15:00Z"
    },
    {
      "id": 2,
      "email_id": "mock-002",
      "sender": "Server Monitor",
      "sender_email": "alerts@monitoring.io",
      "subject": "CRITICAL: Production Server Down - CPU 98%",
      "body_preview": "ALERT LEVEL: CRITICAL\nServer: prod-web-01...",
      "priority": "HIGH",
      "category": "SERVER_DOWN",
      "reason": "Critical server or infrastructure alert detected.",
      "received_at": "2026-06-08T09:30:00Z",
      "is_read": true,
      "created_at": "2026-06-08T09:30:00Z"
    }
  ],
  "stats": {
    "total": 2,
    "unread": 1,
    "byPriority": {
      "HIGH": 2,
      "MEDIUM": 0,
      "LOW": 0
    },
    "byCategory": {
      "PAYMENT_ISSUE": 1,
      "SERVER_DOWN": 1
    }
  },
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

---

### Mark Notification as Read

Mark an email notification as read.

```
POST /notifications/:emailId/read
```

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `emailId` | string | Email ID (e.g., `mock-001`) |

**Example Request:**

```bash
curl -X POST http://localhost:3001/notifications/mock-001/read
```

**Example Response:**

```json
{
  "success": true
}
```

---

### Delete Notification

Remove an email notification from the dashboard.

```
DELETE /notifications/:emailId
```

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `emailId` | string | Email ID to delete |

**Example Request:**

```bash
curl -X DELETE http://localhost:3001/notifications/mock-001
```

**Example Response:**

```json
{
  "success": true
}
```

---

## 📊 Statistics Endpoints

### Get Statistics

Retrieve agent statistics and notification counts.

```
GET /stats
```

**Example Request:**

```bash
curl http://localhost:3001/stats
```

**Example Response:**

```json
{
  "success": true,
  "stats": {
    "total": 12,
    "unread": 3,
    "byPriority": {
      "HIGH": 8,
      "MEDIUM": 3,
      "LOW": 1
    },
    "byCategory": {
      "SERVER_DOWN": 4,
      "PAYMENT_ISSUE": 3,
      "CLIENT_COMPLAINT": 2,
      "SUBSCRIPTION": 2,
      "SPAM": 1
    }
  }
}
```

---

## 🤖 Agent Control Endpoints

### Health Check

Check if the agent service is running and healthy.

```
GET /health
```

**Example Request:**

```bash
curl http://localhost:3001/health
```

**Example Response:**

```json
{
  "status": "ok",
  "mode": "mock",
  "pollIntervalMs": 120000,
  "timestamp": "2026-06-08T12:30:45.123Z"
}
```

---

### Trigger Manual Run

Manually trigger the agent to check for new emails and classify them.

```
POST /run
```

**Request Body:** (empty)

**Example Request:**

```bash
curl -X POST http://localhost:3001/run
```

**Example Response:**

```json
{
  "success": true,
  "stats": {
    "processed": 20,
    "flagged": 10,
    "skipped": 0,
    "source": "mock",
    "status": "success"
  }
}
```

**Response Field Descriptions:**

| Field | Description |
|-------|-------------|
| `processed` | Total emails processed in this run |
| `flagged` | Emails marked as important |
| `skipped` | Emails already processed before (duplicates) |
| `source` | Email source: `mock`, `imap`, etc. |
| `status` | Run result: `success` or `error` |

---

### Reset All Data

Clear all processed emails and notifications. Useful for testing and development.

```
POST /reset
```

**⚠️ Warning:** This will delete all stored notifications and processed email history!

**Example Request:**

```bash
curl -X POST http://localhost:3001/reset
```

**Example Response:**

```json
{
  "success": true,
  "message": "Processed emails reset. Next run will reprocess all."
}
```

---

## 📋 Response Format

All endpoints return JSON with this structure:

```json
{
  "success": true/false,
  "data": { ... },
  "error": "Error message if success=false"
}
```

---

## 🔄 Category Reference

Valid categories returned in notifications:

| Category | Priority | Use Case |
|----------|----------|----------|
| `SERVER_DOWN` | HIGH | Service outages, critical errors |
| `PAYMENT_ISSUE` | HIGH | Payment failures, declined cards |
| `CLIENT_COMPLAINT` | HIGH | Urgent customer issues |
| `SECURITY_ALERT` | HIGH | Breaches, unauthorized access |
| `BILLING_INQUIRY` | MEDIUM | General billing questions |
| `SUBSCRIPTION` | LOW | Renewal notices |
| `SPAM` | LOW | Newsletters, promotions |
| `OTHER` | LOW | Unknown category |

---

## 🔐 Priority Reference

Valid priority levels:

| Priority | Color | Meaning |
|----------|-------|---------|
| `HIGH` | 🔴 Red | Needs immediate attention |
| `MEDIUM` | 🟡 Yellow | Important, but not urgent |
| `LOW` | 🔵 Blue | Informational |

---

## ⏱️ Timestamps

All timestamps are in ISO 8601 format (UTC):

```
2026-06-08T08:15:00Z
```

To convert to your local timezone:

```javascript
const date = new Date("2026-06-08T08:15:00Z");
const localTime = date.toLocaleString();
```

---

## 🧪 cURL Examples

### Get High Priority Emails

```bash
curl "http://localhost:3001/notifications?priority=HIGH"
```

### Get Server Down Alerts

```bash
curl "http://localhost:3001/notifications?category=SERVER_DOWN"
```

### Mark Email as Read

```bash
curl -X POST http://localhost:3001/notifications/mock-001/read
```

### Delete Email

```bash
curl -X DELETE http://localhost:3001/notifications/mock-001
```

### Trigger Agent Run

```bash
curl -X POST http://localhost:3001/run
```

### Get Statistics

```bash
curl http://localhost:3001/stats
```

### Check Health

```bash
curl http://localhost:3001/health
```

---

## 📱 JavaScript Examples

### Using fetch()

```javascript
// Get all notifications
const response = await fetch('http://localhost:3001/notifications');
const data = await response.json();
console.log(data.notifications);

// Get HIGH priority only
const highPriority = await fetch(
  'http://localhost:3001/notifications?priority=HIGH'
);
const high = await highPriority.json();

// Mark as read
await fetch('http://localhost:3001/notifications/mock-001/read', {
  method: 'POST'
});

// Get stats
const stats = await fetch('http://localhost:3001/stats');
const statsData = await stats.json();
console.log(statsData.stats);
```

### Using axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001'
});

// Get notifications
const { data } = await api.get('/notifications', {
  params: { priority: 'HIGH' }
});

// Mark as read
await api.post(`/notifications/${emailId}/read`);

// Get stats
const { data: stats } = await api.get('/stats');
```

---

## ❌ Error Handling

All error responses return HTTP status code 500 with:

```json
{
  "success": false,
  "error": "Error description"
}
```

**Example:**

```bash
curl http://localhost:3001/notifications
# If database error:
# {
#   "success": false,
#   "error": "Database connection failed"
# }
```

---

## 🚀 Rate Limiting

No rate limiting currently implemented. For production, consider adding:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

---

## 📞 Support

For API issues:
1. Check server logs: `docker compose logs agent`
2. Verify server is running: `curl http://localhost:3001/health`
3. Check .env configuration
4. Review this documentation

---

**Last updated: June 2026**
