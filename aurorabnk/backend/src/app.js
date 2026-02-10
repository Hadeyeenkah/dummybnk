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
    if (allowedOrigins.includes(origin)) {
      console.log(`[CORS] Allowed origin: ${origin}`);
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
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

module.exports = app;
