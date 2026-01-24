# 🚀 Cloudflare Deployment - QUICK START

Your bank app is ready to deploy! Follow these steps in order.

---

## ✅ COMPLETED STEPS

- ✅ Security compliance fixes applied
- ✅ Frontend build created (`build/` folder)
- ✅ Code pushed to GitHub (Hadeyeenkah/bank-app)

---

## 📋 STEP 1: Create Cloudflare Account (if needed)

1. Go to: https://dash.cloudflare.com/sign-up
2. Sign up with email or GitHub (GitHub recommended)
3. Verify your email

---

## 📋 STEP 2: Deploy Frontend to Cloudflare Pages

### 2a. Connect GitHub Repository

1. Go to **Cloudflare Dashboard** → **Pages** → **Create a project**
2. Click **Connect to Git** → **GitHub**
3. Authorize Cloudflare to access your GitHub
4. Select repository: **Hadeyeenkah/bank-app**
5. Click **Begin setup**

### 2b. Configure Build Settings

| Setting | Value |
|---------|-------|
| **Framework preset** | Create React App |
| **Build command** | `npm run build` |
| **Build output directory** | `build` |
| **Root directory** | `frontend` |

### 2c. Deploy

- Click **Save and Deploy**
- Wait for build (2-3 minutes)
- Your site will be live at: **https://YOUR-PROJECT.pages.dev**
- Copy this URL for Step 4

---

## 📋 STEP 3: Set Up MongoDB Atlas Network Access

### IMPORTANT: Secure Setup (NOT 0.0.0.0/0)

1. Go to: https://cloud.mongodb.com
2. Select your cluster → **Network Access**
3. Click **Add IP Address**
4. Get Cloudflare's IP ranges: https://www.cloudflare.com/ips/
5. Add these IP ranges to your whitelist:
   - 103.21.244.0/22
   - 103.22.200.0/22
   - 103.31.4.0/22
   - 141.101.64.0/18
   - 108.162.192.0/18
   - 190.93.240.0/20
   - 188.114.96.0/20
   - 197.234.240.0/22
   - 198.41.128.0/17
   - 162.158.0.0/15
   - 104.16.0.0/13
   - 104.24.0.0/14
   - (add all ranges from Cloudflare docs)

6. **Create database user** (if not done):
   - Username: `cloudflare-worker`
   - Password: Generate strong password (20+ chars, mixed case, numbers, symbols)
   - Copy connection string

7. **Get your MongoDB URI**:
   ```
   mongodb+srv://cloudflare-worker:YOUR_PASSWORD@cluster.mongodb.net/bank-app?retryWrites=true&w=majority
   ```

---

## 📋 STEP 4: Deploy Backend to Cloudflare Workers

### 4a. Install Wrangler CLI

```bash
npm install -g wrangler
wrangler --version  # Should show version number
```

### 4b. Login to Cloudflare

```bash
wrangler login
```

This opens a browser to authenticate. Click "Allow" and return to terminal.

### 4c. Set Secrets

Run these three commands and paste the values when prompted:

```bash
# 1. MongoDB Connection String
wrangler secret put MONGODB_URI
# Paste: mongodb+srv://cloudflare-worker:PASSWORD@cluster.mongodb.net/bank-app?retryWrites=true&w=majority

# 2. JWT Secret (generate random string, min 32 characters)
wrangler secret put JWT_SECRET
# Paste: <random strong string like: aB9$xL2@pQ7mK#sT4vW6nY8jH>

# 3. JWT Refresh Secret (different from above)
wrangler secret put JWT_REFRESH_SECRET
# Paste: <another random string>
```

**Generate strong secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4d. Update CORS Origin

Edit `wrangler.toml` in project root:

```toml
[env.production]
vars = { FRONTEND_URL = "https://YOUR-PROJECT.pages.dev" }
```

Replace `YOUR-PROJECT` with your actual Cloudflare Pages project name.

### 4e. Deploy Backend

```bash
wrangler deploy
```

Wait 1-2 minutes. Your API will be live at:
```
https://bank-app-api.YOUR_ACCOUNT.workers.dev
```

---

## 📋 STEP 5: Connect Frontend to Backend

### Option A: Update Frontend API Endpoint (RECOMMENDED)

Edit `frontend/src/config.js` or similar to use your Workers URL:

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'https://bank-app-api.YOUR_ACCOUNT.workers.dev/api';
```

Then redeploy frontend:
```bash
cd frontend && npm run build
git add .
git commit -m "Update API endpoint to production"
git push
```

Cloudflare Pages will auto-deploy.

### Option B: Use Relative URLs (If on same domain)

If deploying backend to Pages Functions instead, leave API URLs as `/api`.

---

## 📋 STEP 6: Test Your Deployment

### Test Frontend
1. Visit: `https://YOUR-PROJECT.pages.dev`
2. You should see the login page

### Test Backend
1. Open browser console (F12)
2. Run:
```javascript
fetch('https://bank-app-api.YOUR_ACCOUNT.workers.dev/api/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

Should return:
```json
{
  "status": "success",
  "message": "API running on Cloudflare Workers",
  "timestamp": "2026-01-17T..."
}
```

### Test Login
1. Try logging in with test credentials
2. Check browser Network tab to verify API calls

---

## 🔧 Troubleshooting

### CORS Error in Browser
- Verify CORS origin in Workers code matches Pages URL
- Check wrangler.toml is deployed correctly
- Run: `wrangler deploy --env production`

### Database Connection Failed
- Verify MongoDB URI secret: `wrangler secret list`
- Check IP whitelist in MongoDB Atlas includes Cloudflare IPs
- Test connection string locally: `mongosh "mongodb+srv://..."`

### 502 Bad Gateway
- Check Workers logs: `wrangler tail`
- Ensure all environment variables are set
- Verify database is running

### Build Failed on Pages
- Check build logs in Cloudflare dashboard
- Ensure `frontend/package.json` has all dependencies
- Run locally: `npm run build` to test

---

## 📊 Free Tier Limits

Your free Cloudflare plan includes:
- **100,000 requests/day** (API + Frontend)
- **500 builds/month**
- **Unlimited bandwidth**
- **Global CDN**

---

## 🎯 Next Steps

1. **Custom Domain** (Optional)
   - Add your domain in Cloudflare Dashboard
   - Point DNS to Cloudflare nameservers

2. **Auto-Scale Database**
   - Upgrade MongoDB Atlas cluster if needed
   - Use connection pooling for Workers

3. **Monitor & Alert**
   - Set up Cloudflare Analytics
   - Enable MongoDB alerts

4. **CI/CD Pipeline** (Optional)
   - Auto-deploy on GitHub push (already configured)
   - Add tests before deployment

---

## 📞 Support Links

- **Cloudflare Docs**: https://developers.cloudflare.com/pages/
- **MongoDB Atlas**: https://www.mongodb.com/docs/atlas/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/
- **Your Bank App**: https://github.com/Hadeyeenkah/bank-app

---

## ✨ You're All Set!

Your bank app is now deployed on Cloudflare's free tier. Follow the steps above to get it live. If you hit any issues, check the troubleshooting section or reach out!

**Timeline**: 
- Frontend: 2-3 minutes
- Backend: 1-2 minutes
- Database: 5 minutes
- **Total: ~15 minutes**

Good luck! 🚀
