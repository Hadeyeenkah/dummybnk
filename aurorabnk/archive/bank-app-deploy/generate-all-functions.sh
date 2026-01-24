#!/bin/bash

echo "🚀 Generating ALL Aurora Bank Serverless Functions..."
echo ""

# Create helper files first
echo "📦 Creating helper files..."

# Database helper
cat > api/_lib/db.js << 'DBEOF'
import mongoose from 'mongoose';

let cachedConnection = null;

export async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL, {
      bufferCommands: false,
    });
    cachedConnection = conn;
    console.log('✅ Database connected');
    return conn;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
}
DBEOF

# Auth middleware
cat > api/_lib/auth.js << 'AUTHEOF'
import jwt from 'jsonwebtoken';

export function verifyToken(req) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.token;
  
  let token = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (cookieToken) {
    token = cookieToken;
  }
  
  if (!token) return null;
  
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function requireAuth(handler) {
  return async (req, res) => {
    const decoded = verifyToken(req);
    
    if (!decoded) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Unauthorized' 
      });
    }
    
    req.user = decoded;
    req.userId = decoded.id || decoded._id;
    return handler(req, res);
  };
}

export function requireRole(role) {
  return (handler) => {
    return requireAuth(async (req, res) => {
      if (req.user.role !== role) {
        return res.status(403).json({ 
          status: 'error', 
          message: 'Forbidden - Admin access required' 
        });
      }
      return handler(req, res);
    });
  };
}
AUTHEOF

# CORS helper
cat > api/_lib/cors.js << 'CORSEOF'
export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
}

export function handleCors(handler) {
  return async (req, res) => {
    setCorsHeaders(res);
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    return handler(req, res);
  };
}
CORSEOF

echo "✅ Helper files created"
echo ""

# Now create ALL API endpoints
echo "🔨 Creating API endpoints..."

# Health check
cat > api/health.js << 'HEALTHEOF'
export default async function handler(req, res) {
  res.status(200).json({
    status: 'success',
    message: 'Aurora Bank API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
}
HEALTHEOF

echo "   ✅ api/health.js"

# Auth - Login
cat > api/auth/login.js << 'LOGINEOF'
import { connectDB } from '../_lib/db.js';
import { handleCors } from '../_lib/cors.js';
import User from '../_models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

async function loginHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Email and password are required' 
      });
    }

    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid credentials' 
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid credentials' 
      });
    }

    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role || 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      status: 'success',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        accountNumber: user.accountNumber,
        balance: user.balance,
        accounts: user.accounts
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error' 
    });
  }
}

export default handleCors(loginHandler);
LOGINEOF

echo "   ✅ api/auth/login.js"

# Auth - Register
cat > api/auth/register.js << 'REGEOF'
import { connectDB } from '../_lib/db.js';
import { handleCors } from '../_lib/cors.js';
import User from '../_models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

async function registerHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    const { email, password, firstName, lastName, phone, dateOfBirth } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'All required fields must be provided' 
      });
    }

    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return res.status(409).json({ 
        status: 'error', 
        message: 'User already exists' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      balance: 0,
      accounts: [
        { accountType: 'checking', balance: 0 },
        { accountType: 'savings', balance: 0 }
      ]
    });

    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role || 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      status: 'success',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountNumber: user.accountNumber,
        balance: user.balance
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error' 
    });
  }
}

export default handleCors(registerHandler);
REGEOF

echo "   ✅ api/auth/register.js"

# Auth - Profile
cat > api/auth/profile.js << 'PROFEOF'
import { connectDB } from '../_lib/db.js';
import { handleCors } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import User from '../_models/User.js';

async function profileHandler(req, res) {
  if (req.method === 'GET') {
    try {
      await connectDB();
      
      const user = await User.findById(req.userId);
      
      if (!user) {
        return res.status(404).json({ status: 'error', message: 'User not found' });
      }

      res.status(200).json({
        status: 'success',
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          role: user.role,
          accountNumber: user.accountNumber,
          routingNumber: user.routingNumber,
          balance: user.balance,
          accounts: user.accounts,
          isVerified: user.isVerified
        }
      });

    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    try {
      await connectDB();
      
      const updates = req.body;
      const user = await User.findByIdAndUpdate(
        req.userId,
        { $set: updates },
        { new: true, runValidators: true }
      );

      res.status(200).json({
        status: 'success',
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }
}

export default handleCors(requireAuth(profileHandler));
PROFEOF

echo "   ✅ api/auth/profile.js"

echo ""
echo "🎉 Core auth endpoints created!"
echo ""
echo "Do you want me to continue creating ALL remaining endpoints?"
echo "(transactions, admin, transfers, chat, bills, notifications)"
echo ""
echo "Type 'yes' to continue or show me your src/config.js update needs"
