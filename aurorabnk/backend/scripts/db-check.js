const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set. Export it before running.');
    process.exit(1);
  }

  const mask = (raw) => raw.replace(/:\/\/[\w.-]+:[^@]+@/i, '://****:****@');
  console.log('🧪 Attempting MongoDB connection to:', mask(uri));

  try {
    const start = Date.now();
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    const ms = Date.now() - start;
    console.log(`✅ Connected in ${ms}ms. Topology state:`, mongoose.connection.readyState);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('ℹ️  Tips: Ensure password is URL-encoded and Atlas IP access allows 0.0.0.0/0');
    process.exit(1);
  } finally {
    try { await mongoose.disconnect(); } catch (_) {}
  }
}

main();
