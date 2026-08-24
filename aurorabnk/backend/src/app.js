const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local for local development, then fallback to .env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// Root route for backend health/debug
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Aurora Bank backend root. Use /api/* for API endpoints.' });
});

// CORS - MUST BE FIRST MIDDLEWARE

// Enhanced CORS with logging for debugging
const envOriginsRaw = process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || '';
const envOrigins = envOriginsRaw.split(',').map(o => o.trim()).filter(Boolean);
const defaultOrigins = [
  'https://aurorabank.net',
  'https://www.aurorabank.net',
  'http://localhost:3000',
  'http://localhost:5001'
];
const allowedOrigins = Array.from(new Set([...envOrigins, ...defaultOrigins]));

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) {
      console.log('[CORS] No origin header, allowing request');
      return callback(null, true);
    }
    const isVercelPreview = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin || '');

    if (allowedOrigins.includes(origin) || isVercelPreview) {
      console.log(`[CORS] Allowed origin: ${origin}`);
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked origin: ${origin}`);
    // Do not throw here; return a 403 JSON response later via middleware.
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
// Handle preflight requests
app.options('*', cors(corsOptions));

// Additional middleware to ensure Safari/Apple devices can authenticate
app.use((req, res, next) => {
  // Ensure CORS headers are set for Safari
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  next();
});

// Parse JSON and cookies
app.use(express.json());
app.use(cookieParser());



// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is healthy' });
});

// Mount admin routes
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

// Mount chat routes
const chatRoutes = require('./routes/chatRoutes');
app.use('/api/chat', chatRoutes);

// Mount authentication routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Mount transaction routes
const transactionRoutes = require('./routes/transactionRoutes');
app.use('/api/transactions', transactionRoutes);

// Mount bill payment routes before the API fallback handler.
// The Bills page uses GET/POST /api/bills for payment history and new payments.
const billRoutes = require('./routes/billRoutes');
app.use('/api/bills', billRoutes);

// Explicit API 404 handler (JSON only)
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Global JSON error handler so production never returns HTML error pages
app.use((err, req, res, _next) => {
  console.error('❌ Unhandled app error:', err);

  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS origin not allowed' });
  }

  return res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err?.message : undefined,
  });
});

module.exports = app;
