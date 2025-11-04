#!/bin/bash

# Service Generator Script
# Generates a new x402-enabled service based on the web-scraper template

set -e

# Check arguments
if [ $# -lt 4 ]; then
  echo "Usage: ./generate-service.sh <service-name> <port> <price> <description>"
  echo "Example: ./generate-service.sh company-data-api 3004 0.75 'Company data API service'"
  exit 1
fi

SERVICE_NAME=$1
PORT=$2
PRICE=$3
DESCRIPTION=$4

# Convert service name to PascalCase for class names
SERVICE_CLASS=$(echo "$SERVICE_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')

echo "🚀 Generating service: $SERVICE_NAME"
echo "📦 Port: $PORT"
echo "💰 Price: \$$PRICE USDC"
echo "📝 Description: $DESCRIPTION"

# Create service directory
SERVICE_DIR="examples/$SERVICE_NAME"
mkdir -p "$SERVICE_DIR"

# Copy template from web-scraper
echo "📋 Copying template files..."
cp -r examples/web-scraper/* "$SERVICE_DIR/"

# Remove node_modules and dist if they exist
rm -rf "$SERVICE_DIR/node_modules" "$SERVICE_DIR/dist"

# Update package.json
echo "🔧 Updating package.json..."
sed -i "s/web-scraper-x402/${SERVICE_NAME}-x402/g" "$SERVICE_DIR/package.json"
sed -i "s/web scraping service/${DESCRIPTION}/g" "$SERVICE_DIR/package.json"

# Update .env and .env.example
echo "🔧 Updating environment files..."
for env_file in "$SERVICE_DIR/.env" "$SERVICE_DIR/.env.example"; do
  sed -i "s/SERVICE_NAME=web-scraper/SERVICE_NAME=${SERVICE_NAME}/g" "$env_file"
  sed -i "s/SERVICE_DESCRIPTION=.*/SERVICE_DESCRIPTION=${DESCRIPTION}/g" "$env_file"
  sed -i "s/PORT=3003/PORT=${PORT}/g" "$env_file"
  sed -i "s/PRICE_USDC=1.00/PRICE_USDC=${PRICE}/g" "$env_file"
done

# Update docker-compose.yml
echo "🔧 Updating docker-compose.yml..."
sed -i "s/web-scraper/${SERVICE_NAME}/g" "$SERVICE_DIR/docker-compose.yml"
sed -i "s/3003/${PORT}/g" "$SERVICE_DIR/docker-compose.yml"
sed -i "s/PRICE_USDC:-1.00/PRICE_USDC:-${PRICE}/g" "$SERVICE_DIR/docker-compose.yml"

# Update README.md
echo "🔧 Updating README.md..."
sed -i "s/Web Scraper Service/${SERVICE_CLASS} Service/g" "$SERVICE_DIR/README.md"
sed -i "s/web scraping service/${DESCRIPTION}/g" "$SERVICE_DIR/README.md"
sed -i "s/\$1.00 USDC/\$${PRICE} USDC/g" "$SERVICE_DIR/README.md"
sed -i "s/3003/${PORT}/g" "$SERVICE_DIR/README.md"

echo "✅ Service $SERVICE_NAME generated successfully!"
echo ""
echo "Next steps:"
echo "1. Implement service logic in: $SERVICE_DIR/src/services/"
echo "2. Update README with specific API details"
echo "3. Run: cd $SERVICE_DIR && npm install && npm run build"
echo "4. Test the service: npm run dev"
