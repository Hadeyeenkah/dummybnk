
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();


// CORS configuration (URGENT: allow frontend and local dev)
app.use(cors({
  origin: [
    'https://aurora-9px4dd76f-auroras-projects-c3211c64.vercel.app',
    'https://aurorabnk.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

// Parse JSON and cookies
app.use(express.json());
app.use(cookieParser());


// Mount authentication routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

module.exports = app;
