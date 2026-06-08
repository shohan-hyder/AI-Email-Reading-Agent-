# 🚀 Deployment Guide

Complete instructions for deploying the AI Email Reading Agent to production.

---

## ☁️ Cloud Deployment Options

### 1. Railway (Recommended for Beginners)

**Pros:** Free tier, auto-deploys from Git, easy setup
**Cons:** Limited free tier after 12 months

#### Step 1: Set Up Repository

```bash
cd "c:\Shohan\AI Email Reading Tool"
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/ai-email-agent.git
git push -u origin main
```

#### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `ai-email-agent` repository
5. Select `Dockerfile` as build method (auto-detected)

#### Step 3: Configure Environment

1. In Railway dashboard, go to **Project** → **Variables**
2. Add environment variables:
   ```
   EMAIL_MODE=mock
   POLL_INTERVAL_MS=120000
   ANTHROPIC_API_KEY=sk-ant-xxxxx (optional)
   SUPABASE_URL=https://xxx (optional)
   SUPABASE_ANON_KEY=xxxxx (optional)
   ```

#### Step 4: Deploy

```bash
# Push to trigger auto-deploy
git add . && git commit -m "Ready to deploy" && git push

# Railway automatically builds and deploys
# Watch logs in dashboard
```

#### Step 5: Access Your App

- Frontend: `https://your-project.up.railway.app`
- Backend API: `https://your-project-api.up.railway.app:3001`

---

### 2. Render (Alternative)

**Pros:** Generous free tier, simple UI
**Cons:** Cold starts can be slow

#### Step 1: Create Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Create a new "Web Service"

#### Step 2: Configure Service

- **Name:** ai-email-agent
- **Repository:** Select your GitHub repo
- **Branch:** main
- **Runtime:** Node
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

#### Step 3: Add Environment Variables

In Render dashboard:
1. Go to **Environment** tab
2. Add each variable from your `.env` file

#### Step 4: Deploy

Click "Create Web Service"
Render will build and deploy automatically.

---

### 3. Heroku (Legacy but Still Works)

**Note:** Heroku free tier ended, but paid dynos are affordable

#### Step 1: Install Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Windows (use Heroku installer from heroku.com)
heroku --version
```

#### Step 2: Login

```bash
heroku login
```

#### Step 3: Create App

```bash
heroku create ai-email-agent
```

#### Step 4: Add Environment Variables

```bash
heroku config:set EMAIL_MODE=mock
heroku config:set ANTHROPIC_API_KEY=sk-ant-xxxxx
```

#### Step 5: Deploy

```bash
git push heroku main
```

---

### 4. Docker Hub + Any VPS

**For complete control and cost savings**

#### Step 1: Build Docker Images

```bash
# Build frontend image
docker build -f Dockerfile -t your-username/ai-email-agent-frontend .

# Build backend image
docker build -f server/Dockerfile -t your-username/ai-email-agent-backend ./server
```

#### Step 2: Push to Docker Hub

```bash
docker login

docker push your-username/ai-email-agent-frontend
docker push your-username/ai-email-agent-backend
```

#### Step 3: SSH to VPS

```bash
ssh user@your-vps-ip
```

#### Step 4: Pull Images and Run

```bash
mkdir ai-email-agent && cd ai-email-agent

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: "3.9"
services:
  frontend:
    image: your-username/ai-email-agent-frontend
    ports:
      - "8080:80"
  agent:
    image: your-username/ai-email-agent-backend
    ports:
      - "3001:3001"
EOF

# Create .env
cat > .env << 'EOF'
EMAIL_MODE=mock
POLL_INTERVAL_MS=120000
EOF

# Start
docker compose up -d
```

#### Step 5: Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt update && sudo apt install nginx

# Create config
sudo nano /etc/nginx/sites-available/ai-email-agent
```

**Config:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
    }

    location /api {
        proxy_pass http://localhost:3001;
    }
}
```

**Enable and restart:**
```bash
sudo ln -s /etc/nginx/sites-available/ai-email-agent /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

---

## 🔐 Security Checklist

- [ ] Never commit `.env` with real secrets
- [ ] Use strong, unique API keys
- [ ] Enable HTTPS (use Let's Encrypt)
- [ ] Set up firewall rules
- [ ] Use environment variables, not hardcoded secrets
- [ ] Enable rate limiting on production
- [ ] Monitor logs for errors
- [ ] Backup database regularly
- [ ] Use strong passwords for databases
- [ ] Rotate API keys regularly

---

## 📊 Monitoring & Logs

### View Logs

**Railway:**
```
# Dashboard → Logs tab
```

**Render:**
```
# Services → Logs tab
```

**Docker/VPS:**
```bash
docker compose logs agent -f
docker compose logs frontend -f
```

### Check Health

```bash
curl https://your-domain.com/api/health
```

Should return:
```json
{
  "status": "ok",
  "mode": "mock",
  "pollIntervalMs": 120000,
  "timestamp": "..."
}
```

---

## 🔄 Continuous Deployment

### Auto-Deploy from GitHub

For Railway/Render: Already built-in!

For self-hosted, create a GitHub Actions workflow:

**.github/workflows/deploy.yml:**
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and push Docker images
        env:
          DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
          DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}
        run: |
          docker login -u $DOCKER_USERNAME -p $DOCKER_PASSWORD
          docker build -f Dockerfile -t $DOCKER_USERNAME/ai-email-agent-frontend .
          docker push $DOCKER_USERNAME/ai-email-agent-frontend
          # ... push backend image too
```

---

## 💰 Cost Estimates

| Provider | Free Tier | Paid |
|----------|-----------|------|
| Railway | $5 credits/month | $7/month+ |
| Render | Limited (cold starts) | $7/month+ |
| Heroku | ❌ Discontinued | $50/month+ |
| VPS (DigitalOcean) | ❌ No free tier | $4/month+ |
| AWS | 12 months free | Varies |

---

## 🆘 Troubleshooting Deployment

### Build Fails

Check logs for missing dependencies:
```bash
# Railway/Render: See build logs in dashboard
# Local: docker compose build --verbose
```

### App Crashes on Startup

```bash
# Check environment variables are set
# Check database initialization
# Review logs: docker compose logs -f agent
```

### Database Not Persisting

For Docker, ensure volume is configured:
```yaml
volumes:
  agent_data:
    driver: local
```

### Email Processing Not Working

1. Verify `EMAIL_MODE=mock` in .env
2. Check agent logs for errors
3. Manual trigger: `curl -X POST https://your-domain/api/run`

---

## 📈 Performance Optimization

### For Large Email Volumes

1. Increase `POLL_INTERVAL_MS` to reduce frequency
2. Use Supabase for cloud database
3. Implement caching layer (Redis)
4. Use CDN for static assets

### Database Optimization

```javascript
// Add indexes for faster queries
db.run(`CREATE INDEX IF NOT EXISTS idx_priority ON email_notifications(priority)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_received_at ON email_notifications(received_at DESC)`);
```

---

## 🔄 Updates & Maintenance

### Deploy Updates

```bash
# Make changes locally
git add . && git commit -m "Update feature"
git push origin main

# Railway/Render auto-deploy
# Manual: docker compose pull && docker compose up -d
```

### Backup Database

```bash
# SQLite backup
cp data/emails.db data/emails.db.backup

# Supabase: Automatic backups included
```

---

## 📞 Support

- Check deployment provider's documentation
- Review logs for specific errors
- Test locally first before deploying
- Join community forums for help

---

**Happy deploying! 🚀**

*Last updated: June 2026*
