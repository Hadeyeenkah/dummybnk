function setCorsHeaders(req, res) {
  // Use request Origin when present so cookies + credentials work with browser CORS
  const origin = req.headers && req.headers.origin ? req.headers.origin : '*';
  if (origin && origin !== '*') {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
}

function handleCors(handler) {
  return async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    return handler(req, res);
  };
}

module.exports = handleCors;

