export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // TODO: integrate real auth logout logic
    return res.status(200).json({ status: 'success', message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
