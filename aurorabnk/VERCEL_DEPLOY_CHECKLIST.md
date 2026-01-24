VERCEL DEPLOY CHECKLIST

Purpose: Quick steps to deploy frontend + backend to Vercel and connect your existing MongoDB Atlas database so users can log in.

- **Required env vars:**
  - `MONGODB_URI`: MongoDB Atlas connection string (SRV or standard). Example: `mongodb+srv://user:pass@cluster.mongodb.net/securebank`.
  - `JWT_SECRET`: strong random secret used to sign access tokens.
  - `JWT_REFRESH_SECRET` (optional): refresh token secret; falls back to `JWT_SECRET` if not set.
  - `CLIENT_ORIGINS`: comma-separated frontend origins (e.g. `https://your-site.vercel.app`).
  - `DEMO_SEED`: `false` in production (optional).
  - `NODE_ENV`: `production`.

- **Add env vars using Vercel CLI (recommended):**

```bash
vercel login
vercel link                # link project to Vercel (if not already)

# Add MONGODB_URI to all environments (production, preview, development)
vercel env add MONGODB_URI production
vercel env add MONGODB_URI preview
vercel env add MONGODB_URI development

vercel env add JWT_SECRET production
vercel env add JWT_SECRET preview
vercel env add JWT_SECRET development

# Optional: add other secrets
vercel env add JWT_REFRESH_SECRET production
vercel env add CLIENT_ORIGINS production
```

- **Or add via Vercel Dashboard:** Project → Settings → Environment Variables → Add key/value for Preview and Production.

- **MongoDB Atlas network access:**
  - Ensure Atlas allows connections from Vercel serverless functions. For quick testing, add IP `0.0.0.0/0` temporarily, then tighten for production (use VPC peering if needed).

- **Sanitize repo:**
  - Remove any committed secrets. `backend/.env` was sanitized in this repo — don't keep real credentials in source control.

- **Deploy:**

```bash
vercel --prod
# Or push to GitHub and use Vercel import (auto-deploys on git push)
```

- **Check logs / DB connection:**

```bash
vercel logs <deployment-url-or-project-name> --prod
# Or use the Vercel dashboard Logs tab to view function startup and DB connection messages
```

- **Verify login (quick check):**
  - Use `backend/scripts/test_login.js` to confirm server-side login works (no frontend involved):

```bash
MONGODB_URI="<your-uri>" node backend/scripts/test_login.js
```

  - Or test via curl against the deployed API (replace origin and credentials):

```bash
curl -X POST https://your-vercel-domain/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

- **Notes / tips:**
  - This repo uses a lazy, retrying Mongoose connection (`backend/src/config/database.js`) which is serverless-friendly.
  - If you see authentication or network errors from Atlas, confirm credentials and IP access.
  - Set `CLIENT_ORIGINS` to your deployed frontend URL so CORS allows browser logins.
  - After deploy, test login end-to-end from the frontend and watch function logs for DB connection messages.

If you want, I can run the `vercel env add` commands for you (you'll need to run `vercel login` locally) or I can prepare a small PR to add an automated deploy script.
