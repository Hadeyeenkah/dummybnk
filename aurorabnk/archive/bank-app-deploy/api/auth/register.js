export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { email, password, firstName, lastName } = req.body || {};
    // TODO: Add real registration logic
    return res.status(201).json({ success: true, token: 'mock-jwt-token', user: { email, firstName, lastName } });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
