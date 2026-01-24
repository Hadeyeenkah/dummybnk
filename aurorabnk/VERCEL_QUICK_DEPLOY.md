# 🚀 Vercel Deployment - Quick Reference

## What's Ready to Deploy

✅ **Backend**
- `backend/vercel.json` - Deployment config created
- `backend/src/app.js` - CORS configured for Vercel
- `backend/server.js` - Exports correctly
- All dependencies in `package.json`

✅ **Frontend**
- Already uses `REACT_APP_API_BASE` env variable
- Build script ready
- No code changes needed

---

## Deploy in 5 Minutes

### 1️⃣ Backend to Vercel
```
Go to: https://vercel.com/dashboard
New Project → Import bank-app → Root: backend
Add Environment Variables:
  MONGODB_URI=<your-mongo-url>
  JWT_SECRET=<your-secret>
  NODE_ENV=production
  DEMO_SEED=false
Click Deploy → Get URL (e.g., https://aurora-backend.vercel.app)
```

### 2️⃣ Frontend to Vercel
```
New Project → Import bank-app → Root: frontend
Add Environment Variables:
  REACT_APP_API_BASE=https://aurora-backend.vercel.app/api
Click Deploy → Get URL
```

### 3️⃣ Test
```
Visit: https://aurora-frontend.vercel.app
Try login → Should work!
```

---

## Environment Variables Needed

### Backend
| Variable | Value | Example |
|----------|-------|---------|
| `MONGODB_URI` | Your MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/bank-app` |
| `JWT_SECRET` | Secret key for tokens | Any strong random string |
| `NODE_ENV` | Set to production | `production` |
| `DEMO_SEED` | Disable demo data | `false` |

### Frontend
| Variable | Value | Example |
|----------|-------|---------|
| `REACT_APP_API_BASE` | Your backend URL + /api | `https://aurora-backend.vercel.app/api` |

---

## Files Modified

- ✅ `backend/vercel.json` (created)
- ✅ `backend/src/app.js` (updated CORS)
- Changes committed to git

---

## Verify Deployment

**Backend working?**
```
GET https://aurora-backend.vercel.app/api/health
```

Response should have `"status": "success"`

**Frontend connecting?**
1. Visit frontend URL
2. Open DevTools Console
3. Try login
4. Should see API calls to backend URL
5. No CORS errors = success! ✅

---

## Need Help?

Check [VERCEL_BACKEND_FRONTEND_DEPLOYMENT.md](./VERCEL_BACKEND_FRONTEND_DEPLOYMENT.md) for detailed guide with troubleshooting.

---

**Last Updated**: 2026-01-17
**Status**: Ready to Deploy ✅
