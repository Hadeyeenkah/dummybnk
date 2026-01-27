
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config();

const { connectDB, isDBConnected } = require(path.join(__dirname, "config", "database"));
const authRoutes = require(path.join(__dirname, "routes", "authRoutes"));
const transactionRoutes = require(path.join(__dirname, "routes", "transactionRoutes"));
const billRoutes = require(path.join(__dirname, "routes", "billRoutes"));
const notificationRoutes = require(path.join(__dirname, "routes", "notificationRoutes"));
const adminRoutes = require(path.join(__dirname, "routes", "adminRoutes"));
const transferRoutes = require(path.join(__dirname, "routes", "transferRoutes"));
const chatRoutes = require(path.join(__dirname, "routes", "chatRoutes"));
const { seedDemoUsers } = require(path.join(__dirname, "utils", "seedDemoUsers"));


console.log('🔍 MONGODB_URI exists:', !!process.env.MONGODB_URI);

const app = express();
// Health checks FIRST - no DB needed
app.get('/ping', (req, res) => res.json({ status: 'alive' }));
app.get('/api/health', (req, res) => {
  res.json({
    status: "success",
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});
app.get('/api', (req, res) => {
  res.json({
    status: "success",
    message: "Aurora Bank Backend API"
  });
});
app.get('/', (req, res) => {
  res.send('Authenticated');
  return;
});

// Dynamic CORS handling: read allowed origins from env or fallbacks
const rawOrigins = process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || '';
const allowedOrigins = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);
if (allowedOrigins.length === 0) {
  allowedOrigins.push('https://aurorabank-beryl.vercel.app', 'http://localhost:3000', 'http://localhost:5173');
}

const isDevelopment = process.env.NODE_ENV !== 'production';
console.log('📍 Server environment:', process.env.NODE_ENV || 'development', 'isDevelopment=', isDevelopment);
console.log('🔒 Allowed CORS origins (from env):', allowedOrigins);


// --- CORS and Middleware Setup ---
const isLocalOrigin = (o) => {
  try {
    const u = new URL(o);
    const h = u.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return true;
    if (/^10\./.test(h)) return true;
    if (/^192\.168\./.test(h)) return true;
    const m = h.match(/^172\.(\d+)\./);
    if (m) {
      const octet = Number(m[1]);
      if (octet >= 16 && octet <= 31) return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};
// app.use(async (req, res, next) => {
//   // Lazy DB connection middleware (DISABLED for serverless)
//   // await connectDB();
//   // next();
// });
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (isDevelopment) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS not allowed'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/api/') && req.cookies?.accessToken,
});
app.use(limiter);

// (Lazy DB middleware removed for serverless compatibility)

// --- Health and root routes ---
app.get('/ping', (req, res) => res.json({ status: 'alive' }));
app.get('/', (req, res) => res.send('Authenticated'));
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'SecureBank API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});
app.get('/api', (req, res) => {
  res.json({
    status: 'success',
    message: 'Aurora Bank Backend API',
    docs: 'https://github.com/your-org/your-repo#readme'
  });
});
app.get('/auth', (req, res) => {
  res.json({
    status: 'success',
    message: 'Aurora Bank Backend API (auth root)'
  });
});

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/auth', authRoutes);
app.use('/transactions', transactionRoutes);
app.use('/transfers', transferRoutes);
app.use('/bills', billRoutes);
app.use('/notifications', notificationRoutes);
app.use('/admin', adminRoutes);
app.use('/chat', chatRoutes);

// --- Static file serving (production) ---
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '..', '..', 'frontend', 'build');
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      return res.status(404).json({ status: 'error', message: 'Route not found' });
    }
    return res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ status: 'error', message: 'Route not found' });
  });
}

// --- Error handlers ---
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ status: 'error', message: 'CORS policy violation', details: err.message });
  }
  res.status(err.status || 500).json({ status: 'error', message: err.message || 'Internal server error' });
});


module.exports = app;

