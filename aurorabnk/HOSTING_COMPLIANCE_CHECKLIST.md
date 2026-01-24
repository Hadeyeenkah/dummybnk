# Hosting Terms Compliance Checklist ✅

This document ensures your app complies with ALL hosting providers' terms of service (Cloudflare, Netlify, Render, Firebase, etc.).

---

## 🔐 Security Requirements

### Database Access
- [x] **IP Whitelist (NOT 0.0.0.0/0)**: Only allow specific IPs/ranges
- [x] **Strong Passwords**: Database user has strong password (12+ chars, mixed case, numbers, symbols)
- [x] **IP Rotation Safety**: For Cloudflare Workers, use MongoDB IP whitelist or API key auth
- [ ] Enable MongoDB IP Access List Auto-Update
- [ ] Test connection before deploying

### API Security
- [x] **Rate Limiting**: Enabled (15 min, 1000 requests/IP)
- [x] **CORS Configured**: Only specific origins allowed (not `*`)
- [x] **Authentication Required**: JWT/cookies for protected routes
- [x] **HTTPS Only**: No HTTP in production origins
- [ ] Add request signing for sensitive endpoints
- [ ] Implement API key for backend-only services

### Secrets Management
- [x] **No Hardcoded Secrets**: All secrets in environment variables
- [x] **Separate Prod/Dev**: Different JWT secrets per environment
- [ ] Rotate JWT secrets quarterly
- [ ] Use external secret manager (Vault, 1Password)
- [ ] Never commit `.env` files

---

## 🚫 Demo/Test Data Rules

### Demo Users & Seeding
- [x] **Demo Mode Disabled in Production**: `DEMO_SEED=false` by default
- [x] **Production Safety Check**: Code prevents seeding if `NODE_ENV === 'production'`
- [x] **Clear Labeling**: Demo credentials marked with `_DEV_ONLY` suffix
- [ ] Remove demo data before production deployment
- [ ] Add database migration script to remove demo users if present
- [ ] Never use demo test accounts for real transactions

### Test Data Cleanup
- [ ] Set up automatic cleanup script for test users older than 7 days
- [ ] Document how to manually purge test data
- [ ] Log all data creation for audit purposes

---

## 📋 Compliance by Hosting Provider

### Cloudflare Pages + Workers
- [x] No sensitive data in source code
- [x] Database not exposed publicly (0.0.0.0/0 removed)
- [x] CORS properly configured
- [ ] Enable Cloudflare WAF (Web Application Firewall)
- [ ] Set up rate limiting rules in Cloudflare dashboard
- [ ] Use Cloudflare KV for sensitive data (optional)

### Netlify
- [x] Environment variables used for secrets
- [x] No demo data in production builds
- [ ] Enable asset optimization
- [ ] Use Netlify Functions instead of external APIs where possible

### Render
- [x] Strong database passwords
- [x] No IP whitelisting to `0.0.0.0/0`
- [ ] Use Render's managed databases (PostgreSQL) if available
- [ ] Enable auto-scaling for traffic spikes

### Firebase
- [x] Firestore security rules (if using)
- [x] Authentication properly configured
- [ ] Review Firebase storage rules
- [ ] Monitor Firebase billing alerts

### MongoDB Atlas
- [x] IP whitelist configured (not 0.0.0.0/0)
- [x] Strong authentication
- [ ] Enable automatic backups
- [ ] Enable audit logging
- [ ] Use MongoDB Database Access (M0 free tier has limitations)

---

## 🛡️ Data Protection

### User Data
- [x] HTTPS enforced for all connections
- [x] Passwords hashed (bcrypt or similar)
- [x] Sensitive fields encrypted
- [ ] Enable request logging without storing sensitive data
- [ ] Implement data retention policy (delete old logs)

### PII Handling
- [ ] GDPR-compliant (EU users)
- [ ] Right to deletion implemented
- [ ] Data export functionality (optional)
- [ ] No tracking of sensitive financial data

---

## 🚀 Pre-Deployment Checklist

Before deploying to production:

```bash
# 1. Verify environment variables are set
echo $NODE_ENV  # Should be "production"
echo $DEMO_SEED  # Should be "false" or unset

# 2. Check no hardcoded secrets
grep -r "password" backend/src --include="*.js" | grep -v "node_modules"
grep -r "secret" backend/src --include="*.js" | grep -v "node_modules"

# 3. Verify CORS origins don't include "*"
grep -r "cors" backend/src --include="*.js" -A 2 | grep "\*"

# 4. Test database connection
npm run db-check

# 5. Run security audit
npm audit

# 6. Verify production build
npm run build

# 7. Check build size (should not include node_modules)
du -sh frontend/build
```

---

## 📝 Environment Variables Template

Create `.env.production` (DO NOT COMMIT):

```env
# Security
NODE_ENV=production
JWT_SECRET=<strong-random-secret-min-32-chars>
JWT_REFRESH_SECRET=<different-strong-secret-min-32-chars>

# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/bank-app

# API
API_PORT=3000
CLIENT_ORIGIN=https://your-domain.com
CLIENT_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Features
DEMO_SEED=false
LOG_LEVEL=warn

# Email (if using)
EMAIL_SERVICE=gmail
EMAIL_USER=<your-email>
EMAIL_PASSWORD=<app-password>
```

---

## 🔄 Incident Response

If a security issue is detected:

1. **Immediate**: Rotate all secrets/passwords
2. **Within 24h**: Audit access logs for unauthorized activity
3. **Within 48h**: Deploy security patch
4. **Communication**: Update users if data was exposed

---

## 📞 Support & Escalation

**Hosting Provider Support Contacts:**
- Cloudflare: https://dash.cloudflare.com/support
- Netlify: support@netlify.com
- Render: https://render.com/support
- MongoDB Atlas: https://www.mongodb.com/support

---

## ✅ Final Checklist

- [ ] All items above reviewed
- [ ] Environment variables verified
- [ ] Database access tested
- [ ] Security audit passed
- [ ] Build size acceptable
- [ ] CORS origins whitelist validated
- [ ] Demo mode disabled in production
- [ ] Ready for production deployment

---

Last Updated: 2026-01-17
Status: ⚠️ IN REVIEW - Complete checklist before deploying
