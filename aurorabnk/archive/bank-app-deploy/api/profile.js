export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // TODO: implement real auth and DB logic
    if (req.method === 'GET') {
      return res.status(200).json({ success: true, user: { id: 'u-dev', email: 'dev@example.com', firstName: 'Dev', lastName: 'User' } });
    }

    // PUT
    const updates = req.body || {};
    return res.status(200).json({ success: true, user: { id: 'u-dev', ...updates } });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
