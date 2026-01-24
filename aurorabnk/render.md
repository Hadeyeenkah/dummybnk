Render deployment guide for SecureBank

Overview
- This project contains a React frontend in `frontend/` and an Express backend in `backend/`.
- The repository is already prepared to deploy as a single Render Web Service where the backend serves the built frontend.
- The `backend/package.json` includes a `postinstall` script that builds the frontend during `npm install` and a `start` script that runs `node server.js`.

Recommended Render setup (Single Web Service)
1. Create a new Web Service in the Render dashboard
   - Click "New" → "Web Service" → Connect your Git provider and select the repo and branch.

2. Service settings
   - Root Directory: leave blank (use repository root) or set to `/`.
   - Environment: Node
   - Build Command: leave blank (Render runs `npm install` by default, which triggers `postinstall`). Alternatively set to:
     ```bash
     cd backend && npm ci
     ```
   - Start Command: (required)
     ```bash
     cd backend && npm start
     ```
   - Instance Type: choose Free/Starter depending on needs

3. Important environment variables (Render → Service → Environment)
- `MONGODB_URI` — your MongoDB connection string (example: `mongodb+srv://user:Aa123123Aa@cluster.mongodb.net/securebank?retryWrites=true&w=majority`)
- `JWT_SECRET` — a strong secret string for signing JWTs
- `JWT_REFRESH_SECRET` — optional; default falls back to `JWT_SECRET` if not set
- `NODE_ENV` — set to `production`
- `CLIENT_ORIGINS` or `CLIENT_ORIGIN` — comma-separated allowed frontend origin(s). Example: `https://your-frontend.vercel.app,https://aurorabank.onrender.com`
- `DEMO_SEED` — (optional) `true` to seed demo users on first start
- Any DB or external service creds (e.g., email provider, third-party API keys)

Notes about PORT and Render
- Render automatically sets `PORT` environment variable; `backend/server.js` reads `process.env.PORT` so no manual config needed.

What happens during deploy
- Render will run `npm install` in the repo root. The `backend/package.json` includes a `postinstall` script that will `cd ../frontend && npm ci && npm run build` from the `backend` folder. That builds the React app into `frontend/build`.
- `server.js` is configured to serve static files from `../frontend/build` when `NODE_ENV=production`, so the Express app will serve the frontend and API from the same domain.

Alternative: deploy backend only
- If you prefer to host frontend separately (Vercel/Netlify), deploy only the `backend` on Render:
  - When creating the Web Service set Root Directory to `backend`.
  - Build Command: `npm ci`
  - Start Command: `npm start`
  - Then set `REACT_APP_API_URL` in your frontend host to `https://<your-render-service>.onrender.com` and add that host to `CLIENT_ORIGINS`.

Post-deploy checks
- Visit: `https://<your-service>.onrender.com/api/health` should return JSON status.
- Visit root: `https://<your-service>.onrender.com/` should serve the React app.
- If you see CORS errors in logs, add the frontend origin to `CLIENT_ORIGINS` in Render.

Troubleshooting tips
- Build failure: check build logs — ensure Node and npm versions on Render are compatible with your frontend dependencies. You can set `ENGINES` in `package.json` if needed.
- Slow deploy due to building frontend: consider building frontend in CI and committing `frontend/build` (not recommended), or build locally and push an artifact.
- DB connection issues: ensure `MONGODB_URI` is correct and that Atlas or your DB allows Render's IPs (usually no whitelist required for Atlas if using SRV connection string).
- Logs: use the Render Dashboard → Logs to inspect `npm install` and `npm start` output.

Commands to push and trigger deploy
```bash
# Commit your changes and push to your git remote
git add .
git commit -m "Prepare Render deployment: add postinstall build script and render.md"
git push origin main
```
Render will detect the push and trigger a deploy for the connected branch.

Security reminders
- Never commit secrets to the repo. Use Render Environment settings for all secrets.
- Use strong values for `JWT_SECRET`.

Optional improvements
- Add a `render.yaml` for Infrastructure as Code (Render supports a Terraform provider and `render.yaml` for declarative services).
- Add health checks or readiness endpoints for better monitoring.

If you want, I can:
- Provide a ready-to-copy set of environment variable values (redacted templates) to paste into Render, or
- Create a `render.yaml` manifest for the service. 

Files referenced
- Backend server: backend/server.js
- Frontend: frontend/
- Backend package.json (contains `postinstall`): backend/package.json

