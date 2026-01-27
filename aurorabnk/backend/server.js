// Local server entry point for development/testing

const app = require("./src/app");
const { connectDB } = require("./src/config/database");

async function startServer() {
  await connectDB();
  let PORT = Number(process.env.PORT) || 5001;
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down gracefully');
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    console.log('👋 SIGINT received, shutting down gracefully');
    server.close(() => process.exit(0));
  });
}

startServer();