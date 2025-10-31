# 🚀 Deployment Guide - Grovio Backend

## ✅ Errors Fixed

The TypeScript compilation errors you encountered have been resolved:

1. ✅ **pdf-invoice.service.ts** - Fixed `helveticaFont` → `helvetica` (16 occurrences)
2. ✅ **order.service.ts** - Added missing `id` field to select query

Your build should now succeed! 🎉

---

## 📋 Pre-Deployment Checklist

### 1. Build Test Locally

```bash
cd backend

# Clean install
rm -rf node_modules
npm install

# Test build
npm run build

# Should complete without errors
✅ dist/ folder created
```

### 2. Verify Environment Variables

```bash
# Create .env.production
cat > .env.production << 'EOF'
# Server
PORT=3000
NODE_ENV=production
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Paystack (LIVE KEYS!)
PAYSTACK_PUBLIC_KEY=pk_live_your_live_key
PAYSTACK_SECRET_KEY=sk_live_your_live_key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# JWT
JWT_SECRET=your_secure_random_string_change_this
JWT_EXPIRES_IN=7d
EOF
```

### 3. Database Migrations

```sql
-- Run in Supabase SQL Editor (Production):
-- 1. src/database/schema.sql
-- 2. src/database/ai-schema.sql
-- 3. src/database/orders-schema.sql
-- 4. src/database/stock-functions.sql
-- 5. src/database/user-preferences-enhanced.sql

-- Verify tables exist:
SELECT table_name 
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected: 19 tables
```

### 4. Supabase Storage

```bash
# Create buckets in Supabase Dashboard → Storage
1. Bucket name: invoices
2. Public: Yes
3. File size limit: 10MB
4. Allowed MIME types: application/pdf, image/png, image/jpeg
```

### 5. Paystack Configuration

```bash
# Production setup:
1. Paystack Dashboard → Settings → API Keys
2. Switch to LIVE mode
3. Copy live keys to .env.production
4. Update webhook URL: https://api.yourdomain.com/api/webhook/paystack
5. Events: charge.success, charge.failed
```

---

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-slim

# Install dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator1 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build TypeScript
RUN pnpm build

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

---

## ☁️ Cloud Deployment Options

### Option 1: Railway (Recommended)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize
railway init

# 4. Add environment variables via dashboard
railway variables set PAYSTACK_SECRET_KEY=sk_live_xxx
railway variables set OPENAI_API_KEY=sk-xxx
# ... add all variables

# 5. Deploy
railway up
```

**Railway Config:**
- No Dockerfile needed
- Auto-detects Node.js
- Runs `npm run build && npm start`

### Option 2: Render

```yaml
# render.yaml
services:
  - type: web
    name: grovio-backend
    env: node
    region: frankfurt
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
      - key: PAYSTACK_SECRET_KEY
        sync: false
      - key: OPENAI_API_KEY
        sync: false
      # Add all env vars
```

### Option 3: Fly.io

```bash
# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Launch
fly launch

# 4. Set secrets
fly secrets set PAYSTACK_SECRET_KEY=sk_live_xxx
fly secrets set OPENAI_API_KEY=sk-xxx

# 5. Deploy
fly deploy
```

### Option 4: VPS (DigitalOcean, Linode, etc.)

```bash
# 1. SSH into server
ssh user@your-server-ip

# 2. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Clone repo
git clone your-repo-url
cd backend

# 4. Install dependencies
npm install

# 5. Build
npm run build

# 6. Install PM2
npm install -g pm2

# 7. Start with PM2
pm2 start dist/server.js --name grovio-backend

# 8. Save PM2 config
pm2 save
pm2 startup
```

---

## 🔧 Deployment-Specific Fixes

### Puppeteer in Docker/Production

The logs show Puppeteer installing successfully. If you get Puppeteer errors:

**Option A: Use pre-installed Chromium**
```dockerfile
# In Dockerfile
RUN apt-get update && apt-get install -y chromium

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

**Option B: Disable PDF-to-image conversion**

```typescript
// In pdf-invoice.service.ts line ~405
private async generatePDFImage(): Promise<string | null> {
  try {
    // Skip in production if Puppeteer fails
    if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_PDF_TO_IMAGE) {
      console.warn('⚠️  PDF to image conversion disabled in production')
      return null
    }
    
    // ... rest of code
  }
}
```

Then set in production:
```bash
ENABLE_PDF_TO_IMAGE=false
```

---

## 🐛 Common Deployment Errors

### Error: "Cannot find module"

**Cause:** Dependencies not installed properly

**Fix:**
```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install

# Or use clean install
npm ci
```

### Error: TypeScript compilation fails

**Cause:** Type errors in code

**Fix:**
```bash
# Run linter locally first
npm run lint

# Check for TypeScript errors
npx tsc --noEmit

# Fix all errors before deploying
```

### Error: "Puppeteer Chromium not found"

**Cause:** Chromium not installed in Docker container

**Fix:**
```dockerfile
# Add to Dockerfile
RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### Error: "EACCES: permission denied"

**Cause:** File permission issues

**Fix:**
```bash
# Change ownership
sudo chown -R node:node /app

# Or run as root (not recommended)
USER root
```

### Error: Port already in use

**Cause:** Port 3000 occupied

**Fix:**
```bash
# System auto-detects next available port
# Or set specific port:
PORT=8080 npm start
```

---

## 📊 Health Checks

### Verify Deployment

```bash
# 1. Health endpoint
curl https://api.yourdomain.com/api/health

# Expected:
{
  "status": "healthy",
  "message": "Grovio Backend Server is running",
  ...
}

# 2. List endpoints
curl https://api.yourdomain.com/

# 3. Test AI
curl -X POST https://api.yourdomain.com/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'

# 4. Test products
curl https://api.yourdomain.com/api/products

# 5. Test bundles
curl https://api.yourdomain.com/api/bundles
```

---

## 🔒 Production Security

### SSL/HTTPS

```bash
# Use Let's Encrypt with Certbot
sudo apt-get install certbot
sudo certbot certonly --standalone -d api.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP (redirect to HTTPS)
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### Environment Variables

```bash
# Never commit .env files!
echo ".env*" >> .gitignore

# Use secrets management:
# - Railway: Built-in secrets
# - Render: Environment variables
# - Fly.io: fly secrets
# - VPS: Use vault or encrypted files
```

---

## 📈 Monitoring

### PM2 Monitoring (if using VPS)

```bash
# View logs
pm2 logs grovio-backend

# Monitor resources
pm2 monit

# View dashboard
pm2 plus
```

### Log Management

```bash
# Redirect logs to file
pm2 start dist/server.js \
  --name grovio-backend \
  --log ./logs/app.log \
  --error ./logs/error.log
```

### Error Tracking (Optional)

```bash
# Install Sentry
npm install @sentry/node

# Add to server.ts
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
})
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy Backend

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
    
    - name: Install dependencies
      run: |
        cd backend
        npm ci
    
    - name: Build
      run: |
        cd backend
        npm run build
    
    - name: Test
      run: |
        cd backend
        npm test
    
    - name: Deploy to Railway
      run: |
        npm install -g @railway/cli
        railway up
      env:
        RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## 🧪 Pre-Deploy Testing

```bash
# 1. Build succeeds
npm run build
✅ No errors

# 2. Start production build
NODE_ENV=production node dist/server.js
✅ Server starts

# 3. Health check
curl http://localhost:3000/api/health
✅ Returns healthy status

# 4. Test critical endpoints
curl -X POST http://localhost:3000/api/auth/signin -d '...'
✅ Authentication works

curl http://localhost:3000/api/products
✅ Products load

curl -X POST http://localhost:3000/api/bundles/generate
✅ Bundles generate

# 5. Test payment flow
curl -X POST http://localhost:3000/api/orders -d '...'
✅ Order creation works
```

---

## 📝 Deployment Steps

### Step 1: Prepare Code

```bash
# 1. Ensure all changes committed
git status

# 2. Run build locally
npm run build

# 3. Check for errors
npm run lint

# 4. Tag release
git tag -a v1.0.0 -m "Production release"
git push origin v1.0.0
```

### Step 2: Deploy

**Railway:**
```bash
railway up
```

**Render:**
```bash
# Push to GitHub
# Render auto-deploys from main branch
```

**Fly.io:**
```bash
fly deploy
```

**VPS:**
```bash
# SSH into server
git pull origin main
cd backend
npm install
npm run build
pm2 restart grovio-backend
```

### Step 3: Verify

```bash
# 1. Check logs
railway logs
# or
pm2 logs grovio-backend

# 2. Test endpoints
curl https://api.yourdomain.com/api/health

# 3. Monitor for 5-10 minutes
# Watch for errors
```

### Step 4: Configure DNS

```bash
# Add A record or CNAME
api.yourdomain.com → your-server-ip
# or
api.yourdomain.com → your-railway-domain.up.railway.app
```

### Step 5: Test Frontend Integration

```bash
# Update frontend API_URL
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Test complete flow:
1. Signup/Signin
2. Browse products
3. Chat with AI
4. Create order
5. Complete payment
6. View invoice
```

---

## 🔍 Troubleshooting Deployment

### Build Fails

```bash
# Error: TypeScript compilation errors
Solution: Run `npm run build` locally, fix all errors

# Error: Out of memory
Solution: Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Error: Missing dependencies
Solution: Delete node_modules and reinstall
rm -rf node_modules && npm install
```

### Runtime Errors

```bash
# Error: Cannot find module
Check: All dependencies in package.json
Fix: npm install

# Error: Environment variables not loaded
Check: .env file exists in deployment
Fix: Set via platform dashboard (Railway/Render)

# Error: Database connection failed
Check: Supabase URL and keys correct
Fix: Verify credentials, check network access

# Error: Puppeteer fails
Solution 1: Install Chromium in container
Solution 2: Disable PDF-to-image (set ENABLE_PDF_TO_IMAGE=false)
```

### Performance Issues

```bash
# Slow responses
- Enable caching
- Use CDN for static assets
- Optimize database queries
- Add database indexes

# High memory usage
- Limit concurrent requests
- Implement request queuing
- Use worker threads for PDF generation

# Timeout errors
- Increase timeout limits
- Use async processing for heavy tasks
- Implement job queue (Bull/BullMQ)
```

---

## 🎯 Production Optimization

### 1. Enable Caching

```typescript
// Add to server.ts
import { createClient } from 'redis'

const redis = createClient({ url: process.env.REDIS_URL })

// Cache product catalog
app.get('/api/products', async (req, res) => {
  const cached = await redis.get('products:all')
  if (cached) return res.json(JSON.parse(cached))
  
  const products = await fetchProducts()
  await redis.setEx('products:all', 300, JSON.stringify(products))
  res.json(products)
})
```

### 2. Compress Responses

```typescript
// Add to server.ts
import compression from 'compression'

app.use(compression())
```

### 3. Database Connection Pooling

```typescript
// Supabase handles this automatically
// But you can optimize:
const supabase = createClient({
  auth: {
    autoRefreshToken: true,
    persistSession: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-custom-header': 'grovio'
    }
  }
})
```

### 4. Rate Limiting (Production)

```typescript
// Stricter limits in production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 50 : 100
})
```

---

## 📊 Monitoring & Logging

### Application Logs

```bash
# PM2
pm2 logs --lines 100

# Docker
docker logs container-id --tail 100 --follow

# Railway
railway logs --tail
```

### Error Tracking

```bash
# Sentry integration
import * as Sentry from '@sentry/node'

Sentry.init({ dsn: process.env.SENTRY_DSN })

app.use(Sentry.Handlers.errorHandler())
```

### Performance Monitoring

```bash
# Add response time logging
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`${req.method} ${req.path} - ${duration}ms`)
  })
  next()
})
```

---

## ✅ Post-Deployment Checklist

- [ ] Build completes successfully
- [ ] Server starts without errors
- [ ] Health endpoint responds
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Supabase storage configured
- [ ] Paystack webhook configured
- [ ] SSL/HTTPS enabled
- [ ] DNS configured
- [ ] Frontend can reach backend
- [ ] Authentication works
- [ ] Payment flow works end-to-end
- [ ] Invoice generation works
- [ ] AI chat responds
- [ ] Bundles load
- [ ] Monitoring configured
- [ ] Backups enabled
- [ ] Error tracking setup

---

## 🆘 Quick Fixes

### Build failing now

```bash
# The TypeScript errors are fixed!
# Just redeploy:
git add .
git commit -m "fix: TypeScript compilation errors"
git push origin main

# Or rebuild:
npm run build
```

### Need to disable Puppeteer

```typescript
// Set environment variable:
ENABLE_PDF_TO_IMAGE=false

// PDF will still generate, just no PNG version
```

### Database connection issues

```bash
# Test connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
supabase.from('products').select('count').then(console.log);
"
```

---

## 🎉 Summary

**Errors Fixed:** ✅
- TypeScript compilation errors resolved
- Ready to redeploy

**Next Steps:**
1. Push changes to git
2. Redeploy (automatic or manual)
3. Verify build succeeds
4. Test production endpoints

**Your backend is ready for production! 🚀**

---

**Need help?** Check logs at deployment platform or run `npm run build` locally first to catch errors early.

