#!/bin/bash

# Test sentiment analysis with Claude API

echo "Testing sentiment analysis with Claude API..."
echo ""

curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -H 'X-Payment: {"txHash":"0xtest123","network":"base-sepolia","from":"0x7fC500a9fFf06D0E543503F245865de206459b9f","to":"0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123","amount":"10000","asset":"0x036CbD53842c5426634e7929541eC2318f3dCF7e"}' \
  -d '{"text":"This is absolutely fire! Best thing ever, no cap! I am so hyped right now!"}' \
  2>/dev/null | python -m json.tool
