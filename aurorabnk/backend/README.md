# SecureBank Backend Setup

## Environment Variables
Create a `.env` file in `backend/` with:

```
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/securebank
JWT_SECRET=super_long_random_secret_here
JWT_REFRESH_SECRET=another_long_random_secret_here
JWT_EXPIRE=15m
NODE_ENV=development
```

## Install and Run

```bash
cd backend
npm install
npm run dev
```

The server runs on `http://localhost:5000` and exposes auth endpoints under `/api/auth`.

- POST `/api/auth/register` — body: `{ email, password, firstName, lastName, phone }`
- POST `/api/auth/login` — body: `{ email, password }`
- GET `/api/auth/profile` — requires auth cookie; returns the current user
- POST `/api/auth/logout` — clears cookies

## Notes
- Uses httpOnly cookies for access and refresh tokens (strong against XSS).
- CORS is configured with `credentials: true` and `CLIENT_ORIGIN`.
- Passwords are hashed with bcrypt (12 rounds).
- MongoDB via Mongoose stores users and basic account info.
