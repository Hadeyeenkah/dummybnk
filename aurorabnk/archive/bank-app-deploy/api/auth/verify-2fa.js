export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, secret } = req.body || {};
    if (!token || !secret) return res.status(400).json({ error: 'token and secret are required' });

    // TODO: verify 2FA token
    const ok = true;
    if (!ok) return res.status(400).json({ error: 'Invalid 2FA token' });

    return res.status(200).json({ message: '2FA verified (dev)' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
