#!/usr/bin/env node
// Simple test script to verify login credentials against MongoDB
require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require(path.join(__dirname, '..', 'src', 'models', 'User'));
const { connectDB } = require(path.join(__dirname, '..', 'src', 'config', 'database'));

async function main() {
  const email = process.argv[2] || 'irqcowboy@gmail.com';
  const password = process.argv[3] || 'password123';

  console.log('Testing login for:', email);

  try {
    const connected = await connectDB();
    if (!connected) {
      console.error('MongoDB not connected. Set MONGODB_URI or start local MongoDB.');
      process.exitCode = 2;
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      console.log('User not found in database');
      return;
    }

    const match = await bcrypt.compare(password, user.password);
    console.log('Password match:', match);
    console.log('User id:', user._id.toString());
    console.log('Email verified:', user.isVerified);
    console.log('MFA enabled:', user.mfaEnabled);
  } catch (err) {
    console.error('Error during test:', err.message || err);
    process.exitCode = 1;
  } finally {
    try { await mongoose.disconnect(); } catch (_) {}
  }
}

main();
