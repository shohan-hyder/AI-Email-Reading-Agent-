# 🏗️ System Architecture

Complete technical architecture documentation for the AI Email Reading Agent.

---

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER / DASHBOARD (Browser)                       │
│                         http://localhost:5173                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   VITE Dev      │
                    │   Server        │
                    │   (Hot Reload)  │
                    └────────┬────────┘
                             │ HTTP
          ┌──────────────────┴──────────────────┐
          │                                     │
    ┌─────▼──────┐                    ┌────────▼───────┐
    │  Frontend   │                    │  Backend API   │
    │   (React)   │                    │  (Express)     │
    │  - Dashboard│                    │  Port 3001     │
    │  - Filters  │ ◄──────HTTP────► │  - Endpoints   │
    │  - Charts   │      REST API      │  - Scheduler   │
    │  - Controls │                    │  - AI Logic    │
    └─────┬──────┘                    └────────┬───────┘
          │                                     │
          │          ┌──────────────────┬──────┴───────────┐
          │          │                  │                  │
          ▼          ▼                  ▼                  ▼
    ┌──────────┐ ┌─────────┐  ┌──────────────┐  ┌──────────────┐
    │ TypeScript│ │ React   │  │  Express.js  │  │   Node.js    │
    │ Vite      │ │ Hooks   │  │  CORS/JSON   │  │   Scheduler  │
    │ tailwindCSS│ └────────┘  └──────────────┘  └──────────────┘
    └──────────┘
```

---

## 🔄 Email Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: EMAIL SOURCE                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Mock      │  │    Gmail     │  │    IMAP      │         │
│  │    (JSON)    │  │   (IMAP)     │  │   (Generic)  │         │
│  └────────┬─────┘  └────────┬─────┘  └────────┬─────┘         │
│           │                 │                 │               │
│           └─────────────────┴─────────────────┘               │
│                       │                                       │
│                    [readEmails()]                             │
│                       ▼                                       │
│         Email[] {id, from, subject, body}                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ STEP 2: DEDUPLICATION                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ isProcessed(emailId) ?                             │    │
│  └────────────┬───────────────────────────┬───────────┘    │
│               │ YES                       │ NO             │
│               ▼                           ▼               │
│         Skip Email                  Continue              │
│         (Already seen)                                     │
│                                                           │
│  Store in SQLite + Supabase                              │
│  processed_emails { id, processed_at }                   │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│ STEP 3: AI CLASSIFICATION                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│     email.subject + email.body                          │
│               │                                        │
│               ▼                                        │
│     ┌─────────────────────────────────────┐            │
│     │  ANTHROPIC_API_KEY set?             │            │
│     └──┬─────────────────────────────────┬┘            │
│        │ YES                             │ NO          │
│        ▼                                 ▼            │
│   ┌────────────┐               ┌─────────────────┐    │
│   │ Claude API │               │ Rule-Based      │    │
│   │ (Haiku)    │               │ Classifier      │    │
│   │ HTTP/REST  │               │ 100+ patterns   │    │
│   └────────────┘               └─────────────────┘    │
│        │                              │               │
│        └──────────────┬───────────────┘               │
│                       ▼                               │
│     Classification Result:                            │
│     {                                                 │
│       important: boolean,                             │
│       priority: HIGH|MEDIUM|LOW,                      │
│       category: PAYMENT_ISSUE|...,                    │
│       reason: "clear sentence"                        │
│     }                                                 │
└──────────────────┬────────────────────────────────────┘
                   │
┌──────────────────▼────────────────────────────────────┐
│ STEP 4: DECISION & STORAGE                            │
├───────────────────────────────────────────────────────┤
│                                                       │
│     important = true ?                               │
│        │ YES          │ NO                           │
│        ▼              ▼                              │
│   ┌────────────┐ ┌──────────┐                       │
│   │ Save to    │ │  Silently│                       │
│   │ Dashboard  │ │  Ignore  │                       │
│   │ (Show User)│ │(No action)                       │
│   └────────────┘ └──────────┘                       │
│        │                                            │
│        ▼                                            │
│   email_notifications {                             │
│     id, email_id, sender, subject,                 │
│     priority, category, reason, ...                │
│   }                                                 │
│                                                     │
│   Storage: SQLite + Supabase                       │
└─────────────────────────────────────────────────────┘
```

---

## 🗂️ Directory Structure

```
ai-email-agent/
│
├── 📂 server/                    ← Backend (Node.js)
│   ├── 📄 index.js               ← Main server + API endpoints
│   ├── 📄 emailAgent.js          ← Core orchestration logic
│   ├── 📄 emailReader.js         ← Read emails (mock/IMAP)
│   ├── 📄 aiClassifier.js        ← AI classification (Claude+rules)
│   ├── 📄 db.js                  ← SQLite database layer
│   ├── 📄 mockEmails.json        ← 20 test emails
│   ├── 📄 package.json
│   └── 🐳 Dockerfile             ← Server container image
│
├── 📂 src/                       ← Frontend (React)
│   ├── 📄 App.tsx                ← Main dashboard component
│   ├── 📄 main.tsx               ← Entry point
│   ├── 📄 index.css              ← Global styles
│   │
│   ├── 📂 lib/
│   │   ├── 📄 supabase.ts        ← Supabase client
│   │   ├── 📄 classifier.ts      ← Browser AI classifier
│   │   ├── 📄 agentRunner.ts     ← Browser agent
│   │   └── 📄 utils.ts           ← Helper functions
│   │
│   ├── 📂 components/
│   │   ├── 📄 mode-toggle.tsx    ← Dark/light theme
│   │   └── 📂 ui/                ← shadcn/ui components
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── skeleton.tsx
│   │       └── scroll-area.tsx
│   │
│   ├── 📂 hooks/
│   │   └── 📄 use-mobile.ts      ← Mobile detection
│   │
│   └── 📂 public/
│       └── 📄 index.html         ← Static files
│
├── 📂 data/                      ← Runtime (created by app)
│   └── 📄 emails.db              ← SQLite database
│
├── 📂 dist/                      ← Frontend build output
│   └── ...                       ← Built React app
│
├── 📄 docker-compose.yml         ← Multi-container orchestration
├── 🐳 Dockerfile                 ← Frontend container image
├── 📄 nginx.conf                 ← Nginx configuration
├── 📄 package.json               ← Frontend deps
├── 📄 package-lock.json
│
├── 📄 .env                       ← Environment variables (git ignored)
├── 📄 .env.example               ← Environment template
├── 📄 .gitignore                 ← Git ignore rules
│
├── 📄 README.md                  ← Main documentation
├── 📄 SETUP_GUIDE.md             ← Local + Docker setup
├── 📄 API_REFERENCE.md           ← API endpoints docs
├── 📄 DEPLOYMENT.md              ← Production deployment
├── 📄 ARCHITECTURE.md            ← This file
└── 📄 PROJECT_REQUIREMENTS.md    ← Requirements checklist
```

---

## 🔌 API Architecture

### Endpoints Structure

```
/                           ← Frontend (React app)
├── GET    /health          ← Service health check
├── GET    /stats           ← Statistics (counts, breakdown)
├── GET    /notifications   ← Get all notifications
│   ├── ?priority=HIGH      ← Filter by priority
│   ├── ?category=SPAM      ← Filter by category
│   ├── ?limit=50           ← Pagination limit
│   └── ?offset=0           ← Pagination offset
├── POST   /notifications/:id/read  ← Mark as read
├── DELETE /notifications/:id       ← Delete notification
├── POST   /run             ← Manual trigger agent run
└── POST   /reset           ← Reset all data (testing)
```

### Response Flow

```
Client Request
    │
    ▼
Express Router (index.js)
    │
    ├─── Validate input
    ├─── Query database (db.js)
    ├─── Format response
    │
    ▼
JSON Response
    {
      "success": true/false,
      "data": {...},
      "error": "message if failed"
    }
```

---

## 💾 Database Architecture

### SQLite Tables

#### `processed_emails` (Deduplication)

```sql
CREATE TABLE processed_emails (
  id TEXT PRIMARY KEY,           -- Unique email ID
  processed_at TIMESTAMP         -- When it was processed
);
```

**Purpose:** Prevent same email from being processed twice

**Indexes:** `PRIMARY KEY (id)` for fast lookups

---

#### `email_notifications` (Dashboard Storage)

```sql
CREATE TABLE email_notifications (
  id INTEGER PRIMARY KEY,        -- Auto-increment
  email_id TEXT UNIQUE,          -- Reference to original email
  sender TEXT,                   -- Sender name
  sender_email TEXT,             -- Sender email address
  subject TEXT,                  -- Email subject
  body_preview TEXT,             -- First 300 chars of body
  priority TEXT,                 -- HIGH, MEDIUM, LOW
  category TEXT,                 -- PAYMENT_ISSUE, SERVER_DOWN, etc
  reason TEXT,                   -- AI's reason
  received_at TIMESTAMP,         -- Original email time
  is_read BOOLEAN,               -- Read status
  created_at TIMESTAMP           -- When saved to db
);
```

**Purpose:** Store important emails for dashboard display

**Indexes:** `UNIQUE(email_id)`, `INDEX(priority)`, `INDEX(category)`

---

### Hybrid Storage Strategy

```
┌─────────────────────────────────────────┐
│  Email Arrives                          │
└────────────────┬────────────────────────┘
                 │
      ┌──────────▼──────────┐
      │  Process in Memory  │
      └──────────┬──────────┘
                 │
      ┌──────────▼──────────────────┐
      │  Save to SQLite (Always)    │
      │  /app/data/emails.db        │
      │  ✅ Persistent               │
      │  ✅ Works offline            │
      │  ✅ Fast queries             │
      └──────────┬──────────────────┘
                 │
      ┌──────────▼──────────────────┐
      │  Try Supabase (Optional)    │
      │  - If credentials provided  │
      │  - Cloud backup             │
      │  - Multi-device sync        │
      │  - If fails, use SQLite     │
      └─────────────────────────────┘
```

---

## 🎯 AI Classification Logic

### Decision Tree

```
Email Input (subject + body)
    │
    ▼
Claude API Available?
    │
    ├─── YES (ANTHROPIC_API_KEY set)
    │    │
    │    ├─ Build prompt with email content
    │    ├─ Call claude-3-haiku-20240307
    │    ├─ Parse JSON response
    │    └─ Return structured decision
    │        { important, priority, category, reason }
    │
    └─── NO (API key not set)
         │
         ├─ Fallback to rule-based
         │
         ├─ Check 100+ regex patterns
         ├─ Match against categories:
         │  ├─ SPAM (newsletters, promos)
         │  ├─ SERVER_DOWN (outages, alerts)
         │  ├─ PAYMENT_ISSUE (failed payments)
         │  ├─ CLIENT_COMPLAINT (urgent issues)
         │  ├─ SECURITY_ALERT (breaches)
         │  ├─ SUBSCRIPTION (renewals)
         │  ├─ BILLING_INQUIRY
         │  └─ OTHER
         │
         └─ Return structured decision
            { important, priority, category, reason }
```

### Classification Categories

| Category | Rule Patterns | AI Prompt | Priority |
|----------|---------------|-----------|----------|
| SPAM | Newsletter, promo, unsubscribe | Low importance | LOW |
| SERVER_DOWN | Outage, 500 error, CPU alert | Critical | HIGH |
| PAYMENT_ISSUE | Payment failed, declined | Critical | HIGH |
| CLIENT_COMPLAINT | Urgent, legal, switching | Critical | HIGH |
| SECURITY_ALERT | Breach, unauthorized access | Critical | HIGH |
| SUBSCRIPTION | Renewal, trial end | Informational | LOW |
| BILLING_INQUIRY | General billing question | Medium | MEDIUM |
| OTHER | Doesn't match | Analysis | MEDIUM |

---

## 🔄 Scheduler Architecture

```
Application Start
    │
    ├─ Initialize SQLite
    ├─ Initialize Supabase (if credentials)
    ├─ Run first agent cycle immediately
    │
    ▼
Schedule Recurring Runs
    │
    ┌─────────────────────────────┐
    │ Every POLL_INTERVAL_MS       │
    │ (default: 120,000ms = 2min)  │
    └─────────────┬───────────────┘
                  │
    ┌─────────────▼────────────────┐
    │ runAgent()                   │
    │ ├─ Read emails               │
    │ ├─ Check for duplicates      │
    │ ├─ Classify (Claude+rules)   │
    │ ├─ Save important to DB      │
    │ └─ Log statistics            │
    └─────────────┬────────────────┘
                  │
    ┌─────────────▼────────────────┐
    │ Sleep POLL_INTERVAL_MS       │
    │ then repeat                  │
    └──────────────────────────────┘
```

---

## 🌐 Frontend Component Hierarchy

```
App.tsx (Main component)
│
├─ ModeToggle (Theme switcher)
│
├─ Header (Stats & Controls)
│  ├─ Refresh button
│  ├─ Reset button
│  └─ Manual run button
│
├─ StatisticsPanel
│  ├─ Total count
│  ├─ Unread count
│  ├─ By priority chart
│  └─ By category chart
│
├─ FilterSection
│  ├─ Priority filter
│  └─ Category filter
│
└─ NotificationsFeed
   └─ EmailCard[] (repeated)
      ├─ PriorityBadge
      ├─ CategoryBadge
      ├─ TimeDisplay
      ├─ ActionButtons
      │  ├─ Mark as read
      │  └─ Delete
      └─ ...
```

---

## 🔐 Security Architecture

### Secret Management

```
.env (git ignored)
    ├─ ANTHROPIC_API_KEY
    ├─ SUPABASE_URL
    ├─ SUPABASE_ANON_KEY
    ├─ IMAP_PASSWORD
    └─ ...

.env.example (git tracked)
    └─ Template with placeholders
       (no real secrets)
```

### Environment Isolation

```
Development
├─ Mock emails
├─ Local SQLite
└─ Optional: Local Anthropic API testing

Production
├─ Real email account (optional IMAP)
├─ Persistent SQLite in Docker volume
├─ Supabase for cloud backup
└─ Real API keys in environment
```

---

## 📊 Data Flow Diagram

```
┌──────────────────────────────────────────────────────┐
│ External Email Services                              │
│ ├─ Gmail/IMAP                                        │
│ ├─ Other IMAP servers                               │
│ └─ Mock data (for testing)                           │
└────────────────┬─────────────────────────────────────┘
                 │
                 │ IMAP Protocol / readEmails()
                 │
     ┌───────────▼──────────────┐
     │ Email Agent (Backend)    │
     ├───────────────────────────┤
     │ emailReader.js            │
     │ emailAgent.js             │
     │ aiClassifier.js           │
     │ db.js                     │
     └───────────┬──────────────┘
                 │
        ┌────────┴──────────┐
        │                   │
        │ SQLite Storage    │ Supabase (Optional)
        │ /app/data/emails  │ PostgreSQL
        │ ✅ Persistent     │ ✅ Cloud backup
        │
        │
    ┌───┴──────────────────┐
    │ REST API (Express)   │
    │ Port 3001            │
    │ ├─ /notifications    │
    │ ├─ /stats           │
    │ ├─ /run             │
    │ └─ /reset           │
    └────────┬────────────┘
             │
             │ HTTP + JSON
             │
     ┌───────▼──────────┐
     │ Frontend (React) │
     │ Port 5173/8080   │
     │ ├─ Dashboard     │
     │ ├─ Filters       │
     │ ├─ Charts        │
     │ └─ Controls      │
     └──────────┬──────┘
                │
                │ Browser
                │
            User 👤
```

---

## 🚀 Deployment Architecture

### Local Development
```
Your Machine
├─ npm run dev (Frontend: port 5173)
└─ npm start (Backend: port 3001)
```

### Docker (Local)
```
Docker Engine
├─ Frontend Container (nginx:80)
└─ Backend Container (node:3001)
   ├─ SQLite volume
   └─ Health checks
```

### Cloud Deployment
```
Railway / Render / Heroku
├─ Frontend (nginx on public URL)
├─ Backend (Node.js on public URL)
├─ Environment variables
└─ Auto-deploy from Git
```

---

## 📈 Scalability Considerations

### Current Capacity
- SQLite: Works for <1 million emails
- Single server: Handles 1000s of emails/day
- Response time: <100ms for API queries

### Scaling Options
1. **Horizontal**: Add load balancer, multiple backend instances
2. **Vertical**: Increase server resources
3. **Database**: Migrate to Supabase PostgreSQL for larger scale
4. **Caching**: Add Redis layer for frequent queries
5. **CDN**: Cache static frontend assets globally

---

## 🔧 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 | UI framework |
| | TypeScript | Type safety |
| | Vite | Build tool |
| | Tailwind CSS | Styling |
| | shadcn/ui | Component library |
| **Backend** | Node.js 20 | Runtime |
| | Express.js | Web framework |
| | SQLite3 | Database |
| | node-imap | IMAP support |
| | mailparser | Email parsing |
| | @anthropic-ai/sdk | Claude AI |
| **Deployment** | Docker | Containerization |
| | Docker Compose | Orchestration |
| | nginx | Reverse proxy |
| | Supabase | Optional cloud DB |

---

## 📝 Notes for Developers

- **Error Handling**: All async operations wrapped in try-catch
- **Logging**: Console logs with [Module] prefix
- **Configuration**: All via environment variables
- **Graceful Degradation**: Falls back to rules if Claude fails
- **Database**: Always SQLite, optional Supabase
- **Testing**: Mock data works without any credentials

---

**Architecture designed for simplicity, reliability, and scalability.**

*Last updated: June 2026*
