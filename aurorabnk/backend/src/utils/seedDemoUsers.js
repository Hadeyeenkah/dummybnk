const bcrypt = require('bcryptjs');
const User = require('../models/User');

const demoUsers = [
  { email: 'irqcowboy@gmail.com', password: 'password123', firstName: 'Irq', lastName: 'Cowboy', role: 'user' },
  { email: 'tboysammy101@hotmail.com', password: 'password123', firstName: 'Tboy', lastName: 'Sammy', role: 'user' },
  { email: 'admin@aurorabank.com', password: 'Admin123!', firstName: 'Admin', lastName: 'User', role: 'admin' },
];

async function seedDemoUsers() {
  try {
    for (const user of demoUsers) {
      const existing = await User.findOne({ email: user.email.toLowerCase() });
      if (existing) continue;

      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(user.password, salt);

      await User.create({
        email: user.email.toLowerCase(),
        password: passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || 'user',
        balance: 5000,
        isVerified: true,
        mfaEnabled: false,
        accounts: [
          { accountType: 'checking', accountNumber: `CHK${Date.now()}`, balance: 2500 },
          { accountType: 'savings', accountNumber: `SAV${Date.now()}`, balance: 2500 },
        ],
      });
    }
    console.log('✅ Demo users seeded to MongoDB');
  } catch (err) {
    console.error('❌ Failed to seed demo users:', err.message);
  }
}

module.exports = { seedDemoUsers };
