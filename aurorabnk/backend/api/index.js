const mongoose = require("mongoose");
const app = require("../src/app");
const { connectDB } = require("../src/config/database");

let dbPromise = null;

module.exports = async (req, res) => {
  try {
    // Health check short-circuit BEFORE touching the DB, so a health probe
    // never has to wait on (or fail because of) a DB connection attempt.
    //
    // IMPORTANT: this still delegates to `app(req, res)` rather than
    // building the response by hand. Building it by hand skips the cors()
    // middleware defined in src/app.js entirely, which caused /api/health
    // specifically to fail with a CORS error in the browser while every
    // other route (going through app(req, res) normally) worked fine.
    // Express's own /api/health route in app.js already reports live
    // mongoose.connection.readyState and needs no DB connection to run.
    if (req.url === "/api/health" && req.method === "GET") {
      return app(req, res);
    }

    if (!dbPromise) {
      dbPromise = connectDB();
    }

    try {
      await dbPromise;
    } catch (dbErr) {
      // connectDB() throws on failure instead of returning false.
      // Reset the cache so the NEXT request in this warm container
      // gets a fresh attempt instead of being stuck with a dead promise.
      dbPromise = null;
      console.error("[DB Connection Error]", dbErr);
      return res.status(503).json({
        status: "error",
        message: "Database unavailable, please try again shortly",
      });
    }

    return app(req, res);
  } catch (err) {
    console.error("[Vercel Handler Error]", err);
    res.status(500).json({ status: "error", message: err.message || "Internal server error" });
  }
};