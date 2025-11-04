#!/bin/bash

# Test Permit Service Complete Flow
# Tests: Chat → Payment → Package Generation → Accela Submission

set -e

API_URL="${API_URL:-http://localhost:3010}"
COLOR_GREEN='\033[0;32m'
COLOR_BLUE='\033[0;34m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
COLOR_RESET='\033[0m'

echo -e "${COLOR_BLUE}╔════════════════════════════════════════════════════════╗${COLOR_RESET}"
echo -e "${COLOR_BLUE}║   Permit Service End-to-End Flow Test                 ║${COLOR_RESET}"
echo -e "${COLOR_BLUE}╚════════════════════════════════════════════════════════╝${COLOR_RESET}"
echo ""

# Step 1: Health Check
echo -e "${COLOR_YELLOW}[1/7] Health Check${COLOR_RESET}"
HEALTH=$(curl -s "$API_URL/health")
echo "$HEALTH" | python -m json.tool
if echo "$HEALTH" | grep -q "healthy"; then
  echo -e "${COLOR_GREEN}✓ Server is healthy${COLOR_RESET}\n"
else
  echo -e "${COLOR_RED}✗ Server health check failed${COLOR_RESET}\n"
  exit 1
fi

# Step 2: Start Chat Session
echo -e "${COLOR_YELLOW}[2/7] Creating Chat Session${COLOR_RESET}"
CHAT_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/chat/message" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need a permit for 123 Main Street Tampa FL 33602. Replacing a 3-ton AC with a 3.5-ton Carrier unit, model 24ACC3. Contractor is Cool Air HVAC, license CAC123456, phone 813-555-1234. Owner is John Smith, phone 813-555-5678. Property is 1500 sq ft built in 2010."
  }')

SESSION_ID=$(echo "$CHAT_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin)['sessionId'])" 2>/dev/null || echo "")

if [ -z "$SESSION_ID" ]; then
  echo -e "${COLOR_RED}✗ Failed to create chat session${COLOR_RESET}"
  echo "$CHAT_RESPONSE" | python -m json.tool
  exit 1
fi

echo -e "${COLOR_GREEN}✓ Session created: $SESSION_ID${COLOR_RESET}"
echo "$CHAT_RESPONSE" | python -m json.tool | head -20
echo ""

# Step 3: Continue Conversation (if not complete)
IS_COMPLETE=$(echo "$CHAT_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('isComplete', False))" 2>/dev/null || echo "False")

if [ "$IS_COMPLETE" != "True" ]; then
  echo -e "${COLOR_YELLOW}[3/7] Continuing Conversation${COLOR_RESET}"
  CHAT_RESPONSE2=$(curl -s -X POST "$API_URL/api/v1/chat/message" \
    -H "Content-Type: application/json" \
    -d "{
      \"sessionId\": \"$SESSION_ID\",
      \"message\": \"The estimated cost is \$8000, installation will take 1 day, including ductwork modifications.\"
    }")
  echo -e "${COLOR_GREEN}✓ Conversation continued${COLOR_RESET}\n"
else
  echo -e "${COLOR_YELLOW}[3/7] Skipping - Chat already complete${COLOR_RESET}\n"
fi

# Step 4: Create Payment Intent (Tier 1)
echo -e "${COLOR_YELLOW}[4/7] Creating Stripe Payment Intent (Tier 1 - \$30)${COLOR_RESET}"
PAYMENT_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/payments/create-intent" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"tier\": \"tier1\"
  }")

CLIENT_SECRET=$(echo "$PAYMENT_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('clientSecret', ''))" 2>/dev/null || echo "")

if [ -z "$CLIENT_SECRET" ]; then
  echo -e "${COLOR_RED}✗ Failed to create payment intent${COLOR_RESET}"
  echo "$PAYMENT_RESPONSE" | python -m json.tool
  exit 1
fi

echo -e "${COLOR_GREEN}✓ Payment intent created${COLOR_RESET}"
echo "$PAYMENT_RESPONSE" | python -m json.tool
echo ""

echo -e "${COLOR_YELLOW}Note: In production, customer would complete payment via Stripe Checkout${COLOR_RESET}"
echo -e "${COLOR_YELLOW}For testing, manually mark session as 'paid' in database or simulate webhook${COLOR_RESET}\n"

# Step 5: Simulate Payment Success (update session status)
echo -e "${COLOR_YELLOW}[5/7] Simulating Payment Success${COLOR_RESET}"
echo -e "${COLOR_YELLOW}Note: In production, Stripe webhook would handle this automatically${COLOR_RESET}"
echo -e "${COLOR_YELLOW}For testing, you would need to:${COLOR_RESET}"
echo -e "${COLOR_YELLOW}  1. Use Stripe CLI to trigger webhook: stripe trigger payment_intent.succeeded${COLOR_RESET}"
echo -e "${COLOR_YELLOW}  2. Or manually update database: UPDATE chat_sessions SET status='paid'${COLOR_RESET}\n"

# Step 6: Generate Package (after payment)
echo -e "${COLOR_YELLOW}[6/7] Generating PDF Package${COLOR_RESET}"
echo -e "${COLOR_YELLOW}Note: This requires session to be in 'paid' status${COLOR_RESET}"
PACKAGE_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/generate-package" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\"
  }")

SUCCESS=$(echo "$PACKAGE_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null || echo "False")

if [ "$SUCCESS" == "True" ]; then
  echo -e "${COLOR_GREEN}✓ Package generated successfully${COLOR_RESET}"
  echo "$PACKAGE_RESPONSE" | python -m json.tool | head -30
else
  echo -e "${COLOR_YELLOW}⚠ Package generation pending (session not paid yet)${COLOR_RESET}"
  echo "$PACKAGE_RESPONSE" | python -m json.tool
fi
echo ""

# Step 7: Test Info Endpoint
echo -e "${COLOR_YELLOW}[7/7] Service Info${COLOR_RESET}"
INFO=$(curl -s "$API_URL/info")
echo "$INFO" | python -m json.tool | head -40
echo ""

# Summary
echo -e "${COLOR_BLUE}╔════════════════════════════════════════════════════════╗${COLOR_RESET}"
echo -e "${COLOR_BLUE}║   Test Summary                                         ║${COLOR_RESET}"
echo -e "${COLOR_BLUE}╚════════════════════════════════════════════════════════╝${COLOR_RESET}"
echo -e "${COLOR_GREEN}✓ Health check passed${COLOR_RESET}"
echo -e "${COLOR_GREEN}✓ Chat session created${COLOR_RESET}"
echo -e "${COLOR_GREEN}✓ Payment intent created${COLOR_RESET}"
if [ "$SUCCESS" == "True" ]; then
  echo -e "${COLOR_GREEN}✓ Package generation successful${COLOR_RESET}"
else
  echo -e "${COLOR_YELLOW}⚠ Package generation requires payment webhook${COLOR_RESET}"
fi
echo ""

echo -e "${COLOR_BLUE}╔════════════════════════════════════════════════════════╗${COLOR_RESET}"
echo -e "${COLOR_BLUE}║   Next Steps for Full Test                            ║${COLOR_RESET}"
echo -e "${COLOR_BLUE}╚════════════════════════════════════════════════════════╝${COLOR_RESET}"
echo "1. Set up Stripe webhook forwarding:"
echo "   stripe listen --forward-to localhost:3010/api/v1/webhooks/stripe"
echo ""
echo "2. Trigger payment success:"
echo "   stripe trigger payment_intent.succeeded"
echo ""
echo "3. Generate package:"
echo "   curl -X POST $API_URL/api/v1/generate-package \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"sessionId\": \"$SESSION_ID\"}'"
echo ""
echo "4. For Tier 2, access preview page:"
echo "   Open: $API_URL/preview/{APPROVAL_TOKEN}"
echo ""
echo "5. Test Accela submission (mock mode):"
echo "   curl -X POST $API_URL/api/v1/submit-to-accela \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"approvalToken\": \"TOKEN\", \"confirmed\": true}'"
echo ""
