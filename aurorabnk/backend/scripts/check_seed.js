#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

(async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/securebank';
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB');
    const admin = await User.findOne({ email: 'admin@aurorabank.com' }).select('+password').lean();
    if (!admin) {
      console.log('Admin user not found');
    } else {
      console.log('Admin user found:');
      console.log({ email: admin.email, firstName: admin.firstName, lastName: admin.lastName, role: admin.role });
      console.log('Password hash present:', !!admin.password);
    }
    const users = await User.find({}).limit(5).select('email firstName lastName').lean();
    console.log('Sample users:', users);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error checking DB:', err.message);
    process.exit(2);
  }
})();
