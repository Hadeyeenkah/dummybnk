const functions = require('firebase-functions');
const { defineSecret } = require('firebase-functions/params');

// Define env vars as deploy-time parameters (2nd gen compatible)
// These will be exposed to process.env at runtime
const MONGODB_URI = defineSecret('MONGODB_URI');
const JWT_SECRET = defineSecret('JWT_SECRET');
const JWT_REFRESH_SECRET = defineSecret('JWT_REFRESH_SECRET');
const CLIENT_ORIGINS = defineSecret('CLIENT_ORIGINS');

// Import the Express app exported by the backend package
// backend/package.json exports ./src/app.js
const app = require('securebank-backend');

// Single HTTPS function handling all /api/* routes via Hosting rewrite
exports.api = functions
	.region('us-central1')
	.runWith({
		secrets: [MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET, CLIENT_ORIGINS]
	})
	.https.onRequest(app);
