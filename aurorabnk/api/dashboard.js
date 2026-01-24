const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

module.exports = async function handler(req, res) {
  // Check for Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    // Example: return dashboard data
    res.status(200).json({ message: `Welcome to your dashboard, ${decoded.username}` });
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}
