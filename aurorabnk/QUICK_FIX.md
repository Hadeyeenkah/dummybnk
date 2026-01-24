# Quick Fix - CORS Error on Render

## The Problem
Your frontend is calling `http://localhost:5000` instead of your deployed backend.

## The Fix (3 Steps)

### 1️⃣ Find Your Backend URL
Go to Render → Backend Service → Copy the URL
Example: `https://aurora-bank-api.onrender.com`

### 2️⃣ Set Frontend Environment Variable
Go to Render → Frontend Service → Environment → Add:
```
REACT_APP_API_BASE = https://YOUR-BACKEND-URL.onrender.com/api
```
(Don't forget `/api` at the end!)

### 3️⃣ Set Backend Environment Variable
Go to Render → Backend Service → Environment → Add:
```
CLIENT_ORIGIN = https://your-netlify-domain.netlify.app
```

**Both services will auto-redeploy. Wait 2-5 minutes, then test!**

---

## Example Values

**Frontend Environment Variables:**
```
REACT_APP_API_BASE=https://aurora-bank-api.onrender.com/api
```

**Backend Environment Variables:**
```
CLIENT_ORIGIN=https://your-netlify-domain.netlify.app
```

Or for multiple origins (local + production):
```
CLIENT_ORIGIN=http://localhost:3000,https://aurora-bank.onrender.com
```

---

## Verify It Works

1. Wait for both services to show "Live" status on Render
2. Open `https://aurora-bank.onrender.com`
3. Open browser console (F12)
4. Try to login
5. No CORS error = Success! ✅
