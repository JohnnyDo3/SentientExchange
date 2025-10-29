#!/bin/bash
# Setup script for AgentMarket MCP development environment

set -e

echo "🚀 Setting up AgentMarket MCP development environment..."

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20 or higher is required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "Installing dependencies..."
npm install

# Create necessary directories
echo "Creating directories..."
mkdir -p data
mkdir -p logs
mkdir -p test-results
mkdir -p coverage

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your CDP API keys"
else
    echo "✅ .env file already exists"
fi

# Build the project
echo "Building project..."
npm run build

# Run tests
echo "Running tests..."
npm test

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your CDP API credentials"
echo "2. Run 'npm run dev' to start development server"
echo "3. Run 'npm test' to run tests"
echo ""
