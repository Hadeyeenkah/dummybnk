# Cloudflare Pages + Workers Deployment Guide

Deploy your full-stack bank app on Cloudflare for FREE (no credit card required)!

## Why Cloudflare?

✅ **Frontend + Backend** in one free plan  
✅ **No cold starts** (instant responses)  
✅ **No credit card** required  
✅ **Generous free tier**: 100K requests/day  
✅ **Global CDN** built-in  

---

## Prerequisites

1. **Cloudflare account**: Sign up at https://dash.cloudflare.com/sign-up
2. **GitHub/GitLab repo**: Push your code to GitHub (Cloudflare deploys from Git)
3. **MongoDB Atlas**: Free M0 cluster at https://www.mongodb.com/cloud/atlas

---

## Step-by-Step Deployment

### 1️⃣ Prepare Your Backend for Workers

Cloudflare Workers use a different runtime than Node.js (no Express.listen()). We'll adapt your backend.

**Option A: Use Hono (Express-like for Workers)**

Install Hono in your backend:
```bash
cd backend
npm install hono
```

**Option B: Keep Express + Use Adapter**

Use a compatibility layer:
```bash
cd backend
npm install @cloudflare/workers-adapter
```

I'll create the Worker code for you below.

---

### 2️⃣ Create Worker Entry Point

Create `workers/api.js` in your project root:

```javascript
// workers/api.js
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// CORS for your frontend
app.use('*', cors({
  origin: ['https://your-app.pages.dev'], // Update after deploying frontend
  credentials: true,
}))

// Health check
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'success', 
    message: 'API running on Cloudflare Workers',
    timestamp: new Date().toISOString()
  })
})

// Your API routes here
app.post('/api/auth/login', async (c) => {
  // Access env vars: c.env.MONGODB_URI
  // Your login logic here
  return c.json({ message: 'Login endpoint' })
})

// Add all your other routes...

export default app
```

---

### 3️⃣ Create wrangler.toml Configuration

Create `wrangler.toml` in project root:

```toml
name = "bank-app-api"
main = "workers/api.js"
compatibility_date = "2024-01-01"

# Environment variables (non-secret)
[vars]
NODE_ENV = "production"

# Secrets (set via CLI - see step 5)
# MONGODB_URI
# JWT_SECRET
# JWT_REFRESH_SECRET
```

---

### 4️⃣ Push to GitHub

```bash
# Initialize git if not already
git init
git add .
git commit -m "Prepare for Cloudflare deployment"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/bank-app.git
git branch -M main
git push -u origin main
```

---

### 5️⃣ Deploy Frontend to Cloudflare Pages

1. **Go to Cloudflare Dashboard** → **Pages** → **Create a project**
2. **Connect your GitHub** repository
3. **Configure build settings**:
   - **Framework preset**: Create React App
   - **Build command**: `npm run build`
   - **Build output directory**: `build`
   - **Root directory**: `frontend`
4. **Add environment variables** (if your frontend needs them):
   - `REACT_APP_API_URL` = `/api` (or leave default)
5. **Click "Save and Deploy"**

Your frontend will be live at: `https://YOUR_PROJECT.pages.dev`

---

### 6️⃣ Deploy Backend to Cloudflare Workers

**Install Wrangler CLI:**
```bash
npm install -g wrangler
wrangler login
```

**Set secrets (one time):**
```bash
wrangler secret put MONGODB_URI
# Paste your MongoDB Atlas connection string

wrangler secret put JWT_SECRET
# Paste a strong random string

wrangler secret put JWT_REFRESH_SECRET
# Paste another strong random string
```

**Deploy Worker:**
```bash
wrangler deploy
```

Your API will be live at: `https://bank-app-api.YOUR_SUBDOMAIN.workers.dev`

---

### 7️⃣ Connect Frontend to Backend

**Option A: Use Pages Functions (Recommended)**

Cloudflare Pages can run Workers directly without a separate domain:

1. Move `workers/api.js` to `frontend/functions/api/[[path]].js`
2. The Worker will automatically handle `/api/*` routes
3. Redeploy: `git push` (Pages auto-deploys)

**Option B: Use Custom Worker + Routing**

Add a `_routes.json` in your Pages project to proxy `/api/*` to your Worker.

---

### 8️⃣ MongoDB Atlas Network Access (SECURE METHOD)

Allow Cloudflare Workers to connect safely:

**Option A: IP Whitelist (Recommended for security)**
1. Go to MongoDB Atlas → **Network Access** → **Add IP Address**
2. Find Cloudflare's IP ranges at: https://www.cloudflare.com/ips/
3. Add Cloudflare IP ranges (constantly updated)
4. Enable **IP Whitelist Auto-Update** if available

**Option B: Use MongoDB App Services (App Access)**
1. Go to **App Services** → Create API Key authentication
2. Use API Key instead of IP whitelist
3. More secure for Workers environments

**⚠️ NEVER use 0.0.0.0/0 (allows anyone to connect)**
- Violates hosting terms of service (security/liability)
- Opens your database to unauthorized access
- Could result in account suspension
- Use strong passwords + IP whitelist instead

---

### 9️⃣ Update CORS Origins

After deployment, update your Worker CORS to include your Pages URL:

```javascript
app.use('*', cors({
  origin: ['https://your-actual-project.pages.dev'],
  credentials: true,
}))
```

Redeploy: `wrangler deploy`

---

## Quick Deploy Commands Summary

```bash
# 1. Build frontend
cd frontend
npm ci
npm run build

# 2. Deploy frontend (via GitHub push triggers auto-deploy)
git add .
git commit -m "Deploy to Cloudflare"
git push

# 3. Deploy backend Worker
cd ..
wrangler login
wrangler secret put MONGODB_URI
wrangler secret put JWT_SECRET
wrangler secret put JWT_REFRESH_SECRET
wrangler deploy
```

---

## Cloudflare Free Tier Limits

| Resource | Free Tier |
|----------|-----------|
| Requests | 100,000/day |
| Duration | 10ms CPU time/request |
| Storage (KV) | 1GB |
| Pages builds | 500/month |
| Bandwidth | Unlimited |

**Note**: Your app will likely stay within these limits for low-medium traffic.

---

## Alternative: Use Pages Functions Instead of Workers

Cloudflare Pages can run serverless functions directly in the `functions/` folder:

```
frontend/
  functions/
    api/
      [[path]].js  ← Your backend logic here
```

This is simpler as everything is in one deployment. The trade-off: functions are limited to 1MB after bundling.

---

## Troubleshooting

### Database connection errors
- Verify MongoDB URI secret: `wrangler secret list`
- Check Atlas network access allows 0.0.0.0/0
- Use connection pooling (Workers are stateless)

### CORS errors
- Update Worker CORS origin to match your Pages domain
- Ensure credentials: true if using cookies

### Build failures
- Check build logs in Pages dashboard
- Verify package.json scripts are correct
- Ensure all dependencies are listed

---

## Cost Comparison

| Platform | Frontend | Backend | Credit Card | Free Tier |
|----------|----------|---------|-------------|-----------|
| Firebase | Free | ❌ Requires Blaze | Required | Limited |
| Netlify | Free | ⚠️ Limited | Optional | 125K requests/mo |
| Cloudflare | Free | ✅ Free | ❌ Not required | 100K requests/day |

**Winner**: Cloudflare for completely free full-stack hosting!

---

## Next Steps

1. Want me to convert your Express backend to Hono/Workers format?
2. Need help setting up MongoDB connection pooling for Workers?
3. Want to add custom domain setup?

Let me know which part you need help with!
