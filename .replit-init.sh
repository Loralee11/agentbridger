#!/bin/bash

# Skip Git auto-push in recovery mode
echo "⚠️  Skipping Git push in recovery mode"

# Diagnostic: Show current directory and node version
echo "📂 Current directory: $(pwd)"
ls -l
echo "🧪 Node version: $(node -v 2>/dev/null || echo 'not found')"

# Check if node is available
if command -v node &> /dev/null
then
  echo "✅ Node.js available — running autoPush.sh..."

  # Run Git auto-push before starting server
  if [ -f "./autoPush.sh" ]; then
    bash ./autoPush.sh >> logs/git-sync.log 2>&1
  else
    echo "⚠️ autoPush.sh not found. Skipping Git push."
  fi

  echo "[startup] ✅ Launching relay from .replit-init.sh"   # ✅ NEW LINE HERE
  echo "🌐 Relay server starting on port 3000..."
  echo "🟢 Replit Run Triggered"

  node server.js
else
  echo "❌ Node.js not available — skipping server start"
fi

