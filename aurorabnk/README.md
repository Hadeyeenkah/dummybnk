# Aurora Bank - Full Stack Banking Application

> Note: Legacy deployment artifacts and duplicate folders were moved to the `archive/` directory to simplify the workspace. See `archive/` at the repository root if you need old builds or logs.

## 🚀 Quick Start

### Backend Setup
```bash
cd backend
npm install
# Server will run without MongoDB (uses in-memory for development)
# To use MongoDB: install locally or update MONGODB_URI in backend/.env
npm run dev
```
Backend runs on `http://localhost:5000`

### Frontend Setup
```bash
cd frontend
npm install
npm start
```
Frontend runs on `http://localhost:3000`

## ✨ Features

### Strong Authentication System
- ✅ **Email Verification** - Users must verify email before login
- ✅ **2FA (TOTP)** - Optional two-factor authentication with QR code
- ✅ **Secure Password Storage** - bcrypt with 12 salt rounds
- ✅ **HTTP-Only Cookies** - JWT tokens stored securely, protected from XSS
- ✅ **Role-Based Access** - Admin vs User roles with route protection
- ✅ **CORS Protection** - Configured for credentials with specific origin

### Banking Features
- Real-time transaction updates across all components
- Transfer money between users via email
- Bill payments with categories
- Mobile check deposit interface
- Card controls and security settings
- Transaction history with filtering
- Admin panel with oversight capabilities

## 🔐 Authentication Endpoints

### Register
```
POST /api/auth/register
Body: { email, password, firstName, lastName, phone }
Response: Email verification required message
```

### Verify Email
```
GET /api/auth/verify-email?token=<verification_token>
Response: Email verified successfully
```

### Login
```
POST /api/auth/login
Body: { email, password }
Response: 
  - If MFA disabled: Sets httpOnly cookies, returns user data
  - If MFA enabled: Returns { mfaRequired: true, challengeToken }
```

### Verify 2FA
```
POST /api/auth/verify-2fa
Body: { challengeToken, token }
Response: Sets httpOnly cookies, MFA verification successful
```

### Enable 2FA
```
POST /api/auth/enable-2fa (requires auth)
Response: { base32, otpauthUrl, qrDataUrl }
```

### Confirm 2FA Setup
```
POST /api/auth/confirm-2fa (requires auth)
Body: { token }
Response: 2FA enabled successfully
```

### Get Profile
```
GET /api/auth/profile (requires auth)
Response: Current user data
```

### Logout
```
POST /api/auth/logout (requires auth)
Response: Clears cookies
```

## 🛡️ Security Features

1. **Password Security**
   - Minimum 8 characters enforced
   - bcrypt hashing with 12 salt rounds
   - Stored with `select: false` in schema

2. **Token Security**
   - Short-lived access tokens (15 minutes)
   - Long-lived refresh tokens (7 days)
   - HTTP-only cookies prevent XSS theft
   - SameSite=lax prevents CSRF

3. **Email Verification**
   - 24-hour expiring verification tokens
   - Login blocked until verified
   - Crypto-random token generation

4. **Two-Factor Authentication**
   - TOTP-based (RFC 6238)
   - QR code generation for authenticator apps
   - Confirmation required before activation
   - 30-second time window with 1-step tolerance

5. **Role-Based Access Control**
   - `user` role: Standard banking features
   - `admin` role: Full oversight + user management
   - Middleware enforces role requirements
   - Default admin: admin@aurorabank.com

6. **Rate Limiting**
   - 200 requests per 15 minutes per IP
   - Prevents brute force attacks

## 📁 Project Structure

```
backend/
  src/
    config/
      database.js          # MongoDB connection
    controllers/
      authController.js    # Auth logic + 2FA + email verification
    middleware/
      authMiddleware.js    # JWT validation + role check
    models/
      User.js             # User schema with 2FA/verification fields
    routes/
      authRoutes.js       # Auth endpoints
    utils/
      email.js            # Email sender (logs to console for now)
      tokenUtils.js       # JWT generation + cookie helpers
  server.js               # Express app entry
  .env                    # Environment config

frontend/
  src/
    context/
      BankContext.js      # Global state + backend API calls
    pages/
      AdminPage.js        # Admin oversight panel
      BillsPage.js        # Bill payments
      CardsPage.js        # Card controls
      DepositPage.js      # Check deposits
      TransactionsPage.js # Transaction history
      TransferPage.js     # Money transfers
    App.js                # Routes + RequireAuth wrapper
    Dashboard.js          # User dashboard
    LoginPage.js          # Login with MFA support
    SignupPage.js         # Registration
  .env                    # API_BASE config
```

## 🧪 Testing Authentication

### Test Strong Auth Flow

1. **Sign Up**
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"SecurePass123","firstName":"Test","lastName":"User"}'
   ```
   Check console for verification link.

2. **Verify Email**
   ```bash
   curl "http://localhost:5000/api/auth/verify-email?token=<token_from_console>"
   ```

3. **Login**
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"SecurePass123"}' \
     -c cookies.txt
   ```

4. **Access Protected Route**
   ```bash
   curl http://localhost:5000/api/auth/profile -b cookies.txt
   ```

### Test 2FA Setup

1. **Enable 2FA** (after login)
   ```bash
   curl -X POST http://localhost:5000/api/auth/enable-2fa -b cookies.txt
   ```
   Scan the QR code with Google Authenticator or Authy.

2. **Confirm 2FA**
   ```bash
   curl -X POST http://localhost:5000/api/auth/confirm-2fa \
     -H "Content-Type: application/json" \
     -d '{"token":"<6_digit_code_from_app>"}' \
     -b cookies.txt
   ```

3. **Login with 2FA**
   ```bash
   # First request returns challengeToken
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"SecurePass123"}'
   
   # Verify with TOTP code
   curl -X POST http://localhost:5000/api/auth/verify-2fa \
     -H "Content-Type: application/json" \
     -d '{"challengeToken":"<from_previous>","token":"<6_digit_code>"}' \
     -c cookies.txt
   ```

### Test Admin Role

1. **Create Admin User**
   Register with `admin@aurorabank.com` - automatically assigned admin role.

2. **Access Admin Route**
   ```bash
   curl http://localhost:5000/api/auth/admin-only -b cookies.txt
   ```
   Non-admins receive `403 Forbidden`.

## 🔧 Environment Variables

### Backend (`.env`)
```
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/securebank
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_jwt_key_change_this_in_production_min_32_chars
JWT_EXPIRE=15m
NODE_ENV=development
API_BASE=http://localhost:5000
```

### Frontend (`.env`)
```
REACT_APP_API_BASE=http://localhost:5000/api
```

## 📝 Database Schema

### User Model
```javascript
{
  firstName: String,
  lastName: String,
  email: String (unique, lowercase),
  password: String (hashed, select: false),
  phone: String,
  dateOfBirth: Date,
  balance: Number,
  
  // Email verification
  isVerified: Boolean,
  verificationToken: String,
  verificationExpires: Date,
  
  // Two-factor auth
  mfaEnabled: Boolean,
  mfaSecret: String (select: false),
  
  // Role-based access
  role: String (enum: ['user', 'admin']),
  
  // Accounts
  accounts: [{
    accountType: String,
    accountNumber: String,
    balance: Number
  }],
  
  timestamps: true
}
```

## 🚨 Notes

- **MongoDB Optional**: Server runs without DB for development (users won't persist).
- **Email**: Currently logs verification links to console. Integrate SendGrid/AWS SES for production.
- **Admin Account**: Use `admin@aurorabank.com` for admin role auto-assignment.
- **Production**: Change JWT secrets, enable HTTPS, set secure cookies, use real MongoDB.

## 📚 Dependencies

### Backend
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT tokens
- `speakeasy` - TOTP 2FA
- `qrcode` - QR code generation
- `cookie-parser` - Cookie handling
- `cors` - CORS middleware
- `helmet` - Security headers
- `express-validator` - Input validation
- `express-rate-limit` - Rate limiting
- `dotenv` - Environment variables

### Frontend
- `react` - UI framework
- `react-router-dom` - Routing
- `tailwindcss` - Styling

## 🎯 Next Steps

- [ ] Install MongoDB locally or use MongoDB Atlas
- [ ] Integrate real email service (SendGrid, AWS SES)
- [ ] Add account recovery flow
- [ ] Implement transaction APIs with database persistence
- [ ] Add withdrawal limits and fraud detection
- [ ] Set up CI/CD pipeline
- [ ] Deploy to production with HTTPS
