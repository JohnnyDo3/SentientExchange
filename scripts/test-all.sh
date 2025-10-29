#!/bin/bash
# Run all tests with coverage

set -e

echo "🧪 Running comprehensive test suite..."

# Run unit tests
echo ""
echo "=== Unit Tests ==="
npm run test:unit -- --coverage

# Run integration tests
echo ""
echo "=== Integration Tests ==="
npm run test:integration

# Run e2e tests
echo ""
echo "=== E2E Tests ==="
npm run test:e2e

# Generate coverage report
echo ""
echo "=== Generating Coverage Report ==="
npm run test -- --coverage --coverageReporters=html --coverageReporters=text

# Check coverage thresholds
echo ""
echo "=== Checking Coverage Thresholds ==="
npm run test -- --coverage --coverageThreshold='{"global":{"statements":80,"branches":80,"functions":80,"lines":80}}'

echo ""
echo "✅ All tests passed!"
echo ""
echo "Coverage report: coverage/index.html"
