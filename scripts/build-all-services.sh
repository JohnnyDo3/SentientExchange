#!/bin/bash

# Build All Services Script
# Installs dependencies and builds all 14 AgentMarket services

set -e  # Exit on error

SERVICES=(
  "web-scraper"
  "company-data-api"
  "news-aggregator"
  "market-research"
  "feature-extractor"
  "trend-forecaster"
  "pricing-optimizer"
  "chart-generator"
  "copywriter"
  "pdf-generator"
  "data-aggregator-agent"
  "report-writer-agent"
  "channel-specialist-agent"
  "presentation-builder-agent"
)

EXAMPLES_DIR="examples"
FAILED_SERVICES=()
SUCCESS_COUNT=0

echo "=========================================="
echo "Building All AgentMarket Services"
echo "=========================================="
echo ""

# Function to build a single service
build_service() {
  local service=$1
  local service_path="${EXAMPLES_DIR}/${service}"

  echo "[$service] Starting build..."

  if [ ! -d "$service_path" ]; then
    echo "[$service] ERROR: Directory not found"
    return 1
  fi

  cd "$service_path"

  # Install dependencies
  echo "[$service] Installing dependencies..."
  if ! npm install --silent > /dev/null 2>&1; then
    echo "[$service] ERROR: npm install failed"
    cd - > /dev/null
    return 1
  fi

  # Build TypeScript
  echo "[$service] Building TypeScript..."
  if ! npm run build > /dev/null 2>&1; then
    echo "[$service] ERROR: npm run build failed"
    cd - > /dev/null
    return 1
  fi

  echo "[$service] ✅ Build successful"
  cd - > /dev/null
  return 0
}

# Build all services
for service in "${SERVICES[@]}"; do
  if build_service "$service"; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    FAILED_SERVICES+=("$service")
  fi
  echo ""
done

echo "=========================================="
echo "Build Summary"
echo "=========================================="
echo "Total services: ${#SERVICES[@]}"
echo "Successful: $SUCCESS_COUNT"
echo "Failed: ${#FAILED_SERVICES[@]}"

if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
  echo ""
  echo "Failed services:"
  for service in "${FAILED_SERVICES[@]}"; do
    echo "  - $service"
  done
  exit 1
else
  echo ""
  echo "✅ All services built successfully!"
  exit 0
fi
