#!/bin/bash
# Setup script for demo-ecwid-plugin
# Run: bash scripts/setup.sh

set -e

echo "=== Demo Ecwid Plugin Setup ==="
echo ""

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js 20+ is required. Current: $(node -v 2>/dev/null || echo 'not installed')"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
  echo ""
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠  Edit .env with your Ecwid credentials before starting the server."
else
  echo "✅ .env already exists"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit .env with your Ecwid credentials"
echo "  2. Run: npm run dev"
echo "  3. Open: http://localhost:3000/health"
echo ""
