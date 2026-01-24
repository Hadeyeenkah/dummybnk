const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

exports.handler = async (event, context) => {
  // Check for Authorization header
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
    // Example: return dashboard data
    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Welcome to your dashboard, ${decoded.username}` })
    };
  } catch (err) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Invalid or expired token' })
    };
  }
};
