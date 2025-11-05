#!/bin/bash

# Run Real E2E Tests
# Orchestrates starting services, running tests, and cleanup

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        AgentMarket Real E2E Test Runner                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check environment
if [ -z "$SOLANA_PRIVATE_KEY" ]; then
    echo "❌ SOLANA_PRIVATE_KEY not set!"
    echo ""
    echo "Please run: ./scripts/setup-test-wallet.sh"
    echo "Then set SOLANA_PRIVATE_KEY in .env"
    echo ""
    exit 1
fi

echo "✅ Environment configured"
echo ""

# Build project
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Building project..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run build

echo "✅ Build complete"
echo ""

# Run tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Running TRUE E2E tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  This will:"
echo "  - Start sentiment-analyzer service"
echo "  - Execute real Solana devnet transactions"
echo "  - Cost ~0.05 USDC in test payments"
echo ""
read -p "Continue? (y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "Aborted."
    exit 0
fi

echo ""

# Set test environment
export NODE_ENV=test
export RUN_REAL_E2E=true

# Run tests with verbose output
npm test -- tests/e2e/true-e2e-payment-flow.test.ts --verbose

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ E2E Tests Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
