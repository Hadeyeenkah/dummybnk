Deployment checklist — Aurora Bank

1) Environment variables
- Ensure the following are set in your deployment environment (Vercel dashboard or equivalent):
  - `MONGO_URI` (MongoDB connection string)
  - `JWT_SECRET` and `JWT_EXPIRES_IN`
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (for email)
  - `STRIPE_SECRET_KEY`, `SENDGRID_API_KEY` (if used)

2) Vercel configuration
- `vercel.json` is present and builds `bank/` as a static build and `api/**/*.js` as functions.
- Confirm Node runtime (nodejs18.x) and function timeouts/memory match needs.

3) Build & test
- Deploy and ensure the `bank` build finishes successfully.
- Visit `https://<your-domain>/api/health` — should return JSON with status: success.
- Test auth endpoints:
  - POST `/api/auth/login` with demo admin credentials (dev-only): returns `token` and `user`.
    - POST `/api/auth/login` with demo admin credentials (dev-only): returns `token` and `user`.
    - Ensure serverless functions can connect to `MONGO_URI` in Vercel; set `MONGO_URI` in Project → Settings → Environment Variables.
  - GET `/api/auth/profile` with `Authorization: Bearer <token>` returns user JSON.

4) Database checks
- Confirm backend connects to `MONGO_URI` and collections exist.
- Check logs for connection errors or authentication failures.

5) Security
- Use strong `JWT_SECRET` and ensure secrets are never committed.
- Enable HTTPS and HSTS via platform or proxy.

6) Post-deploy
- Monitor logs in Vercel for errors and hotfix as necessary.
- Run basic user journeys in the deployed site: signup, login, view dashboard, transfer flow.

Notes
- For local testing, use `npm run dev:all` to run the API adapter and CRA frontend.
- If your real backend differs from the local dev adapter, ensure serverless function code handles MongoDB connection pooling (use a global cached client).
 - For Vercel, set these env vars in both Preview and Production: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `SMTP_*`.
 - Use `npm run seed:reset` locally only when you need to reset demo admin password; do NOT run in production.