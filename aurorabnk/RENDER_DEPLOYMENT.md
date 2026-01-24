# Deploying Aurora Bank to Render.com

## 🚀 Quick Deployment Guide

### Step 1: Prepare Your Code

1. **Push to GitHub** (already done ✓)
   ```bash
   git add .
   git commit -m "Ready for Render deployment"
   git push
   ```

### Step 2: Deploy Backend (Web Service)

1. **Go to Render Dashboard** → New → Web Service
2. **Connect your GitHub repo**
3. **Configure Backend Service:**
   - **Name**: `aurora-bank-backend` (or your choice)
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free

4. **Add Environment Variables** (click "Advanced" → "Add Environment Variable"):
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/securebank
   JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long_change_in_production
   JWT_REFRESH_SECRET=your_refresh_token_secret_min_32_characters_long
   ENCRYPTION_KEY=your_32_character_encryption_key_here_exactly_32_chars
   CLIENT_ORIGIN=https://your-frontend-name.onrender.com
   API_BASE=https://aurora-bank-backend.onrender.com
   ```
   
   ⚠️ **IMPORTANT**: After you create the frontend, come back and update `CLIENT_ORIGIN` with the actual frontend URL!

5. **Click "Create Web Service"**
6. **Copy the backend URL** (e.g., `https://aurora-bank-backend.onrender.com`)

### Step 3: Deploy Frontend (Static Site)

1. **Go to Render Dashboard** → New → Static Site
2. **Connect your GitHub repo**
3. **Configure Frontend:**
   - **Name**: `aurora-bank-frontend` (or your choice)
   - **Root Directory**: `frontend`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`

4. **Add Environment Variable:**
   ```
   REACT_APP_API_BASE=https://aurora-bank-backend.onrender.com/api
   ```
   Replace with your actual backend URL from Step 2.

5. **Click "Create Static Site"**
6. **Copy the frontend URL** (e.g., `https://aurora-bank-frontend.onrender.com`)

### Step 4: Update Backend CORS

1. **Go back to your Backend Web Service** in Render
2. **Navigate to Environment Variables**
3. **Update `CLIENT_ORIGIN`**:
   ```
   CLIENT_ORIGIN=https://aurora-bank-frontend.onrender.com
   ```
   (Use your actual frontend URL from Step 3)
4. **Click "Save Changes"** - this will trigger a redeploy

### Step 5: Test Your App

1. **Visit your frontend URL**: `https://aurora-bank-frontend.onrender.com`
2. **Test signup/login** - cookies should work now
3. **Test transfers and deposits**
4. **Check browser console** for any errors

---

## 🔧 Troubleshooting

### Login not working / Cookies not set

**Problem**: Backend and frontend are on different domains, cookies blocked.

**Solution** (already implemented ✓):
- Cookie settings use `sameSite: 'none'` and `secure: true` in production
- Make sure `CLIENT_ORIGIN` matches your frontend URL **exactly**
- Check browser console for CORS errors

### "Failed to fetch" errors

**Checklist**:
- ✅ Backend is deployed and running (check Render logs)
- ✅ `REACT_APP_API_BASE` in frontend points to backend URL
- ✅ `CLIENT_ORIGIN` in backend points to frontend URL
- ✅ MongoDB connection string is correct
- ✅ All environment variables are set

### Database connection fails

**Fix**: Ensure MongoDB Atlas allows connections from anywhere:
1. Go to MongoDB Atlas → Network Access
2. Add IP Address: `0.0.0.0/0` (allow all)
3. Or add Render's IP ranges

### Backend crashes on startup

**Check Render logs** for errors:
- Missing environment variables
- MongoDB connection timeout
- Node version mismatch

---

## 📝 Important Notes

### Free Tier Limitations
- **Backend**: Spins down after 15 min of inactivity → First request after idle takes ~30 seconds
- **Frontend**: Always active (static files)
- **Database**: Use MongoDB Atlas free tier (500MB)

### Security Recommendations
1. **Change all secrets** in production (JWT_SECRET, etc.)
2. **Use strong passwords** for MongoDB
3. **Enable 2FA** on your MongoDB Atlas account
4. **Review CORS settings** - only allow your frontend domain

### Environment Variables to Generate

Generate secure secrets:
```bash
# JWT Secret (run in terminal)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT Refresh Secret (run again for different value)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key (exactly 32 chars)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

---

## 🎯 Success Checklist

- [ ] Backend deployed and running on Render
- [ ] Frontend deployed and accessible
- [ ] `CLIENT_ORIGIN` set to frontend URL
- [ ] `REACT_APP_API_BASE` set to backend URL  
- [ ] Login/signup works (check cookies in DevTools)
- [ ] Transfers and deposits save to database
- [ ] Transaction history persists
- [ ] Receipt modals and PDF print work

---

## 🆘 Need Help?

Check Render logs:
1. Go to your Web Service dashboard
2. Click "Logs" tab
3. Look for errors during build/startup

Common error patterns:
- `ECONNREFUSED` → Backend not running or wrong URL
- `CORS` → CLIENT_ORIGIN doesn't match frontend
- `MongooseError` → Database connection issue
- `401 Unauthorized` → Cookie not being sent/received
