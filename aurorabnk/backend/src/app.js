
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();



// CORS - MUST BE FIRST MIDDLEWARE
const allowedOrigins = (process.env.CLIENT_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
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


// Mount authentication routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

module.exports = app;
