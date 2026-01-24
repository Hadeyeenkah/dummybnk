export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const url = (req.url && new URL(req.url, 'http://localhost'));
    const email = url.searchParams.get('email');
    const accountNumber = url.searchParams.get('accountNumber');

    if (email === 'jamie@example.com') {
      return res.status(200).json({ user: { firstName: 'Jamie', lastName: 'Doe', email: 'jamie@example.com', accountNumber: '****4892', routingNumber: '026009593' } });
    }

    if (accountNumber) {
      return res.status(200).json({ user: null });
    }

    return res.status(404).json({ message: 'Not found' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
