const jwt = require('jsonwebtoken');

function verifyToken(req) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.token;
  
  let token = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (cookieToken) {
    token = cookieToken;
  }
  
  if (!token) return null;
  
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function requireAuth(handler) {
  return async (req, res) => {
    const decoded = verifyToken(req);
    
    if (!decoded) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Unauthorized' 
      });
    }
    
    req.user = decoded;
    req.userId = decoded.id || decoded._id;
    return handler(req, res);
  };
}

function requireRole(role) {
  return (handler) => {
    return requireAuth(async (req, res) => {
      if (req.user.role !== role) {
        return res.status(403).json({ 
          status: 'error', 
          message: 'Forbidden - Admin access required' 
        });
      }
      return handler(req, res);
    });
  };
}

// Minimal auth helper (mock) for password reset and 2FA flows
const crypto = require('crypto');

function generateResetToken() {
  return crypto.randomBytes(20).toString('hex');
}

async function verifyResetToken(token) {
  // In a real app, verify token against DB; here accept any token for demo
  return !!token;
}

async function sendResetEmail(email, link) {
  console.log(`(dev) sending reset link to ${email}: ${link}`);
  return true;
}

function generate2faSecret() {
  return { base32: 'JBSWY3DPEHPK3PXP', qrDataUrl: 'data:image/png;base64,FAKEQRCODE' };
}

async function verify2faToken(secret, token) {
  return token === '123456';
}

module.exports = {
  verifyToken,
  requireAuth,
  requireRole,
  generateResetToken,
  verifyResetToken,
  sendResetEmail,
  generate2faSecret,
  verify2faToken,
};
