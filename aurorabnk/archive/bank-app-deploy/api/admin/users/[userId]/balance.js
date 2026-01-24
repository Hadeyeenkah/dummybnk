export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'PATCH' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.query?.userId || (req.url && new URL(req.url, 'http://localhost').searchParams.get('userId'));
    if (req.method === 'PATCH') {
      const body = req.body || {};
      return res.status(200).json({ message: 'Balance updated (dev)', userId, updated: body });
    }

    return res.status(200).json({ balance: 1000.0, userId });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
