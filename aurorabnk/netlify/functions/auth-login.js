const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../backend/src/models/User');
const { connectDB } = require('../../backend/src/config/database');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  await connectDB();
  const body = JSON.parse(event.body || '{}');
  const { email, password } = body;

  if (!email || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing email or password' })
    };
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Invalid credentials' })
    };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Invalid credentials' })
    };
  }

  const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
  return {
    statusCode: 200,
    body: JSON.stringify({ token, user: { email: user.email, firstName: user.firstName, lastName: user.lastName } })
  };
};
