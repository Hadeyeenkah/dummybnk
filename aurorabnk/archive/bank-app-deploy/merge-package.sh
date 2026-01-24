#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_PKG="$ROOT_DIR/frontend/package.json"
BACKEND_PKG="$ROOT_DIR/backend/package.json"
TARGET_PKG="$DEPLOY_DIR/package.json"

echo "Merging package.json from frontend and backend into $TARGET_PKG"

node - <<'NODE'
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const frontendPath = path.join(ROOT, 'frontend', 'package.json');
const backendPath = path.join(ROOT, 'backend', 'package.json');
const targetPath = path.join(ROOT, 'bank-app-deploy', 'package.json');

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch(e) { return {}; }
}

const frontend = readJSON(frontendPath);
const backend = readJSON(backendPath);
const target = readJSON(targetPath);

const merged = Object.assign({}, target);
// Merge dependencies: prefer backend over frontend, prefer target over both
merged.dependencies = Object.assign({}, frontend.dependencies || {}, backend.dependencies || {}, target.dependencies || {});
merged.devDependencies = Object.assign({}, frontend.devDependencies || {}, backend.devDependencies || {}, target.devDependencies || {});
// Merge scripts: keep target scripts, then frontend, then backend (backend wins if conflict)
merged.scripts = Object.assign({}, target.scripts || {}, frontend.scripts || {}, backend.scripts || {});

if (!merged.name) merged.name = 'my-fullstack-app';
if (!merged.version) merged.version = '1.0.0';

fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2));
console.log('Wrote', targetPath);
NODE

echo "Installing dependencies in $DEPLOY_DIR (this may take a while)..."
cd "$DEPLOY_DIR"
npm install --no-audit --no-fund

echo "Done. Updated and installed dependencies in $DEPLOY_DIR/package.json"
