module.exports = (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const { email } = req.body || {};
  // Dummy login for scaffold — replace with real auth
  return res.status(200).json({ success: true, message: `Logged in as ${email || 'demo@example.com'}`, token: 'demo-token' });
};
