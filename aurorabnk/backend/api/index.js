

const app = require("../src/app");
const { connectDB } = require("../src/config/database");

let dbPromise;
// Ensure DB connection for every serverless invocation
module.exports = async (req, res) => {
	if (!dbPromise) dbPromise = connectDB();
	await dbPromise;
	return app(req, res);
};
