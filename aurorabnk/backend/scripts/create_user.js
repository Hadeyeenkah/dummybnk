#!/usr/bin/env node
// Create a user directly in MongoDB using the app's User model
require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require(path.join(__dirname, '..', 'src', 'models', 'User'));
const { connectDB } = require(path.join(__dirname, '..', 'src', 'config', 'database'));

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const firstName = process.argv[4] || 'User';
  const lastName = process.argv[5] || '';

  if (!email || !password) {
    console.error('Usage: node create_user.js <email> <password> [firstName] [lastName]');
    process.exit(2);
  }

  try {
    const connected = await connectDB();
    if (!connected) {
      console.error('MongoDB not connected.');
      process.exit(1);
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      console.log('User already exists:', existing.email);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      email: email.toLowerCase(),
      password: passwordHash,
      firstName,
      lastName,
      isVerified: true,
      balance: 0,
      role: 'user',
      accounts: [
        { accountType: 'checking', accountNumber: `CHK${Date.now()}`, balance: 0 },
        { accountType: 'savings', accountNumber: `SAV${Date.now()}`, balance: 0 }
      ]
    });

    console.log('User created:', user.email, 'id=', user._id.toString());
  } catch (err) {
    console.error('Failed to create user:', err.message || err);
    process.exitCode = 1;
  } finally {
    try { await mongoose.disconnect(); } catch (_) {}
  }
}

main();
