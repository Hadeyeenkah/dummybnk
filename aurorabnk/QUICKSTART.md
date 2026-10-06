# 🚀 Quick Start Guide

## Start the Backend (Terminal 1)

```bash
cd backend
node server.js
```

Keep this terminal running. You should see:
```
🚀 Server running on port 5000
⚠️  MongoDB connection failed: connect ECONNREFUSED...
Server will continue without database...
```

✅ The MongoDB warning is **expected** - server works without it for development!

## Start the Frontend (Terminal 2)

```bash
cd frontend
npm start
```

Browser will open at `http://localhost:3000`

## Test the App

1. Click **"Get Started"** → Fill out signup form
2. Check your **backend terminal** for the verification link:
   ```
   [EMAIL] Verification to your@email.com: http://localhost:5000/api/auth/verify-email?token=abc123...
   ```
3. Copy that URL and paste it in your browser to verify email
4. Wait for an administrator to approve the registration
5. Go back to app → Click **"Sign In"** → Login with your credentials

## CORS Error Fix

If you see CORS errors in the browser console:

1. **Make sure backend is running** on port 5000
2. **Check** `backend/.env` has:
   ```
   CLIENT_ORIGIN=http://localhost:3000
   ```
3. **Restart the backend server** (Ctrl+C, then `node server.js` again)
4. **Refresh** your browser (Ctrl+Shift+R to hard refresh)

## Features to Try

### Banking Features
- 💸 **Transfer Money** - Send money to other users by email
- 💳 **Pay Bills** - Pay utilities, internet, etc.
- 📱 **Deposit Check** - Mobile check deposit interface
- 🔒 **Card Controls** - Lock/unlock your card
- 📊 **Transactions** - View complete history

### Security Features
After logging in, you can:
- ✉️ **Email Verification** - Already required for signup!
- 🔐 **Enable 2FA** - Add this feature from your dashboard settings
- 👤 **Role-Based Access** - Admin users get extra permissions

## Admin Account

Use a provisioned admin account. Public signup never grants admin privileges; the demo admin account is created by the backend's demo-user seeding process.

## Default Test Users

These exist in the frontend context (for UI testing without backend):
- **Email**: `jamie@example.com` or `alex@example.com`
- **Password**: Any password

But for **real authentication**, you must sign up through the backend!

## Stopping the Servers

- **Backend**: Press `Ctrl+C` in Terminal 1
- **Frontend**: Press `Ctrl+C` in Terminal 2

## Need Help?

See `SETUP_COMPLETE.md` for detailed documentation including:
- API endpoints
- Testing with curl commands
- Troubleshooting guide
- Security features explained
