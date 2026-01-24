export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // TODO: integrate real DB and auth 2FA init logic
    const secret = { base32: 'DEVBASE32', otpauth_url: 'otpauth://dev/aurora-bank?secret=DEVBASE32' };
    return res.status(200).json({ message: '2FA init (dev)', ...secret });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
