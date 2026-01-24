module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const { email } = req.body || {};
  // Dummy register — replace with real registration logic
  return res.status(201).json({ success: true, message: `Registered ${email || 'demo@example.com'}` });
};
