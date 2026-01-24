Vercel setup for this project (bank-app-deploy)

1) Project root
- In the Vercel dashboard, open your Project → Settings → General.
- Set "Root Directory" to: `bank-app-deploy` (so Vercel uses the `api/` folder there).

2) Build settings
- Framework Preset: `Other` (or choose the detected preset if it matches).
- Build Command: leave blank for pure serverless API-only projects.
- Output Directory: leave empty.

3) Add environment variables (minimum recommended)
- MONGODB_URI (or DATABASE_URL)
- JWT_SECRET
- RESET_BASE (e.g. https://your-app.example)

4) Add env vars via Vercel web UI
- Settings → Environment Variables → Add each key + value and pick Environment = Production / Preview / Development as needed.

5) CLI alternative (interactive)
```bash
# install/login
npm i -g vercel
vercel login

# link current folder to a Vercel project (run from repo root)
cd bank-app-deploy
vercel link

# add production env vars (interactive prompts for values)
vercel env add MONGODB_URI production
vercel env add JWT_SECRET production
vercel env add RESET_BASE production

# add preview/development variants similarly
vercel env add MONGODB_URI preview
vercel env add MONGODB_URI development

# pull vars locally to a file (do not commit)
vercel env pull .env.local
```

6) Deploy
- From the dashboard, click "Deploy" or use CLI:
```bash
vercel --prod
```

7) Quick checks after deploy
- GET https://<your-deployment>/api/health should return 200 JSON.
- POST https://<your-deployment>/api/auth/login should accept POST (not 405).

Notes
- `vercel.json` sets function memory/duration for `api/**/*.js`.
- Keep secrets out of source control. Use Vercel envs for production/preview values.
