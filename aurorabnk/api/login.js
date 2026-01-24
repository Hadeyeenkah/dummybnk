const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    const { username, password } = req.body;
    // Replace with your real authentication logic
    if (username === 'admin' && password === 'password') {
      // Create JWT token
      const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
      res.status(200).json({ success: true, token });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
