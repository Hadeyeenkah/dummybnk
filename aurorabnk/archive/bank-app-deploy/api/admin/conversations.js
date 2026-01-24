export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const conversations = [
      { id: 'conv-1', subject: 'Account inquiry', lastMessage: 'User asked about pending transfer', updatedAt: new Date().toISOString() },
      { id: 'conv-2', subject: 'Card dispute', lastMessage: 'Charge disputed', updatedAt: new Date().toISOString() },
    ];
    return res.status(200).json({ conversations });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
