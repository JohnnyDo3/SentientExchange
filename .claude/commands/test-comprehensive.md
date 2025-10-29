---
name: test-comprehensive
description: Run all test suites with detailed reporting
---

Run comprehensive test suite covering all scenarios:

## 1. Unit Tests
- Test ServiceRegistry CRUD operations
- Test Database layer (SQLite with :memory:)
- Test WalletManager initialization and balance checks
- Test X402Client payment flow logic
- Test all MCP tool functions (discover, details, purchase, rate)
- Test utility functions (validation, logging)

## 2. Integration Tests
- Test MCP server tool registration
- Test tool invocation through MCP protocol
- Test database persistence and retrieval
- Test payment flow with mock services
- Test transaction logging end-to-end
- Test rating system updates to reputation

## 3. End-to-End Tests
- Start MCP server in test mode
- Connect as MCP client
- Execute discover_services
- Execute purchase_service with mock payment
- Execute rate_service
- Verify all data persisted correctly

## 4. x402 Payment Flow Tests
Test 15 error scenarios:
1. Insufficient wallet balance
2. Invalid payment address
3. Network timeout during payment
4. Service rejects payment proof
5. Payment amount mismatch
6. Wrong blockchain network
7. Invalid X-Payment header format
8. Transaction reverted on-chain
9. Service returns 402 after payment
10. USDC contract not found
11. Gas estimation failure
12. Nonce collision
13. RPC endpoint unavailable
14. Payment exceeds max price
15. Seller address validation failure

## 5. Security Tests
- Test SQL injection prevention (parameterized queries)
- Test for XSS in MCP tool responses
- Test input validation on all tools
- Test rate limiting (if implemented)
- Verify secrets not exposed in logs

## 6. Performance Tests
- Test 100 concurrent service discoveries
- Test database performance with 10,000 services
- Measure MCP tool response times
- Test memory usage under load

## 7. Coverage Analysis
- Generate coverage report
- Highlight files below 80% coverage
- Identify untested code paths
- Suggest additional test cases

## 8. Reporting
- Display pass/fail summary for each suite
- Show execution time per suite
- Generate HTML report in coverage/
- Create test-results.json for CI/CD
- Display coverage percentage prominently
- Flag any regressions from previous run

Stop at first failure and provide detailed error information with file:line references.
