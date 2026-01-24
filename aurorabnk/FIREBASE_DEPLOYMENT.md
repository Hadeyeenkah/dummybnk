# Firebase Deployment Guide

## Quick Deploy Steps

### 1. Initialize Firebase Project
```bash
# List your Firebase projects
firebase projects:list

# Link this repo to your Firebase project
firebase use --add
# Select your project ID when prompted, or create a new one at https://console.firebase.google.com
```

### 2. Set Environment Secrets
Cloud Functions need your backend environment variables. Set them as secrets:

```bash
# MongoDB connection string (required)
firebase functions:secrets:set MONGODB_URI
# Paste your MongoDB Atlas URI when prompted, e.g.:
# mongodb+srv://username:password@cluster.mongodb.net/securebank

# JWT secrets (required)
firebase functions:secrets:set JWT_SECRET
# Enter a long random string, e.g.: your-super-secret-jwt-key-change-this

firebase functions:secrets:set JWT_REFRESH_SECRET
# Enter another long random string

# Optional: Add allowed frontend origins (comma-separated)
firebase functions:secrets:set CLIENT_ORIGINS
# Example: https://yourdomain.com,https://staging.yourdomain.com
```

### 3. Build and Deploy
```bash
# Install dependencies and build frontend
npm ci --prefix frontend
npm run build --prefix frontend

# Install backend dependencies
npm ci --prefix backend

# Deploy everything (Hosting + Functions)
firebase deploy

# Or deploy selectively:
firebase deploy --only hosting    # Frontend only
firebase deploy --only functions  # Backend only
```

### 4. View Your Live App
After deployment completes, you'll see:
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/YOUR_PROJECT/overview
Hosting URL: https://YOUR_PROJECT.web.app
```

Visit the Hosting URL to see your live app!

---

## Important Notes

### Billing Requirement
- **Firebase Hosting** is free (generous limits)
- **Cloud Functions** require the **Blaze Plan** (pay-as-you-go with billing enabled)
- 🎁 Blaze plan includes generous free tier:
  - 2M function invocations/month
  - 400K GB-seconds compute time/month
  - 5GB outbound data/month
  
For low-traffic apps, you'll likely stay within free limits but **a credit card is required**.

### MongoDB Setup
You need a MongoDB database. Options:
1. **MongoDB Atlas** (recommended): Free M0 cluster at https://www.mongodb.com/cloud/atlas
2. **Local MongoDB**: Set up MongoDB locally and use a connection string

### API Endpoints
After deployment, your API is available at:
- `https://YOUR_PROJECT.web.app/api/auth/login`
- `https://YOUR_PROJECT.web.app/api/transactions`
- etc.

The `/api/*` paths are automatically routed to your Cloud Function.

---

## Troubleshooting

### Functions deployment fails
```bash
# Check logs
firebase functions:log

# Verify secrets are set
firebase functions:secrets:access MONGODB_URI
```

### CORS errors
Your backend already allows Firebase Hosting origins (`*.web.app`, `*.firebaseapp.com`). If using a custom domain, add it:
```bash
firebase functions:secrets:set CLIENT_ORIGINS
# Enter: https://yourcustomdomain.com
```

### Database connection issues
1. Verify `MONGODB_URI` secret is set correctly
2. Check MongoDB Atlas network access allows Firebase IPs (0.0.0.0/0 for testing)
3. View function logs: `firebase functions:log`

---

## Project Structure

```
firebase.json                    # Firebase config (hosting + functions)
firebase/functions/
  ├── index.js                  # Cloud Function wrapping Express app
  └── package.json              # Function dependencies
backend/                        # Your Express API (imported by function)
frontend/build/                 # React build (served by Hosting)
```

---

## Custom Domain (Optional)

```bash
# Add custom domain in Firebase Console or CLI
firebase hosting:channel:deploy live --domain yourdomain.com
```

Follow prompts to verify domain ownership and update DNS records.

---

## Update Deployment

To deploy updates:
```bash
# Rebuild frontend if changed
npm run build --prefix frontend

# Deploy
firebase deploy
```

Functions will automatically reinstall backend dependencies during deployment.

---

## Cost Monitoring

Monitor usage at: https://console.firebase.google.com/project/YOUR_PROJECT/usage

Set up budget alerts in Google Cloud Console to avoid surprises.
