const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

exports.handler = async (event, context) => {
  if (event.httpMethod === 'POST') {
    const { username, password } = JSON.parse(event.body || '{}');
    // Replace with your real authentication logic
    if (username === 'admin' && password === 'password') {
      // Create JWT token
      const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, token })
      };
    } else {
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, message: 'Invalid credentials' })
      };
    }
  } else {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }
};
