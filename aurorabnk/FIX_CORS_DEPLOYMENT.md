# Fix CORS Error - Deployment Configuration

## Problem
Your deployed frontend at `https://aurora-bank.onrender.com` is trying to connect to `http://localhost:5000` instead of your deployed backend.

## Solution

### Step 1: Get Your Backend URL
First, find your deployed backend URL on Render. It should look like:
- `https://your-backend-name.onrender.com`

### Step 2: Update Frontend Environment Variable on Render

On Render, go to your **frontend service** dashboard:

1. Click on "Environment" in the left sidebar
2. Add this environment variable:
   ```
   Key: REACT_APP_API_BASE
   Value: https://your-backend-name.onrender.com/api
   ```
   (Replace `your-backend-name` with your actual backend service name)
3. Click "Save Changes"
4. Render will automatically redeploy your frontend

### Step 3: Update Backend CORS Configuration on Render

On Render, go to your **backend service** dashboard:

1. Click on "Environment" in the left sidebar
2. Update or add this environment variable:
   ```
   Key: CLIENT_ORIGIN
   Value: https://aurora-bank.onrender.com
   ```
3. Click "Save Changes"
4. Render will automatically redeploy your backend

### Step 4: Verify the Configuration

After both services redeploy:
1. Visit `https://aurora-bank.onrender.com`
2. Try to login
3. The CORS error should be gone!

---

## For Multiple Environments (Optional)

If you want to support both local development and production, you can set:

**Backend** `CLIENT_ORIGIN`:
```
http://localhost:3000,https://aurora-bank.onrender.com
```

This allows both your local and deployed frontend to connect to the backend.

---

## Local Development .env Files

### Frontend `.env` (for local development)
```env
REACT_APP_API_BASE=http://localhost:5000/api
```

### Frontend `.env.production` (already created)
```env
REACT_APP_API_BASE=https://your-backend-name.onrender.com/api
```

### Backend `.env` (local development)
```env
CLIENT_ORIGIN=http://localhost:3000
```

### Backend Environment Variables on Render
```env
CLIENT_ORIGIN=https://aurora-bank.onrender.com
```

---

## Quick Checklist

- [ ] Find your backend Render URL
- [ ] Add `REACT_APP_API_BASE` to frontend Render environment variables
- [ ] Add `CLIENT_ORIGIN` to backend Render environment variables
- [ ] Wait for both services to redeploy
- [ ] Test login on deployed site

---

## Troubleshooting

### Still getting CORS error?
1. Check that both environment variables are set correctly
2. Make sure there are no typos in the URLs
3. Ensure both services have redeployed (check the deployment logs)
4. Clear your browser cache and try again

### Can't find backend URL?
Go to your Render dashboard → Select your backend service → Look at the top for the URL

### Need to check if environment variables are set?
On Render: Dashboard → Service → Environment tab → Verify the variables are there
