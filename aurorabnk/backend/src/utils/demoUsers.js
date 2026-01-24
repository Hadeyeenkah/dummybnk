// ⚠️ DEPRECATED - Demo users should NOT be used in production
// This file is for LOCAL development only
// In production: Set DEMO_SEED=false (DEFAULT) and use real MongoDB only

// Lightweight demo users for local testing without MongoDB
// Enabled via env var DEMO_SEED=true. MUST be false in production.

const demoUsers = [
  {
    id: 'demo:admin@aurorabank.com',
    email: 'admin@aurorabank.com',
    password: 'Admin123!_DEV_ONLY',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isVerified: true,
    routingNumber: '026009593',
    accountNumber: 'CHK-DEMO-ADMIN',
    balance: 5000,
    accounts: [
      { accountType: 'checking', accountNumber: 'CHK-DEMO-ADMIN', balance: 3000 },
      { accountType: 'savings', accountNumber: 'SAV-DEMO-ADMIN', balance: 2000 },
    ],
  },
  {
    id: 'demo:lornamartins@gmail.com',
    email: 'lornamartins@gmail.com',
    password: 'password123_DEV_ONLY',
    firstName: 'Lorna',
    lastName: 'Martins',
    role: 'user',
    isVerified: true,
    routingNumber: '026009593',
    accountNumber: 'CHK-DEMO-LORNA',
    balance: 3200,
    accounts: [
      { accountType: 'checking', accountNumber: 'CHK-DEMO-LORNA', balance: 1800 },
      { accountType: 'savings', accountNumber: 'SAV-DEMO-LORNA', balance: 1400 },
    ],
  },
];

function findByEmail(email) {
  const e = String(email || '').toLowerCase();
  return demoUsers.find((u) => u.email.toLowerCase() === e) || null;
}

function findById(id) {
  return demoUsers.find((u) => u.id === id) || null;
}

function verifyCredentials(email, password) {
  const user = findByEmail(email);
  if (!user) return null;
  return user.password === password ? user : null;
}

module.exports = { demoUsers, findByEmail, findById, verifyCredentials };
