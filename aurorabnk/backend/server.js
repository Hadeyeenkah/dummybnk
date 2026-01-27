
const app = require("./src/app");
const { connectDB } = require("./src/config/database");

async function startServer() {
  await connectDB();
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();