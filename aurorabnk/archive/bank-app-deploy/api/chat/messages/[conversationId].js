export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const convId = req.query?.conversationId || (req.url && new URL(req.url, 'http://localhost').searchParams.get('conversationId')) || req.url.split('/').pop();

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ messages: [{ id: 'm1', conversationId: convId, text: 'Hello from dev chat', createdAt: new Date().toISOString() }] });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const msg = { id: `m-${Date.now()}`, conversationId: convId, text: body.message || body.text, createdAt: new Date().toISOString() };
      return res.status(200).json({ message: 'Sent (dev)', msg });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
