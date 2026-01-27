// Script to force reset demo user passwords in production MongoDB
// Usage: node scripts/reset_demo_passwords.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');

const demoUsers = [
  { email: 'irqcowboy@gmail.com', password: 'password123' },
  { email: 'tboysammy101@hotmail.com', password: 'password123' },
  { email: 'admin@aurorabank.com', password: 'Admin123!' },
];

async function resetDemoPasswords() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  for (const user of demoUsers) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    const updated = await User.findOneAndUpdate(
      { email: user.email.toLowerCase() },
      { password: passwordHash },
      { new: true }
    );
    if (updated) {
      console.log(`✅ Reset password for ${user.email}`);
    } else {
      console.log(`❌ User not found: ${user.email}`);
    }
  }
  await mongoose.disconnect();
  console.log('Done.');
}

resetDemoPasswords().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
