module.exports = (req, res) => {
  if (req.method === 'GET') {
    // Return demo users
    return res.status(200).json({ users: [{ id: 1, name: 'Demo User', email: 'demo@example.com' }] });
  }
  return res.status(405).json({ message: 'Method not allowed' });
};
