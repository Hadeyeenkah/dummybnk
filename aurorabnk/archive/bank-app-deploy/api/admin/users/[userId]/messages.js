export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (req.method === 'POST') {
      const body = req.body || {};
      const msg = { id: `msg-${Date.now()}`, message: body.message, createdAt: new Date().toISOString() };
      return res.status(200).json({ message: 'Sent (dev)', msg });
    }

    return res.status(200).json({ messages: [{ id: 'msg-1', message: 'Welcome!', createdAt: new Date().toISOString() }] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
