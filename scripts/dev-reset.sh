#!/bin/bash

echo "🔄 Resetting development environment..."

# Kill any running dev servers
echo "Stopping dev servers..."
pkill -f "npm run dev" || true
pkill -f "vite" || true

# Clear various caches
echo "Clearing caches..."
npm cache clean --force 2>/dev/null || true

# Clear browser cache instruction
echo "📋 Manual steps:"
echo "1. Open DevTools (F12)"
echo "2. Right-click refresh button"
echo "3. Select 'Empty Cache and Hard Reload'"
echo "4. Or use Ctrl+Shift+R (Cmd+Shift+R on Mac)"

# Restart dev server
echo "🚀 Restarting dev server..."
npm run dev

echo "✅ Reset complete!" 