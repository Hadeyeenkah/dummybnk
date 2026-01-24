const jwt = require('jsonwebtoken');
const { connectDB } = require('backend/src/config/database');
const Notification = require('backend/src/models/Notification');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ message: 'No token provided' })
    };
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    await connectDB();
    const notifications = await Notification.find({ userId: decoded.id });
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ notifications })
    };
  } catch (err) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ message: 'Invalid or expired token' })
    };
  }
};
