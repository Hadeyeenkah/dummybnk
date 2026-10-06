const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('backend/src/models/User');
const { connectDB } = require('backend/src/config/database');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    await connectDB();
    const body = JSON.parse(event.body || '{}');
    const { email, password, firstName, lastName, phone, dateOfBirth } = body;

    if (!email || !password || !firstName || !lastName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Missing required fields' })
      };
    }

    const existing = await User.findOne({ email: email.toLowerCase() }).catch(() => null);
    if (existing) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'User already exists' })
      };
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
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
        role: 'user',
        approvalStatus: 'pending',
        accounts: [
          { accountType: 'checking', accountNumber: `CHK${Date.now()}`, balance: 1000 },
          { accountType: 'savings', accountNumber: `SAV${Date.now()}`, balance: 0 },
        ],
      });
    } catch (dbError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: 'Error creating user', error: dbError.message })
      };
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Registration submitted. Please verify your email and wait for an administrator to approve your account before signing in.',
        user: {
          id: user._id,
          email: user.email,
          name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
          approvalStatus: user.approvalStatus,
        }
      })
    };
  } catch (error) {
    console.error('Register error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Server error', error: error.message })
    };
  }
};
