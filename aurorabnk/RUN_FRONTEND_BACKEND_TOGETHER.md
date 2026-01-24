# 🚀 Running Frontend + Backend Together

## Option 1: Local Development (Recommended)

### Install concurrently package:

```bash
npm install
```

This installs the `concurrently` package which allows running both services simultaneously.

### Run both together:

```bash
npm start
```

This will:
- ✅ Start backend on `http://localhost:5000`
- ✅ Start frontend on `http://localhost:3000`
- ✅ Both run in the same terminal

### Run in development mode (with auto-reload):

```bash
npm run dev
```

---

## Option 2: Render Deployment (FIXED - Single Service)

The issue on Render is that you're running frontend and backend as **separate services**, which causes delays.

### **BEST SOLUTION**: Run everything from one service

Instead of 2 separate Render services, use **1 service** that serves both:

### On Render Dashboard:

1. **Keep only the Backend Web Service** (delete the frontend static site)

2. **Update Backend Render Configuration:**
   - **Name**: `aurora-bank-backend`
   - **Root Directory**: `backend`
   - **Build Command**: 
     ```
     cd .. && npm install && cd backend && npm install && cd ../frontend && npm run build
     ```
   - **Start Command**: 
     ```
     node server.js
     ```

3. **Add these Environment Variables:**
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=<your-mongodb-uri>
   JWT_SECRET=<your-jwt-secret>
   CLIENT_ORIGIN=https://your-service-name.onrender.com
   API_BASE=https://your-service-name.onrender.com
   ```

### Update Backend server.js to Serve Frontend

Add this to your backend `server.js` (after all API routes, before the 404 handler):

```javascript
// ============================================
// Serve frontend build in production
// ============================================
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const frontendBuildPath = path.join(__dirname, '../frontend/build');
  
  app.use(express.static(frontendBuildPath));
  
  // Serve index.html for all non-API routes (React Router)
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}
```

---

## Option 3: Docker (Most Professional)

Create a `Dockerfile` at the root of your project:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY backend ./backend
COPY frontend ./frontend

RUN cd backend && npm install
RUN cd ../frontend && npm install && npm run build

FROM node:18-alpine

WORKDIR /app
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/build ./frontend/build
COPY --from=builder /app/package*.json ./

RUN cd backend && npm install --production

EXPOSE 10000

CMD ["node", "backend/server.js"]
```

Then deploy this single Docker image to Render.

---

## Why Your Login is Failing

The error "invalid credentials" happens because:

1. ❌ **Frontend and backend are separate services on Render**
2. ❌ **Frontend tries to reach backend API**
3. ❌ **Backend takes 30+ seconds to wake up from idle**
4. ❌ **Request times out, backend never responds**
5. ❌ Frontend shows error (looks like login failure)

---

## Quick Fix Now (5 minutes)

If you want a quick fix without reorganizing:

1. Go to your backend `server.js`
2. Add this line after your CORS setup:

```javascript
// Add to server.js after line ~70 (after corsOptions):
console.log('🔒 Allowed CORS origins:', allowedOrigins);
console.log('✅ Server is starting...');
console.log('📍 Frontend should use: ' + (process.env.CLIENT_ORIGIN || 'http://localhost:3000'));
```

3. Update your **frontend .env.production**:

```
REACT_APP_API_BASE_URL=https://your-actual-backend-url.onrender.com
```

Make sure there's NO trailing slash and it matches your actual Render backend URL.

---

## Recommended Next Steps

1. ✅ Run `npm install` in root directory (if not done)
2. ✅ Test locally with `npm start`
3. ✅ Decide which deployment option (2 or 3)
4. ✅ Update Render configuration accordingly
5. ✅ Test login with fresh browser cache

Let me know if you need help with any specific step!
