export default function handler(req, res) {
  res.status(200).json({
    status: 'success',
    message: 'Aurora Bank API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
}
