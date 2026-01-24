
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('backend/src/models/User');
const { connectDB } = require('backend/src/config/database');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

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
    const { email, password } = JSON.parse(event.body || '{}');

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Missing email or password' })
      };
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Invalid credentials' })
      };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Invalid credentials' })
      };
    }

    const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, { expiresIn: '24h' });
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email
        }
      })
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Server error', error: error.message })
    };
  }
};
