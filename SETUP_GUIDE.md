# 🚀 Complete Setup Guide

A beginner-friendly step-by-step guide to set up and run the AI Email Reading Agent locally and deploy it to the cloud.

---

## 📋 Prerequisites

Before you start, make sure you have:

- ✅ **Node.js 20+** — [Download](https://nodejs.org/)
  ```bash
  node --version  # Should be v20.x or higher
  npm --version   # Should be v10.x or higher
  ```

- ✅ **Git** — [Download](https://git-scm.com/)
  ```bash
  git --version
  ```

- ✅ **Docker** (for Docker setup) — [Download](https://www.docker.com/products/docker-desktop/)
  ```bash
  docker --version
  docker compose --version
  ```

- ✅ **A Code Editor** — VS Code recommended: [Download](https://code.visualstudio.com/)

---

## 🏠 Local Setup (Recommended First Step)

### Step 1: Navigate to Project

```bash
# Windows: Open PowerShell
cd "c:\Shohan\AI Email Reading Tool"

# Or from the directory:
# Right-click → Open PowerShell here
```

### Step 2: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

**Expected output:**
```
added 150+ packages in ~2 minutes
```

### Step 3: Create Environment File

```bash
# Copy example to .env
cp .env.example .env

# Or on Windows PowerShell:
Copy-Item .env.example .env
```

**The .env file should look like:**
```
EMAIL_MODE=mock
POLL_INTERVAL_MS=120000
ANTHROPIC_API_KEY=
SUPABASE_URL=
```

**For mock mode, that's all you need!** The defaults work out of the box.

### Step 4: Start the Backend Server

Open a **new PowerShell window** in the project root:

```bash
cd server
npm start
```

**Expected output:**
```
[Server] AI Email Agent listening on port 3001
[Server] Email mode: mock
[Server] Starting initial agent run...
[Agent] ======================================
[Agent] Starting run at 2026-06-08T12:00:00.000Z
[Agent] Mode: mock
[Agent] Found 20 emails to process
[Agent] ✓ FLAGGED: "Payment Failed - Action Required" [HIGH] [PAYMENT_ISSUE]
[Agent] ✓ FLAGGED: "CRITICAL: Production Server Down..." [HIGH] [SERVER_DOWN]
...
[Agent] Run complete: 20 processed, 10 flagged, 0 skipped
[Scheduler] Scheduling next run in 120s
```

✅ **Server is running!** Leave this terminal open.

### Step 5: Start the Frontend

Open a **second PowerShell window** in the project root:

```bash
npm run dev
```

**Expected output:**
```
  VITE v7.x.x  ready in 150 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### Step 6: Open the Dashboard

🌐 **Open your browser and go to:**
```
http://localhost:5173
```

You should see:
- ✅ 10-15 important emails flagged by the AI
- ✅ Each email shows: Sender, Subject, Priority (HIGH/MEDIUM/LOW), Category, and Reason
- ✅ A statistics panel with counts by priority and category
- ✅ Ability to filter, mark as read, and delete notifications

**🎉 Congratulations!** The system is running locally!

---

## 🐳 Docker Setup (Production Ready)

### Step 1: Verify Docker Installation

```bash
docker --version
docker compose --version
```

Both should return version numbers.

### Step 2: Navigate to Project

```bash
cd "c:\Shohan\AI Email Reading Tool"
```

### Step 3: Create .env File

```bash
cp .env.example .env
```

Keep `EMAIL_MODE=mock` for testing.

### Step 4: Build and Run

```bash
# Build all containers and start
docker compose up --build

# First build takes 2-3 minutes...
```

**Expected output:**
```
[+] Building 45.2s (15/15) FINISHED
[+] Running 2/2
 ✔ Container ai-email-agent   Running
 ✔ Container ai-email-dashboard Running

[agent] [Server] AI Email Agent listening on port 3001
[frontend] 2026-06-08 12:00:00 - Local: http://localhost:8080/
```

### Step 5: Access Dashboard

🌐 **Open your browser:**
```
http://localhost:8080
```

### Step 6: Stop Containers

```bash
# Stop all containers
docker compose down

# Or keep running in background with:
docker compose up -d
```

---

## 🤖 Using Claude AI (Optional)

To enable Claude AI classification instead of rules:

### Step 1: Get Claude API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create account
3. Go to API Keys → Create Key
4. Copy your key (starts with `sk-ant-`)

### Step 2: Add to .env

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

### Step 3: Restart

**Local:**
```bash
# Kill server (Ctrl+C)
# Restart:
cd server
npm start
```

**Docker:**
```bash
docker compose down
docker compose up --build
```

**Now emails are classified by Claude AI!** You'll see improved decisions.

---

## 📧 Using Real Gmail (Optional)

To process emails from your actual Gmail inbox:

### Step 1: Enable Gmail App Password

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Select **Security** (left menu)
3. Scroll to **App passwords** (requires 2FA enabled)
4. Select "Mail" and "Windows Computer"
5. Copy the 16-character password
6. Do NOT close this window yet!

### Step 2: Update .env

```env
EMAIL_MODE=imap
IMAP_HOST=imap.gmail.com
IMAP_USER=your-email@gmail.com
IMAP_PASSWORD=xxxx xxxx xxxx xxxx
```

### Step 3: Restart

```bash
cd server
npm start
```

**The agent will now process emails from your Gmail inbox!**

---

## ☁️ Deploy to Cloud

### Option 1: Railway (Recommended, Free Tier)

1. **Create Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Connect your GitHub repo

3. **Add Environment Variables**
   - Go to Project → Variables
   - Add from your .env file:
     ```
     EMAIL_MODE=mock
     ANTHROPIC_API_KEY=sk-ant-xxxxx
     ```

4. **Deploy**
   - Railway auto-deploys on git push
   - Dashboard URL: `your-project.up.railway.app`

### Option 2: Render (Free Tier)

1. **Connect Repository**
   - Go to [render.com](https://render.com)
   - Sign up and create new Web Service
   - Connect your GitHub repo

2. **Configure**
   - Build Command: `npm install && npm run build && cd server && npm install`
   - Start Command: `node server/index.js`

3. **Environment Variables**
   - Add your .env variables in dashboard

4. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy

### Option 3: Docker Hub + VPS

1. **Build Image**
   ```bash
   docker build -f Dockerfile -t your-username/ai-email-agent-frontend .
   docker build -f server/Dockerfile -t your-username/ai-email-agent-backend ./server
   ```

2. **Push to Docker Hub**
   ```bash
   docker login
   docker push your-username/ai-email-agent-frontend
   docker push your-username/ai-email-agent-backend
   ```

3. **Deploy on VPS**
   ```bash
   ssh user@your-vps.com
   git clone your-repo
   cd your-repo
   docker compose up -d
   ```

---

## 🧪 Testing

### Test Mock Mode

```bash
# Already running? Check dashboard
http://localhost:5173

# Or test via API
curl http://localhost:3001/health
```

### Test Manual Run

```bash
# Trigger agent manually
curl -X POST http://localhost:3001/run
```

### Test Reset

```bash
# Clear all notifications and reprocess
curl -X POST http://localhost:3001/reset
```

### View All Notifications

```bash
# Get all notifications as JSON
curl http://localhost:3001/notifications | jq .
```

---

## ❌ Troubleshooting

### Port Already in Use (Port 3001 or 5173)

**Problem:** `Error: listen EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Find what's using the port
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force

# Or change port in .env
AGENT_PORT=3002
```

### Database Error

**Problem:** `Error opening SQLite`

**Solution:**
```bash
# Remove old database
rm data/emails.db

# Restart server
cd server
npm start
```

### Dependencies Error

**Problem:** `Cannot find module...`

**Solution:**
```bash
# Reinstall all dependencies
rm -r node_modules server/node_modules
npm install
cd server && npm install && cd ..
```

### Docker Won't Start

**Problem:** `docker-compose: command not found`

**Solution:**
```bash
# Update Docker Desktop to latest version
# Then try again
docker compose up --build
```

### Claude API Errors

**Problem:** `Error: API key not found`

**Solution:**
1. Verify key in .env: `ANTHROPIC_API_KEY=sk-ant-xxxxx`
2. Key should start with `sk-ant-`
3. System falls back to rules if API key invalid
4. Check logs: `docker compose logs agent`

---

## 📊 Common Operations

### View Server Logs

**Local:**
```bash
# Server logs appear in the terminal window where you ran `npm start`
```

**Docker:**
```bash
docker compose logs agent    # Backend logs
docker compose logs frontend  # Frontend logs
docker compose logs -f agent  # Follow logs in real-time
```

### Stop All Services

**Local:**
```bash
# Press Ctrl+C in both terminal windows
```

**Docker:**
```bash
docker compose down
```

### Restart Services

**Local:**
```bash
# Kill and restart each terminal
Ctrl+C
npm run dev / npm start
```

**Docker:**
```bash
docker compose restart
```

### Check System Status

```bash
# Health check
curl http://localhost:3001/health

# Stats
curl http://localhost:3001/stats

# Notifications
curl http://localhost:3001/notifications
```

---

## 🎓 Next Steps

- **Explore Mock Emails**: Check how 20 different email types are classified
- **Try Claude AI**: Enable API key to see improved classification
- **Connect Gmail**: Process emails from your real inbox
- **Deploy to Cloud**: Put system live on Railway/Render
- **Customize Rules**: Edit `server/aiClassifier.js` to add patterns
- **Monitor Logs**: Watch how emails are processed in real-time

---

## 📖 Documentation

- **[Main README](README.md)** — Full feature documentation
- **[API Reference](API.md)** — Complete endpoint documentation
- **[Architecture](ARCHITECTURE.md)** — Technical deep dive

---

## ✅ Checklist

- [ ] Node.js 20+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] .env file created
- [ ] Backend running on port 3001
- [ ] Frontend running on port 5173
- [ ] Dashboard loads in browser
- [ ] 10+ emails visible
- [ ] Filters and controls work
- [ ] Manual run trigger works
- [ ] Reset works

---

## 💡 Tips

- **Stuck?** Check the troubleshooting section above
- **Want to learn more?** Read the main [README.md](README.md)
- **Found a bug?** Create an issue on GitHub
- **Have suggestions?** We'd love to hear them!

---

**Happy email processing! 🚀**

*Last updated: June 2026*
