Frontend Vercel setup (frontend)

Recommended approach: deploy frontend and backend as two Vercel projects.

1) Frontend project settings (web UI)
- In Vercel dashboard, create a new Project and set Root Directory to: `frontend`.
- Framework Preset: `Create React App` (or `Other` if not detected).
- Build Command: `npm run build`
- Output Directory: `build`

2) Required env var for frontend
- `REACT_APP_API_BASE` — URL of your backend deployment (e.g. `https://your-backend.vercel.app`)
- (This project uses Create React App: environment variables must be prefixed with `REACT_APP_` so they are embedded at build time.)
- Add this in Settings → Environment Variables for Production/Preview/Development.

3) CLI quick commands (link & deploy)
```bash
# install and login
npm i -g vercel
vercel login

# from repo root, link frontend to Vercel project
cd frontend
vercel link

# add REACT_APP_API_BASE (interactive prompt for value)
vercel env add REACT_APP_API_BASE production
vercel env add REACT_APP_API_BASE preview
vercel env add REACT_APP_API_BASE development

# deploy
vercel --prod
```

4) Make frontend talk to backend
- Deploy backend first as its own Vercel project with Root `bank-app-deploy`.
-- After backend deploy, copy its production URL and set it as `REACT_APP_API_BASE` in the frontend project envs.
-- In your frontend code, the project reads environment variables via `process.env.REACT_APP_API_BASE` (or falls back to `process.env.REACT_APP_API_URL` or a default). Use `${process.env.REACT_APP_API_BASE}/api/auth/login` for API calls. Remember CRA embeds env vars at build time — redeploy frontend after changing env vars.

5) Single-project alternative (monorepo)
- You can also have a single Vercel project with Root `.` and configure builds so frontend builds and backend functions live under `bank-app-deploy/api`. This requires careful `vercel.json` routing and is more complex.

6) Quick checks
- After deploying backend and setting `API_BASE`, deploy frontend and test:
  - `GET https://<frontend>/api/health` or fetch `${API_BASE}/api/health` in browser/network tab.
