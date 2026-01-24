# 📋 CLOUDFLARE DEPLOYMENT CHECKLIST

Your bank app is ready to deploy! Check off each step as you complete it.

---

## 🔐 PRE-DEPLOYMENT (REQUIRED)

- [ ] **MongoDB Atlas Setup**
  - [ ] Have MongoDB Atlas free cluster (M0)
  - [ ] Database name: `bank-app`
  - [ ] Strong password set (20+ chars)
  - [ ] Connection string copied
  - [ ] Network Access configured with Cloudflare IPs (NOT 0.0.0.0/0)

- [ ] **Cloudflare Account Ready**
  - [ ] Signed up at https://dash.cloudflare.com
  - [ ] Verified email
  - [ ] GitHub connected to Cloudflare

- [ ] **Security Verified**
  - [ ] `DEMO_SEED=false` in production
  - [ ] No hardcoded secrets in code
  - [ ] JWT secrets generated (32+ chars each)

---

## 📦 DEPLOYMENT STEPS

### Step 1: Deploy Frontend (2-3 minutes)

- [ ] Go to Cloudflare Dashboard → Pages
- [ ] Click "Create a project"
- [ ] Connect GitHub
- [ ] Select repository: `Hadeyeenkah/bank-app`
- [ ] Configure build:
  - [ ] Framework: Create React App
  - [ ] Build command: `npm run build`
  - [ ] Output dir: `build`
  - [ ] Root: `frontend`
- [ ] Click "Deploy"
- [ ] **Note your Pages URL**: `https://YOUR-PROJECT.pages.dev`

✅ **Frontend deployed!**

---

### Step 2: Deploy Backend (5-10 minutes)

- [ ] **Install Wrangler CLI**
  ```bash
  npm install -g wrangler
  wrangler --version
  ```

- [ ] **Login to Cloudflare**
  ```bash
  wrangler login
  ```
  (Browser will open, click "Allow")

- [ ] **Set MongoDB Secret**
  ```bash
  wrangler secret put MONGODB_URI
  ```
  Paste: `mongodb+srv://user:password@cluster.mongodb.net/bank-app?retryWrites=true&w=majority`

- [ ] **Set JWT Secret**
  ```bash
  wrangler secret put JWT_SECRET
  ```
  Paste: Random 32+ char string (use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

- [ ] **Set JWT Refresh Secret**
  ```bash
  wrangler secret put JWT_REFRESH_SECRET
  ```
  Paste: Different 32+ char random string

- [ ] **Deploy Worker**
  ```bash
  wrangler deploy
  ```
  Wait 1-2 minutes...

- [ ] **Note your Worker URL**: `https://bank-app-api.YOUR_ACCOUNT.workers.dev`

✅ **Backend deployed!**

---

### Step 3: Configure MongoDB IP Whitelist

- [ ] Go to MongoDB Atlas → Network Access
- [ ] Click "Add IP Address"
- [ ] Add Cloudflare IP ranges from: https://www.cloudflare.com/ips/
  - [ ] 103.21.244.0/22
  - [ ] 103.22.200.0/22
  - [ ] 103.31.4.0/22
  - [ ] 141.101.64.0/18
  - [ ] 108.162.192.0/18
  - [ ] 190.93.240.0/20
  - [ ] 188.114.96.0/20
  - [ ] 197.234.240.0/22
  - [ ] 198.41.128.0/17
  - [ ] 162.158.0.0/15
  - [ ] 104.16.0.0/13
  - [ ] 104.24.0.0/14

✅ **Database secured!**

---

## ✨ TESTING

### Test Frontend
- [ ] Visit `https://YOUR-PROJECT.pages.dev`
- [ ] See login page? ✅

### Test Backend Health
- [ ] Open browser console (F12)
- [ ] Paste:
  ```javascript
  fetch('https://bank-app-api.YOUR_ACCOUNT.workers.dev/api/health')
    .then(r => r.json())
    .then(d => console.log(d))
  ```
- [ ] See success message? ✅

### Test API Connection
- [ ] Try login on frontend
- [ ] Check browser Network tab
- [ ] API calls going to Workers? ✅

---

## 🔗 YOUR LIVE DEPLOYMENT

**Frontend**: `https://YOUR-PROJECT.pages.dev`

**Backend**: `https://bank-app-api.YOUR_ACCOUNT.workers.dev`

**GitHub**: `https://github.com/Hadeyeenkah/bank-app`

---

## 🆘 TROUBLESHOOTING

### "CORS Error" in browser console
```
Access to fetch at 'https://bank-app-api...' from origin 
'https://YOUR-PROJECT.pages.dev' has been blocked by CORS policy
```

**Solution:**
- Update `workers/api.js` CORS origin to your Pages URL
- Run `wrangler deploy`

### "MongoDB Connection Failed"
```
MongoDB connection required - configure MONGODB_URI secret
```

**Solution:**
- Verify secret: `wrangler secret list`
- Check IP whitelist in MongoDB Atlas
- Test connection locally: `mongosh "mongodb+srv://user:pass@..."`

### "502 Bad Gateway"
**Solution:**
- Check logs: `wrangler tail`
- Verify all 3 secrets are set
- Ensure MongoDB is running

### "Build failed" on Pages
**Solution:**
- Check Pages dashboard build logs
- Verify `frontend/package.json` has all deps
- Run `npm run build` locally to test

---

## 📊 USAGE LIMITS (FREE TIER)

| Resource | Limit |
|----------|-------|
| API Requests | 100,000/day |
| Pages Builds | 500/month |
| Worker CPU Time | 10ms/request |
| Bandwidth | Unlimited |

✅ Your app will stay within limits for normal traffic

---

## 🚀 NEXT STEPS (OPTIONAL)

- [ ] Add custom domain
- [ ] Set up MongoDB backups
- [ ] Enable Cloudflare WAF
- [ ] Configure analytics
- [ ] Set up monitoring/alerts

---

## ✅ DEPLOYMENT COMPLETE!

When all boxes above are checked, your bank app is live! 

**Share your deployed app:**
- Frontend: `https://YOUR-PROJECT.pages.dev`
- API Health: `https://bank-app-api.YOUR_ACCOUNT.workers.dev/api/health`

---

**Stuck?** Check [CLOUDFLARE_QUICK_START.md](CLOUDFLARE_QUICK_START.md) for detailed instructions.

Last Updated: 2026-01-17
