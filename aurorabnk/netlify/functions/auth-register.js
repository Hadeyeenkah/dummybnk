const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('backend/src/models/User');
const { connectDB } = require('backend/src/config/database');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  await connectDB();
  const body = JSON.parse(event.body || '{}');
  const { email, password, firstName, lastName, phone, dateOfBirth } = body;

  if (!email || !password || !firstName || !lastName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required fields' })
    };
  }

  const existing = await User.findOne({ email: email.toLowerCase() }).catch(() => null);
  if (existing) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'User already exists' })
    };
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  const role = email.toLowerCase() === 'admin@aurorabank.com' ? 'admin' : 'user';

  let user = null;
  try {
    user = await User.create({
      email: email.toLowerCase(),
      password: passwordHash,
      firstName,
      lastName,
      phone: phone || null,
      dateOfBirth: dateOfBirth || null,
      balance: 0,
      isVerified: false,
      verificationToken,
      verificationExpires,
      role,
      accounts: [
        { accountType: 'checking', accountNumber: `CHK${Date.now()}`, balance: 1000 },
        { accountType: 'savings', accountNumber: `SAV${Date.now()}`, balance: 0 },
      ],
    });
  } catch (dbError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Database error', error: dbError.message })
    };
  }

  return {
    statusCode: 201,
    body: JSON.stringify({ message: 'User registered', user: { email: user.email, firstName: user.firstName, lastName: user.lastName } })
  };
};
