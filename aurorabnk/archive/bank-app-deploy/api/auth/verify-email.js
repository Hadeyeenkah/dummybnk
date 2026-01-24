export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.query?.token || (req.url && new URL(req.url, 'http://localhost').searchParams.get('token'));
    if (!token) return res.status(400).json({ error: 'Token is required' });

    // TODO: verify token and activate account
    return res.status(200).json({ message: 'Email verified (dev)' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
