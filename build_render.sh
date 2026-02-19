#!/usr/bin/env bash
# Exit on error
set -e

echo "🔹 Starting Custom Build Script"
echo "🔹 Node Version: $(node -v)"
echo "🔹 NPM Version: $(npm -v)"

cd backend

# Clean install to avoid conflicts
echo "🔹 Removing stale modules and lockfiles..."
rm -rf node_modules package-lock.json

echo "🔹 Installing dependencies..."
npm install

echo "🔹 Verifying OpenAI module..."
node -e "require('openai'); console.log('✅ OpenAI successfully loaded');"

echo "✅ Build Complete"
