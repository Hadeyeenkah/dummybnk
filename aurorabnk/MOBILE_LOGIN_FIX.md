# Mobile Login Troubleshooting Guide

## Issue
Login works on laptop but fails on iPhone/mobile devices.

## Root Cause
The issue was related to **SameSite cookie settings** and **CORS configuration** not being properly configured for cross-device/cross-origin requests.

## Fixes Applied

### 1. Cookie SameSite Setting ✅
**File**: `backend/src/utils/tokenUtils.js`

Changed from:
```javascript
sameSite: isProd ? 'none' : 'lax'
```

To:
```javascript
sameSite: 'none' // Allow cross-origin cookies (needed for mobile, different domains)
```

**Why**: Mobile browsers (especially Safari on iOS) are strict with `lax` SameSite cookies. Using `none` allows cookies to be sent cross-origin, which is necessary when:
- Accessing from different domains
- Using mobile apps
- Accessing from different networks

### 2. CORS Headers Enhancement ✅
**File**: `backend/server.js`

Added:
- `exposedHeaders: ['Set-Cookie']` - Explicitly expose Set-Cookie header
- `maxAge: 86400` - Cache CORS preflight for 24 hours

### 3. Enhanced Login Debugging ✅
**File**: `frontend/src/context/BankContext.js`

Added console logging to help diagnose login issues:
- API endpoint being called
- Response status codes
- Response headers (including Set-Cookie)
- Detailed error messages

## Testing on Mobile

### For iPhone (iOS)
1. Make sure you're accessing via the correct URL (not localhost)
2. Use your laptop's IP address: `http://192.168.x.x:3000`
3. Open browser DevTools (if Safari) or use Remote Inspector
4. Check console for the logged authentication flow

### For Android
1. Use the same IP address approach
2. Open Chrome DevTools via `chrome://inspect`
3. Check application cookies in DevTools

## Step-by-Step Mobile Testing

1. **Start Backend Server**
   ```bash
   cd backend
   npm start
   # Should see: "🚀 Server running on port 5000"
   ```

2. **Start Frontend (in separate terminal)**
   ```bash
   cd frontend
   npm start
   # Should see: "Compiled successfully!"
   ```

3. **On Mobile Device**
   - Find your laptop's IP address:
     ```bash
     # On Linux/Mac
     ifconfig | grep "inet " | grep -v 127.0.0.1
     
     # On Windows
     ipconfig | findstr "IPv4"
     ```
   - Navigate to: `http://<YOUR_IP>:3000`
   - Try logging in
   - **Open DevTools/Browser Console and check for logs:**
     - "🔐 Login attempt: [email]"
     - "📡 Login response status: 200"
     - "✅ Login successful"

## Environment Variables to Check

### Frontend (.env or .env.local)
```
REACT_APP_API_BASE=http://192.168.x.x:5000/api
```
❌ **Don't use**: `localhost:5000` or `127.0.0.1:5000` on mobile

### Backend (.env)
```
CLIENT_ORIGIN=http://localhost:3000,http://192.168.x.x:3000
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

## Common Issues & Solutions

### Issue: "Login successful" but page doesn't update
**Solution**: Check if `fetchProfile()` is working
- Open DevTools network tab
- Look for the profile API call
- Check if it returns 200 with user data

### Issue: Cookies not being saved
**Solution**: Verify cookie settings
- Open mobile DevTools
- Go to Application → Cookies
- Check if `accessToken` and `refreshToken` are present
- They should have `SameSite=None` and `Secure=false` (in dev)

### Issue: "Network error" message
**Solution**: Check API endpoint connectivity
- Open DevTools Network tab
- Try accessing `http://<YOUR_IP>:5000` directly
- You should get a JSON response: `{"status":"success",...}`

### Issue: CORS error in console
**Solution**: Ensure proper CORS origins
- Backend logs should show: `✅ CORS allowed origin: http://192.168.x.x:3000`
- If not, update `CLIENT_ORIGIN` in backend `.env`

## Debugging Commands

### Check if backend is running
```bash
curl http://localhost:5000
```
Should return the API status JSON.

### Check CORS headers
```bash
curl -i -X OPTIONS http://localhost:5000/api/auth/login
```
Should show `Access-Control-Allow-Origin` header.

### Test login directly
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Production Deployment

When deploying, ensure:
1. Set `NODE_ENV=production`
2. Set `FORCE_SECURE_COOKIES=true` (for HTTPS)
3. Update `CLIENT_ORIGIN` with actual domain(s)
4. Enable HTTPS (required for `sameSite: 'none'`)

## Quick Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] Using IP address on mobile (not localhost)
- [ ] API_BASE uses IP address on frontend
- [ ] Network tab shows successful login response (200)
- [ ] Cookies visible in DevTools Application tab
- [ ] Console shows "✅ Profile fetched, user authenticated"
- [ ] Page redirects to dashboard/admin after login

## Still Having Issues?

1. **Clear all data**:
   - Mobile: Settings → Safari/Chrome → Clear History & Website Data
   - Frontend: Clear localStorage (Console: `localStorage.clear()`)

2. **Check backend logs**:
   - Should show login request and successful auth
   - Look for any error messages

3. **Verify network connectivity**:
   - Ping backend: `ping 192.168.x.x -c 1`
   - Try accessing `http://192.168.x.x:5000` in mobile browser

4. **Check browser compatibility**:
   - iOS: Safari, Chrome (both should work now)
   - Android: Chrome, Firefox (both should work)

## Additional Resources

- [MDN: SameSite Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OWASP: Cross-Site Request Forgery](https://owasp.org/www-community/attacks/csrf)
