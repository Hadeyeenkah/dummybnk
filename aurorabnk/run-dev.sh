#!/usr/bin/env bash
set -euo pipefail

# Helper to run backend and frontend from repository root (aurorabnk)
# Usage: ./run-dev.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting backend (in background)..."
cd "$ROOT_DIR/backend"
npm start &
BACK_PID=$!
echo "Backend PID: $BACK_PID"

echo "Starting frontend (foreground)..."
cd "$ROOT_DIR/frontend"
npm start

# When frontend exits, optionally kill backend started above
echo "Shutting down backend PID $BACK_PID"
kill $BACK_PID 2>/dev/null || true
