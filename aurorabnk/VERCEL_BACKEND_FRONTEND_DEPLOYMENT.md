# Vercel Backend & Frontend Deployment Guide

## ✅ Completed Steps

Your code is now ready! Here's what we've configured:

### Backend Configuration
- ✅ Created `backend/vercel.json` - Vercel deployment config
- ✅ Updated `backend/src/app.js` - Added Vercel CORS support
- ✅ `backend/server.js` - Already exports app correctly
- ✅ `backend/package.json` - All dependencies included

### Frontend Configuration
- ✅ Frontend already uses `REACT_APP_API_BASE` environment variable
- ✅ Build script configured: `GENERATE_SOURCEMAP=false CI=false react-scripts build`

---

## 📋 Step-by-Step Deployment

### Step 1: Deploy Backend to Vercel

1. **Go to Vercel Console** - https://vercel.com/dashboard
2. **Create a new project**:
   - Click "Add New..." → "Project"
   - Import your `bank-app` GitHub repository
   
3. **Configure Backend Deployment**:
   - **Root Directory**: `backend`
   - **Framework**: Other (or Node.js)
   - **Build Command**: Leave empty (or use `npm install`)
   - **Output Directory**: Leave empty
   - **Environment Variables**: Add all of these:

   ```
   MONGODB_URI=<your-mongodb-connection-string>
   JWT_SECRET=<your-jwt-secret>
   NODE_ENV=production
   DEMO_SEED=false
   ```

   ⚠️ **CRITICAL**: Replace the placeholders with your actual values!
   - `MONGODB_URI`: Get from MongoDB Atlas
   - `JWT_SECRET`: Use a strong random secret

4. **Click "Deploy"**
   - Vercel will build and deploy your backend
   - You'll get a URL like: `https://aurora-backend.vercel.app`
   - **Save this URL** - you'll need it for the frontend!

---

### Step 2: Deploy Frontend to Vercel

1. **In Vercel Dashboard**, create another project:
   - Click "Add New..." → "Project"
   - Import the same `bank-app` repository

2. **Configure Frontend Deployment**:
   - **Root Directory**: `frontend`
   - **Framework**: Create React App
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Environment Variables**: Add this:

   ```
   REACT_APP_API_BASE=https://aurora-backend.vercel.app/api
   ```

   Replace `aurora-backend.vercel.app` with your actual backend URL from Step 1!

3. **Click "Deploy"**
   - Wait for the build to complete
   - You'll get a frontend URL like: `https://aurora-frontend.vercel.app`

---

### Step 3: Update Backend CORS (if needed)

If your frontend is deployed to a different URL, update the CORS settings:

**In `backend/src/app.js`**, the line with Vercel origins:

```javascript
const productionOrigins = [
  'https://aurorabank.onrender.com',
  'https://aurora-frontend.vercel.app',  // ← Your frontend URL
  'https://*.vercel.app', // Matches all Vercel deployments
];
```

Then commit and push:
```bash
git add backend/src/app.js
git commit -m "chore: update Vercel frontend URL in CORS"
git push
```

Vercel will automatically redeploy the backend.

---

## 🔐 Security Checklist

- [ ] ✅ CORS properly configured for Vercel domains
- [ ] ✅ MongoDB password changed from default
- [ ] ✅ JWT_SECRET is strong and unique
- [ ] ✅ DEMO_SEED=false (so demo data isn't seeded in production)
- [ ] ✅ NODE_ENV=production (already set in vercel.json)

---

## 📊 Testing Your Deployment

### Test Backend API
```bash
curl https://aurora-backend.vercel.app/api/health
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

### Test Frontend with Backend
1. Visit your frontend URL: `https://aurora-frontend.vercel.app`
2. Try logging in - it should make API calls to your backend
3. Check browser DevTools Console for any CORS errors

---

## 🐛 Troubleshooting

### CORS Errors?
- Ensure `REACT_APP_API_BASE` is set correctly in frontend environment variables
- Check that your frontend URL is in the CORS whitelist in `backend/src/app.js`
- Backend CORS debug: Visit backend health endpoint and check headers

### API Calls Failing?
- Verify `MONGODB_URI` is correct and accessible
- Check backend logs in Vercel dashboard (Deployments → Details → Logs)
- Ensure JWT_SECRET is the same on both deployments

### Frontend Not Loading?
- Check that frontend build completed successfully
- Verify environment variables are set
- Clear browser cache and try incognito mode

---

## 🚀 Environment Variables Reference

### Backend (`backend/` project in Vercel)
```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/bank-app
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
NODE_ENV=production
DEMO_SEED=false
```

### Frontend (`frontend/` project in Vercel)
```
REACT_APP_API_BASE=https://aurora-backend.vercel.app/api
```

---

## 📝 Next Steps

1. Deploy backend first (get the URL)
2. Deploy frontend with the backend URL
3. Test the health endpoint
4. Try logging in through the frontend
5. Monitor logs if issues occur

Good luck! 🎉
