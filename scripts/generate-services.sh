#!/bin/bash

# Quick service generation script for AgentMarket
# Generates text-summarizer, translator, code-analyzer, data-processor

SERVICES=(
  "text-summarizer:summarize-pro:3003:0.015:Text summarization using Claude API"
  "translator:polyglot-ai:3004:0.01:Multi-language translation service"
  "code-analyzer:code-pro:3005:0.025:Code analysis and quality assessment"
  "data-processor:data-wizard:3006:0.005:Data transformation and processing"
)

for service_config in "${SERVICES[@]}"; do
  IFS=':' read -r DIR NAME PORT PRICE DESC <<< "$service_config"

  echo "Generating $NAME ($DIR)..."

  # Copy base files from image-analyzer
  cp examples/image-analyzer/package.json examples/$DIR/
  cp examples/image-analyzer/tsconfig.json examples/$DIR/
  cp examples/image-analyzer/.gitignore examples/$DIR/
  cp examples/image-analyzer/src/middleware/x402.ts examples/$DIR/src/middleware/

  # Update package.json
  sed -i "s/vision-pro-image-analyzer/$NAME/g" examples/$DIR/package.json
  sed -i "s/AI-powered image analysis service/$DESC/g" examples/$DIR/package.json

  # Create .env
  cat > examples/$DIR/.env <<EOF
# Service Configuration
SERVICE_NAME=$NAME
SERVICE_DESCRIPTION=$DESC
PORT=$PORT

# Payment Configuration
WALLET_ADDRESS=0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123
PRICE_USDC=$PRICE
NETWORK=base-sepolia

# Anthropic API Configuration
ANTHROPIC_API_KEY=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

# Logging
LOG_LEVEL=info
NODE_ENV=development
EOF

  echo "✓ $NAME configured"
done

echo "All services generated!"
