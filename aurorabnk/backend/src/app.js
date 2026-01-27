
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();



// CORS - MUST BE FIRST MIDDLEWARE
app.use(cors({
  origin: [
    'https://aurora-isq0obdv4-auroras-projects-c3211c64.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
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
