// src/routes/authRoutes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const User = require('../models/User');
const authController = require('../controllers/authController');

const jwt = require('jsonwebtoken');

const { protect, requireRole } = require('../middleware/authMiddleware');

// Middleware to support JWT in Authorization header (for Vercel/frontend)
const authenticateToken = (req, res, next) => {
  // Try header first
  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
  }
  if (!token) {
    return res.status(401).json({ status: 'error', message: 'No token provided' });
  }
  jwt.verify(token, process.env.JWT_SECRET || 'dev-access-secret-change-me', (err, user) => {
    if (err) return res.status(403).json({ status: 'error', message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Handle GET request (for browser testing)
router.get('/login', (req, res) => {
  res.json({
    status: 'error',
    message: 'Please use POST method for login',
    hint: 'Send email and password in request body'
  });
});

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array() 
    });
  }
  next();
};

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth required')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Routes
router.post('/register', registerValidation, handleValidationErrors, authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/login', loginValidation, handleValidationErrors, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', protect, authController.logout);
router.get('/profile', protect, async (req, res) => {
  try {
    res.json({
      status: 'success',
      user: {
        id: req.user._id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        phone: req.user.phone,
        avatarUrl: req.user.avatarUrl,
        role: req.user.role,
        accountNumber: req.user.accountNumber,
        routingNumber: req.user.routingNumber,
        balance: req.user.balance,
        accounts: req.user.accounts,
        isVerified: req.user.isVerified,
        // Add more fields as needed
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});
router.put('/profile', protect, authController.updateProfile);
router.post('/change-password', protect, authController.changePassword);

// Password reset routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// User lookup (for transfers)
router.get('/lookup', protect, authController.lookupUser);

// 2FA routes
router.post('/enable-2fa', protect, authController.enable2FA);
router.post('/confirm-2fa', protect, authController.confirm2FA);
router.post('/verify-2fa', authController.verify2FA);

// Example: protect an admin-only endpoint (placeholder)
// router.get('/admin-only', protect, requireRole('admin'), (req, res) => {
//   res.json({ message: 'Admin access granted' });
// });

module.exports = router;