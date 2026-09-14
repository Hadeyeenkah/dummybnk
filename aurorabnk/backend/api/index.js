const app = require("../src/app");
const { connectDB } = require("../src/config/database");

let dbPromise = null;

module.exports = async (req, res) => {
  try {
    // Health check short-circuit before touching the DB at all,
    // useful for confirming the function itself boots correctly.
    if (req.url === "/api/health" && req.method === "GET") {
      return res.status(200).json({ status: "ok", message: "API is healthy (vercel handler)" });
    }

    if (!dbPromise) {
      dbPromise = connectDB();
    }

    try {
      await dbPromise;
    } catch (dbErr) {
      // connectDB() now throws on failure instead of returning false.
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