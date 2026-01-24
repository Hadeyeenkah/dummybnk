export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // TODO: integrate with DB and email system
    const token = `dev-reset-${Date.now()}`;
    const resetBase = process.env.RESET_BASE || 'http://localhost:3000';
    const link = `${resetBase}/reset-password?token=${token}`;

    return res.status(200).json({ message: 'Password reset link sent (dev)', resetLink: link });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
