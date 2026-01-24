# 🔑 Render Environment Variables - Quick Copy/Paste

## Backend Web Service Environment Variables

```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/securebank
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long_change_in_production
JWT_REFRESH_SECRET=your_refresh_token_secret_min_32_characters_long
ENCRYPTION_KEY=your_32_character_encryption_key_here_exactly_32_chars
CLIENT_ORIGIN=https://YOUR-FRONTEND-NAME.onrender.com
API_BASE=https://YOUR-BACKEND-NAME.onrender.com
```

## Frontend Static Site Environment Variables

```
REACT_APP_API_BASE=https://YOUR-BACKEND-NAME.onrender.com/api
```

---

## ⚠️ CRITICAL: Update These After Deployment

1. **After backend deploys**: Copy the backend URL
2. **Update frontend's** `REACT_APP_API_BASE` with backend URL
3. **After frontend deploys**: Copy the frontend URL  
4. **Update backend's** `CLIENT_ORIGIN` with frontend URL
5. **Redeploy backend** for CORS to work

---

## 📋 Step-by-Step

### 1. Deploy Backend First
- Create Web Service on Render
- Set all backend environment variables above
- Replace `YOUR-BACKEND-NAME` with your chosen name
- Replace `YOUR-FRONTEND-NAME` with a placeholder (update later)
- Wait for deploy to finish
- **Copy the backend URL** (e.g., `https://aurora-bank-backend.onrender.com`)

### 2. Deploy Frontend
- Create Static Site on Render
- Set `REACT_APP_API_BASE` using the backend URL from step 1
- Wait for deploy to finish
- **Copy the frontend URL** (e.g., `https://aurora-bank-frontend.onrender.com`)

### 3. Update Backend CORS
- Go back to backend Web Service
- Update `CLIENT_ORIGIN` to the frontend URL from step 2
- Save changes (triggers automatic redeploy)

### 4. Test
- Visit frontend URL
- Try login/signup
- Check browser DevTools → Application → Cookies
- Should see `accessToken` and `refreshToken` cookies

---

## 🐛 If Login Still Doesn't Work

1. **Open Browser DevTools** (F12)
2. **Go to Network tab**
3. **Try to login**
4. **Click on the `/login` request**
5. **Check Response Headers** - should see `Set-Cookie`
6. **Check Application tab** → Cookies - should show cookies

**If cookies are NOT set:**
- Verify `CLIENT_ORIGIN` exactly matches frontend URL (no trailing slash)
- Check backend logs in Render for CORS errors
- Ensure backend is running (not in crashed state)

**If cookies ARE set but login fails:**
- Check backend logs for authentication errors
- Verify MongoDB connection is working
- Test backend directly: `https://your-backend.onrender.com/api/auth/login`
