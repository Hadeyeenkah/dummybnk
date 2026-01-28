

const app = require("../src/app");
const { connectDB } = require("../src/config/database");

let dbPromise;
// Add a root route handler for GET /
app.get('/', (req, res) => {
	res.status(200).json({
		status: 'ok',
		message: 'AuroraBNK backend is running. Use /api/* endpoints.'
	});
});
// Ensure DB connection for every serverless invocation
module.exports = async (req, res) => {
	if (!dbPromise) dbPromise = connectDB();
	await dbPromise;
	return app(req, res);
};
