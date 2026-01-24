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
    const user = await User.findOne({ email: 'admin@aurorabank.com' }).select('+password').lean();
    if (!user) {
      console.log('Admin not found');
      process.exit(1);
    }
    const plain = 'Admin123!';
    console.log('stored password hash:', user.password);
    const match = await bcrypt.compare(plain, user.password);
    console.log('bcrypt.compare result for Admin123! =>', match);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(2);
  }
})();
