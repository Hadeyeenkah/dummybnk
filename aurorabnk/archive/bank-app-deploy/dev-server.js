const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const API_DIR = path.join(__dirname, 'api');
const app = express();
// Load local env file if present so dev-server and handlers see MONGODB_URI, JWT_SECRET, etc.
try {
  require('dotenv').config({ path: path.join(__dirname, '.env.local') });
} catch (e) {
  // ignore if dotenv isn't available
}
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
// support cookies so handlers can read `req.cookies`
try {
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());
} catch (e) {
  console.warn('cookie-parser not installed; cookie support disabled');
}

function toRoute(filePath) {
  // filePath is absolute path under API_DIR
  const rel = path.relative(API_DIR, filePath);
  let route = '/' + rel.replace(/\\/g, '/');
  if (route.endsWith('.js')) route = route.slice(0, -3);
  // handle index -> directory
  route = route.replace(/\/index$/,'');
  // replace [param] with :param
  route = route.replace(/\[([^/]+?)\]/g, ':$1');
  // ensure no double slashes
  route = route.replace(/\/+/g, '/');
  if (route === '') route = '/';
  return route;
}

function registerHandlers(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      registerHandlers(full);
      continue;
    }
    if (!ent.isFile() || !ent.name.endsWith('.js')) continue;
    const route = '/api' + toRoute(full);
    let mod;
    try {
      mod = require(full);
    } catch (err) {
      console.error('Failed to require', full, err);
      continue;
    }
    // Support CommonJS `module.exports = fn` and ESM `export default fn`
    let handler = (typeof mod === 'function') ? mod : (mod && (typeof mod.default === 'function' ? mod.default : (typeof mod.handler === 'function' ? mod.handler : null)));
    if (typeof handler !== 'function') {
      console.warn('Handler not a function for', full);
      continue;
    }
    console.log('Mount', route, '->', full);
    app.all(route, async (req, res) => {
      try {
        // Vercel handlers expect (req, res)
        await handler(req, res);
      } catch (err) {
        console.error('Handler error', full, err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'handler error', message: err.message }));
        }
      }
    });
  }
}

if (!fs.existsSync(API_DIR)) {
  console.error('No api directory found at', API_DIR);
  process.exit(1);
}

registerHandlers(API_DIR);

// expose route list for debugging
app.get('/__routes', (req, res) => {
  const routes = [];
  (app._router.stack || []).forEach((m) => {
    if (m.route && m.route.path) {
      routes.push({ path: m.route.path, methods: Object.keys(m.route.methods) });
    }
  });
  res.json({ routes });
});

const port = process.env.PORT || 4000;
// Ensure 404s for unmatched API routes return JSON so frontend doesn't get index.html
app.use('/api', (req, res) => {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ message: 'Not found' }));
});

app.listen(port, () => console.log(`API dev server listening on http://localhost:${port}`));
