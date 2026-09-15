// Root-level Vercel serverless function.
//
// IMPORTANT: This MUST export the backend handler *wrapper* (from
// backend/api/index.js) and NOT the raw Express app.
//
// Why: the wrapper awaits connectDB() before delegating to the Express app.
// If we export the raw Express app instead, connectDB() is never called, so
// Mongoose has no connection and every query buffers for 10s before failing
// with:
//     Operation `users.findOne()` buffering timed out after 10000ms
//
// (A previous version of this file had a second `module.exports = app`
// statement at the bottom which silently overwrote the handler export and
// caused exactly that production bug.)
module.exports = require('../backend/api/index');