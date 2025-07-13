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
  echo "✅ Node.js available — starting AgentBridger relay server..."
  echo "🌐 Relay server starting on port 3000..."
  node server.js
else
  echo "❌ Node.js not available — skipping server start"
fi


