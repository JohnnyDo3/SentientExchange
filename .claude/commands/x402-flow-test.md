---
name: x402-flow-test
description: Test complete x402 payment workflow with all scenarios
---

Comprehensive x402 payment protocol testing. Since you're new to x402, this tests EVERYTHING.

## Prerequisites Check
1. Verify CDP wallet configured (CDP_API_KEY_NAME, CDP_API_KEY_PRIVATE_KEY)
2. Check Base Sepolia RPC is accessible
3. Verify wallet has testnet USDC balance (need at least $0.50)
4. Start example service on localhost:3001

## Happy Path Test

### Step 1: Initial Request (Expect 402)
Make POST request to service without payment - should return HTTP 402 Payment Required

### Step 2: Parse Payment Requirements
Extract from 402 response:
- Payment amount (e.g., 20000 = 0.02 USDC with 6 decimals)
- Recipient address (payTo field)
- Network (base-sepolia)
- Asset contract address (USDC)
- Timeout (typically 30 seconds)

### Step 3: Check Wallet Balance
Query CDP wallet and verify balance >= required amount

### Step 4: Execute Payment
Send USDC to service wallet and record transaction hash, block number, gas used, timestamp

### Step 5: Wait for Confirmation
Poll transaction status - wait for 1 confirmation (Base is fast, ~2 seconds), timeout after 60 seconds

### Step 6: Retry Request with Payment Proof
Make same request with X-Payment header containing transaction details

### Step 7: Verify Response
Check response status 200, contains expected data, response time logged

### Step 8: Verify On-Chain
Check Base Sepolia explorer for transaction confirmation

---

## Error Scenario Tests (15 cases)

1. **Insufficient Wallet Balance** - Set max payment below required amount
2. **Invalid Payment Address** - Use malformed payTo address
3. **Network Timeout During Payment** - Simulate slow RPC
4. **Service Rejects Payment Proof** - Service returns 402 even after payment
5. **Payment Amount Mismatch** - Send less than required
6. **Wrong Network** - Payment on wrong blockchain
7. **Invalid X-Payment Header Format** - Malformed JSON
8. **Transaction Reverted On-Chain** - Simulated failed transaction
9. **Service Returns 402 After Payment** - Potential replay attack
10. **USDC Contract Not Found** - Wrong asset address
11. **Gas Estimation Failure** - Network issues during estimation
12. **Nonce Collision** - Multiple transactions with same nonce
13. **RPC Endpoint Down** - All endpoints unavailable
14. **Payment Exceeds Max Price** - Service asks more than willing to pay
15. **Seller Address Validation Fails** - Invalid recipient address

---

## Performance Benchmarks

Measure latency for each step:
- Initial request → 402 response: <100ms
- Payment execution: 2-5 seconds
- Transaction confirmation: 2-3 seconds
- Retry with proof → 200 response: <200ms

**Total happy path**: 5-10 seconds

Test 10 simultaneous payments for concurrency.

---

## Test Report Generation

Create detailed JSON report with:
- Test suite results (happy path + all 15 error scenarios)
- Performance metrics (avg payment time, response time, success rate)
- Block explorer links for all transactions
- Troubleshooting guidance

Save to: `test-results/x402-flow-test-TIMESTAMP.json`

Display comprehensive summary with total tests, pass/fail, USDC spent, avg transaction time, and recommendations.
