#!/bin/bash

echo "🚀 Starting all AgentMarket services..."

# Array of services with their directories and ports
declare -A services=(
    ["presentation-builder-agent"]="3013"
    ["market-research"]="3006"
    ["company-data-api"]="3004"
    ["channel-specialist-agent"]="3012"
    ["pricing-optimizer"]="3009"
    ["copywriter"]="3015"
    ["chart-generator"]="3014"
)

# Start each service in background
for service in "${!services[@]}"; do
    port=${services[$service]}
    if [ -d "examples/$service" ]; then
        echo "Starting $service on port $port..."
        cd "examples/$service"
        npm run dev > "../../logs/$service.log" 2>&1 &
        echo "  ✓ PID: $!"
        cd ../..
    else
        echo "  ✗ Directory not found: examples/$service"
    fi
done

echo ""
echo "📊 Services starting..."
echo "Check logs in ./logs/"
echo "To stop all: pkill -f 'ts-node'"
