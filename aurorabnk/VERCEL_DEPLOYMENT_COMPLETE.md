# 🚀 Aurora Bank - Vercel Deployment Complete Guide

## ✅ Backend Restructuring Complete

Your backend is now optimized for Vercel serverless:

```
backend/
├── api/
│   └── index.js          ← Vercel serverless entry point (NEW)
├── vercel.json           ← Updated for serverless (UPDATED)
├── src/
│   ├── app.js            ← Exports app correctly
│   └── ...
├── server.js             ← Local development entry point
└── package.json          ← All dependencies included
```

### What Changed:
- ✅ Created `backend/api/index.js` - Vercel serverless handler
- ✅ Updated `backend/vercel.json` - Serverless configuration
- ✅ `backend/src/app.js` - Already exports correctly
- ✅ MongoDB URI configured in `.env`

---

## 🔐 Environment Variables Ready

Your MongoDB is configured:
- ✅ MONGODB_URI: `mongodb+srv://securebank:***@securebnk.0am4siz.mongodb.net/securebank`
- ✅ JWT_SECRET: Configured
- ✅ NODE_ENV: Will be `production` on Vercel

---

## 📋 Step-by-Step Deployment

### Step 1: Verify Backend is Ready

```bash
cd backend
npm install  # Ensure all dependencies installed
ls -la api/index.js  # Verify serverless entry point exists
cat vercel.json  # Verify serverless config
```

### Step 2: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate with your Vercel account.

### Step 3: Deploy Backend to Vercel

```bash
cd backend
vercel
```

**Respond to prompts:**
- `Set up and deploy?` → **Yes**
- `Which scope?` → Choose your account
- `Link to existing project?` → **No** (first time)
- `Project name?` → **aurora-bank-backend**
- `Directory to deploy?` → **.** (current directory)
- `Override settings?` → **No**

**You'll get:**
- Preview URL: https://aurora-bank-backend-*.vercel.app
- Production URL: Will get this next

### Step 4: Add Environment Variables to Vercel

The backend needs these secrets in Vercel. Run these commands:

```bash
vercel env add MONGODB_URI
# Paste: mongodb+srv://securebank:Aa123123Aa%24@securebnk.0am4siz.mongodb.net/securebank?retryWrites=true&w=majority

vercel env add JWT_SECRET
# Paste: 64c70e8e20fa5f5e80f18e1d4e286ccb2528a8818e48d850bd99e3662a999a95

vercel env add NODE_ENV
# Paste: production

vercel env add DEMO_SEED
# Paste: false
```

### Step 5: Deploy to Production

```bash
vercel --prod
```

**Save this URL!** You'll need it for the frontend. Example:
```
https://aurora-bank-backend.vercel.app
```

### Step 6: Test Backend Health

```bash
curl https://aurora-bank-backend.vercel.app/api/health
```

Should return:
```json
{
  "status": "success",
  "message": "SecureBank API is running",
  "timestamp": "2026-01-17T...",
  "environment": "production"
}
```

---

## 🌐 Update CORS for Frontend

Edit `backend/src/app.js` and update the CORS origins. Find this section:

```javascript
const productionOrigins = [
  'https://aurorabank.onrender.com',
  'https://aurora-frontend.vercel.app',  // ← Your frontend URL
  'https://*.vercel.app',
];
```

Or if you have a custom domain, update it there.

Then commit and redeploy:

```bash
cd backend
git add src/app.js
git commit -m "chore: update CORS for Vercel frontend"
git push
vercel --prod
```

---

## 📱 Update Frontend Configuration

### Option A: Using Environment Variables (Recommended)

Create `frontend/src/config.js`:

```javascript
export const API_URL = process.env.REACT_APP_API_URL || 'https://aurora-bank-backend.vercel.app';

// For development
if (!process.env.REACT_APP_API_URL) {
  console.warn('⚠️ Using default backend URL. Set REACT_APP_API_URL in production!');
}
```

Then in your API calls (e.g., `LoginPage.js`, `Dashboard.js`):

```javascript
import { API_URL } from './config';

// Instead of:
// fetch('http://localhost:5000/api/login', ...)

// Use:
fetch(`${API_URL}/api/login`, {
  method: 'POST',
  // ... rest of code
});
```

### Option B: Find and Replace (If you prefer direct URLs)

Find all API calls:

```bash
cd frontend
grep -r "localhost:5000" src/
grep -r "localhost:5001" src/
grep -r "fetch.*api" src/ | grep -v "REACT_APP" | head -10
```

Replace manually with your Vercel backend URL.

---

## 🎯 Deploy Frontend to Vercel

### Option 1: Using Vercel CLI (Quick)

```bash
cd frontend
vercel
```

**Respond to prompts:**
- `Set up and deploy?` → **Yes**
- `Project name?` → **aurora-bank-frontend**
- `Directory?` → **.** (current)
- `Override?` → **No**

Add environment variable:

```bash
vercel env add REACT_APP_API_URL
# Paste: https://aurora-bank-backend.vercel.app
```

Deploy to production:

```bash
vercel --prod
```

### Option 2: Using Vercel Dashboard (Recommended for continuous deployment)

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your `bank-app` GitHub repository
4. **Root Directory:** `frontend`
5. **Framework:** Create React App
6. **Build Command:** `npm run build`
7. **Environment Variables:**
   - Name: `REACT_APP_API_URL`
   - Value: `https://aurora-bank-backend.vercel.app`
8. Click "Deploy"

---

## ✅ Testing Checklist

- [ ] Backend deployed to Vercel
- [ ] Backend health check working: `/api/health`
- [ ] CORS updated with frontend URL
- [ ] Frontend deployed to Vercel
- [ ] `REACT_APP_API_URL` environment variable set
- [ ] Frontend can reach backend (check Network tab in DevTools)
- [ ] Login page works
- [ ] Dashboard loads user data
- [ ] Transactions load correctly

### Test Login:

```bash
# Visit your frontend: https://your-frontend.vercel.app
# Open DevTools (F12)
# Try logging in with demo account
# Check Network tab - API calls should go to your backend URL
# Check Console - should be no CORS errors
```

---

## 🐛 Troubleshooting

### Backend Not Deploying?
```bash
cd backend
npm install
vercel --prod --debug
# Check logs for errors
```

### CORS Error in Browser?
- Verify `REACT_APP_API_URL` matches your actual backend URL
- Check `backend/src/app.js` includes your frontend URL in CORS
- Redeploy backend after updating CORS
- Clear browser cache (Ctrl+Shift+Delete)

### API Calls Failing (not CORS)?
```bash
# Check backend logs:
vercel logs aurora-bank-backend
# Look for database connection errors
# Verify MongoDB URI is correct
# Ensure IP 0.0.0.0/0 is whitelisted in MongoDB Atlas
```

### Frontend Not Loading?
```bash
# Check build output:
vercel logs aurora-bank-frontend
# Ensure REACT_APP_API_URL is set
# Check that react-scripts build succeeds locally:
cd frontend && npm run build
```

---

## 🎉 Success Indicators

- ✅ Backend health endpoint returns JSON
- ✅ Frontend loads without errors
- ✅ Login API call succeeds (check Network tab)
- ✅ Dashboard shows user data
- ✅ Transactions and transfers work
- ✅ No CORS errors in console

---

## 📚 Environment Variables Summary

### Backend (vercel/backend/.env.production)
```
MONGODB_URI=mongodb+srv://securebank:Aa123123Aa%24@securebnk.0am4siz.mongodb.net/securebank
JWT_SECRET=64c70e8e20fa5f5e80f18e1d4e286ccb2528a8818e48d850bd99e3662a999a95
NODE_ENV=production
DEMO_SEED=false
```

### Frontend (.env.production)
```
REACT_APP_API_URL=https://aurora-bank-backend.vercel.app
```

---

## 🔗 Useful Links

- Vercel Dashboard: https://vercel.com/dashboard
- MongoDB Atlas: https://cloud.mongodb.com
- Your Backend: https://aurora-bank-backend.vercel.app
- Your Frontend: https://aurora-bank-frontend.vercel.app (after deployment)

---

## 📝 Next Steps

1. ✅ Backend restructured for serverless
2. **→ Install Vercel CLI** (already done!)
3. **→ Deploy backend to Vercel**
4. **→ Configure CORS for your frontend URL**
5. **→ Update frontend with backend URL**
6. **→ Deploy frontend to Vercel**
7. **→ Test everything**

Good luck! 🚀
