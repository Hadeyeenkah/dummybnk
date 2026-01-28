const app = require("../src/app");
const { connectDB } = require("../src/config/database");

let dbPromise;
module.exports = async (req, res) => {
  try {
    if (!dbPromise) dbPromise = connectDB();
    await dbPromise;
    // Directly handle health check for debugging
    if (req.url === "/api/health" && req.method === "GET") {
      return res.status(200).json({ status: "ok", message: "API is healthy (vercel handler)" });
    }
    return app(req, res);
  } catch (err) {
    console.error("[Vercel Handler Error]", err);
    res.status(500).json({ status: "error", message: err.message || "Internal server error" });
  }
};
