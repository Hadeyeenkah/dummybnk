#!/bin/bash
# Start backend server

cd "$(dirname "$0")"

echo "🚀 Starting Aurora Bank Backend..."
echo "📍 Port: ${PORT:-5000}"
echo ""

# Kill existing process on port 5000
lsof -ti:5000 | xargs kill -9 2>/dev/null

# Start server
node server.js
