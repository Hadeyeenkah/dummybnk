const jwt = require('jsonwebtoken');
const User = require('../../backend/src/models/User');
const { connectDB } = require('../../backend/src/config/database');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'No token provided' })
    };
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    await connectDB();
    const user = await User.findById(decoded.id);
    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'User not found' })
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Welcome to your dashboard, ${user.firstName}` })
    };
  } catch (err) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Invalid or expired token' })
    };
  }
};
