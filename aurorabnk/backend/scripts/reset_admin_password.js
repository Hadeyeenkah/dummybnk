#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

(async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/securebank';
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB');
    const users = await User.find({ email: /admin@aurorabank.com/i }).select('+password');
    if (!users || users.length === 0) {
      console.log('No admin user found');
      process.exit(1);
    }
    const newPass = 'Admin123!';
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(newPass, salt);
    const res = await User.updateMany({ email: /admin@aurorabank.com/i }, { $set: { password: hash } });
    console.log('Matched:', res.matchedCount || res.n || 0, 'Modified:', res.modifiedCount || res.nModified || 0);
    await mongoose.disconnect();
    console.log('Done');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(2);
  }
})();
