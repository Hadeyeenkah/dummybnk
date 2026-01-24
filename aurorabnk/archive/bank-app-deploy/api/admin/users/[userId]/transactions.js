export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // TODO: Add real transaction logic
    if (req.method === 'POST') {
      const body = req.body || {};
      const tx = { id: `tx-${Date.now()}`, ...body };
      return res.status(200).json({ transaction: tx });
    }

    return res.status(200).json({ transactions: [] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
