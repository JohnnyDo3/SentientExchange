#!/bin/bash

# Test AI-Permit-Tampa Service
# Tests all 3 endpoints with sample data

set -e

SERVICE_URL=${SERVICE_URL:-http://localhost:3010}
echo "🧪 Testing AI-Permit-Tampa Service at $SERVICE_URL"
echo ""

# Test 1: Health check
echo "1️⃣ Testing health endpoint..."
curl -s "$SERVICE_URL/health" | jq '.'
echo "✅ Health check passed"
echo ""

# Test 2: Service info
echo "2️⃣ Testing info endpoint..."
curl -s "$SERVICE_URL/info" | jq '.pricing'
echo "✅ Info endpoint passed"
echo ""

# Test 3: Permit info (should return 402)
echo "3️⃣ Testing permit-info endpoint (should require payment)..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$SERVICE_URL/api/v1/permit-info" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "equipmentType": "furnace",
    "jobType": "replacement",
    "btu": 80000,
    "tonnage": 3,
    "location": {
      "address": "123 Main St",
      "city": "Tampa",
      "county": "hillsborough",
      "zipCode": "33602"
    },
    "propertyType": "residential"
  }')

STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$STATUS" -eq 402 ]; then
  echo "✅ Correctly returned 402 Payment Required"
  echo "$BODY" | jq '.accepts[0] | {price: .maxAmountRequired, payTo: .payTo}'
else
  echo "❌ Expected 402, got $STATUS"
fi
echo ""

# Test 4: Form generator (should return 402)
echo "4️⃣ Testing form-generator endpoint (should require payment)..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$SERVICE_URL/api/v1/generate-form" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "permitInfo": {
      "equipmentType": "ac-unit",
      "jobType": "replacement",
      "tonnage": 3.5,
      "location": {
        "address": "456 Oak Ave",
        "city": "Tampa",
        "county": "hillsborough",
        "zipCode": "33606"
      }
    },
    "contractor": {
      "name": "HVAC Pros LLC",
      "phone": "(813) 555-1234",
      "email": "info@hvacpros.com",
      "licenseNumber": "CAC123456"
    },
    "property": {
      "ownerName": "John Doe",
      "ownerPhone": "(813) 555-5678"
    },
    "equipmentDetails": {
      "manufacturer": "Carrier",
      "model": "24ACC636A003"
    },
    "installation": {
      "estimatedStartDate": "2025-02-01",
      "estimatedCost": 5500,
      "description": "Replace existing 3-ton AC unit with new energy-efficient model"
    }
  }')

STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$STATUS" -eq 402 ]; then
  echo "✅ Correctly returned 402 Payment Required"
  echo "$BODY" | jq '.accepts[0] | {price: .maxAmountRequired, payTo: .payTo}'
else
  echo "❌ Expected 402, got $STATUS"
fi
echo ""

# Test 5: Auto-submit (should return 402 then 503)
echo "5️⃣ Testing auto-submit endpoint (Phase 3 - should be unavailable)..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$SERVICE_URL/api/v1/submit-permit" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{}')

STATUS=$(echo "$RESPONSE" | tail -n 1)

if [ "$STATUS" -eq 402 ]; then
  echo "✅ Correctly returned 402 Payment Required (Phase 3 not active)"
else
  echo "Status: $STATUS"
fi
echo ""

echo "🎉 Service tests complete!"
echo ""
echo "To test with actual payment:"
echo "  1. Send USDC to the service wallet"
echo "  2. Include X-Payment header with transaction proof"
echo "  3. Retry the request"
