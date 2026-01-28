// Root route for backend health/debug
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Aurora Bank backend root. Use /api/* for API endpoints.' });
});

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();



// CORS - MUST BE FIRST MIDDLEWARE

// Enhanced CORS with logging for debugging
const allowedOrigins = (process.env.CLIENT_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
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
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));
// Handle preflight requests
app.options('*', cors());

// Parse JSON and cookies
app.use(express.json());
app.use(cookieParser());



// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is healthy' });
});

// Mount authentication routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

module.exports = app;
