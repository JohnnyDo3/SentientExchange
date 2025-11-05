# TRUE Enterprise E2E Testing Guide

This guide covers running **real end-to-end tests** with actual Solana blockchain transactions and live x402 services.

## What Makes These Tests "TRUE E2E"?

✅ **Real blockchain transactions** - Actual USDC transfers on Solana devnet
✅ **Real x402 services** - sentiment-analyzer runs during tests
✅ **Real on-chain verification** - Verifies transactions on Solana blockchain
✅ **Real spending limits** - Database-backed budget enforcement
✅ **Real error scenarios** - Tests actual payment failures, not mocks

**NO MOCKS** - These tests interact with real services and real blockchains.

---

## Prerequisites

### 1. Solana CLI Tools

Install Solana CLI:
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

Verify installation:
```bash
solana --version
```

### 2. SPL Token CLI

Install (if not included with Solana):
```bash
cargo install spl-token-cli
```

### 3. Funded Test Wallet

**Requirements:**
- Minimum **0.1 SOL** (for transaction fees)
- Minimum **0.5 USDC** (for test purchases)

**Quick Setup:**
```bash
./scripts/setup-test-wallet.sh
```

This script will:
1. Generate a new keypair
2. Request devnet SOL
3. Create USDC token account
4. Guide you to get USDC from faucet

---

## Manual Wallet Setup

If you prefer manual setup:

### Step 1: Generate Keypair

```bash
solana-keygen new --outfile test-wallet.json
```

### Step 2: Get Public Key

```bash
PUBKEY=$(solana-keygen pubkey test-wallet.json)
echo "Your address: $PUBKEY"
```

### Step 3: Request Devnet SOL

```bash
solana airdrop 1 $PUBKEY --url devnet
```

Check balance:
```bash
solana balance $PUBKEY --url devnet
```

### Step 4: Create USDC Token Account

```bash
# Devnet USDC mint address
USDC_MINT="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

# Create token account
spl-token create-account $USDC_MINT --url devnet --owner test-wallet.json
```

### Step 5: Get Devnet USDC

Visit one of these faucets:
- **Circle Faucet:** https://faucet.circle.com/
- **SPL Token Faucet:** https://spl-token-faucet.com/

Send USDC to your address: `$PUBKEY`

Check USDC balance:
```bash
spl-token balance $USDC_MINT --url devnet --owner test-wallet.json
```

### Step 6: Export Private Key

Convert your keypair to base58 format:

```bash
# Read the keypair
cat test-wallet.json

# Convert to base58 (using Node.js)
node -e "console.log(require('bs58').encode(Buffer.from(JSON.parse(require('fs').readFileSync('test-wallet.json')))))"
```

Add to `.env`:
```bash
SOLANA_PRIVATE_KEY=<base58-encoded-key>
```

---

## Running E2E Tests

### Option 1: Automated Script

```bash
./scripts/run-real-e2e.sh
```

This script:
1. Validates environment
2. Builds the project
3. Starts sentiment-analyzer service
4. Runs E2E tests
5. Cleans up services

### Option 2: Manual Execution

```bash
# Build project
npm run build

# Run E2E tests
npm test tests/e2e/true-e2e-payment-flow.test.ts
```

The tests will:
1. Auto-start sentiment-analyzer
2. Validate your wallet
3. Execute real payments
4. Verify on blockchain
5. Clean up automatically

---

## Test Coverage

### 1. Full x402 Payment Flow
**Test:** Complete 402 → pay → verify → result flow
**What it does:**
- Makes request without payment → gets 402
- Executes real USDC transfer on Solana
- Verifies payment on-chain
- Retries with payment proof
- Gets real sentiment analysis result

### 2. Error Scenarios
**Test:** Payment with wrong amount
**What it does:**
- Pays incorrect amount
- Verifies service rejects it
- Confirms 402 returned again

**Test:** Spending limit enforcement
**What it does:**
- Sets very low spending limit
- Confirms purchase is blocked
- Validates error message

### 3. Real Service Features
**Test:** Detailed sentiment analysis
**What it does:**
- Sends negative text
- Verifies correct sentiment detected
- Validates emotion analysis works

### 4. Performance & Reliability
**Test:** Multiple sequential purchases
**What it does:**
- Executes 3 purchases in sequence
- Validates each payment separately
- Confirms all results correct

---

## Understanding Test Output

### Wallet Validation
```
📊 Wallet Information:
  Address: C89xSXFC...Bckt1f
  SOL Balance: 7.9637 SOL
  USDC Token Account: ✅ Yes
  USDC Balance: 1.50 USDC
```

### Service Startup
```
🚀 Starting sentiment-analyzer...
  ✓ Health check passed for sentiment-analyzer
✅ sentiment-analyzer started at http://localhost:4523
```

### Payment Flow
```
🎯 Testing complete x402 payment flow...

Step 1: Request without payment...
  → Status: 402
  → Payment required: 10000 base units
  → Recipient: DeDDFd3F...
  → Token: 4zMMC9sr...

Step 2: Check spending limit...
  → Limit check: ✅ Allowed

Step 3: Execute REAL Solana payment...
  → Transaction signature: 3Kx7Qp...
  → Status: confirmed

Step 4: Verify payment on blockchain...
  → Verification: ✅ Valid

Step 5: Retry with payment proof...
  → Status: 200
  → Success: true

Step 6: Verify service result...
  → Overall sentiment: positive (0.89)
  → Confidence: 91.2%

✅ Complete x402 flow successful!
```

---

## Troubleshooting

### Error: "SOLANA_PRIVATE_KEY not set"

**Solution:**
```bash
# Run wallet setup
./scripts/setup-test-wallet.sh

# Convert keypair to base58 and add to .env
echo "SOLANA_PRIVATE_KEY=<your-base58-key>" >> .env
```

### Error: "Insufficient SOL balance"

**Solution:**
```bash
# Request more SOL from faucet
solana airdrop 1 <YOUR_ADDRESS> --url devnet

# Check balance
solana balance <YOUR_ADDRESS> --url devnet
```

### Error: "No USDC token account found"

**Solution:**
```bash
# Create USDC token account
USDC_MINT="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
spl-token create-account $USDC_MINT --url devnet
```

### Error: "Insufficient USDC balance"

**Solution:**
Visit faucets to get devnet USDC:
- https://faucet.circle.com/
- https://spl-token-faucet.com/

### Error: "Service failed to start"

**Solution:**
```bash
# Check if port is available
lsof -i :3001

# Install dependencies for sentiment-analyzer
cd examples/sentiment-analyzer
npm install
npm run build

# Try starting manually
npm run dev
```

### Error: "Payment verification failed"

**Possible causes:**
1. Transaction not yet confirmed on blockchain (wait 1-2 seconds)
2. Wrong network (check NETWORK=devnet)
3. RPC node issues (try different RPC endpoint)

**Solution:**
```bash
# Check transaction on explorer
# Visit: https://explorer.solana.com/?cluster=devnet
# Paste your transaction signature
```

---

## Cost Analysis

### Transaction Costs

**Per E2E Test Run:**
- SOL (transaction fees): ~0.00001 SOL per transaction
- USDC (service payments): ~$0.05 USDC total
- Total cost: **< $0.01 USD** (devnet tokens are free)

**For 100 Test Runs:**
- SOL needed: ~0.001 SOL
- USDC needed: ~5 USDC
- Both are free on devnet!

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on:
  push:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Solana CLI
        run: |
          sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
          echo "$HOME/.local/share/solana/install/active_release/bin" >> $GITHUB_PATH

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Run E2E tests
        env:
          SOLANA_PRIVATE_KEY: ${{ secrets.SOLANA_PRIVATE_KEY }}
          NODE_ENV: test
        run: npm test tests/e2e/true-e2e-payment-flow.test.ts
```

**Required Secrets:**
- `SOLANA_PRIVATE_KEY`: Base58-encoded test wallet private key

---

## Best Practices

### 1. Use Dedicated Test Wallet
- **Never** use your mainnet wallet
- Create a separate wallet for testing only
- Keep only minimal funds (0.1 SOL + 0.5 USDC)

### 2. Network Isolation
- Always use `devnet` for tests
- Never test on mainnet
- Verify `NETWORK=devnet` in environment

### 3. Security
- **Never** commit private keys to git
- Use `.env` files (in `.gitignore`)
- Rotate test keys regularly
- Use GitHub Secrets for CI/CD

### 4. Rate Limiting
- Don't run E2E tests too frequently
- Respect RPC rate limits
- Use caching where possible

### 5. Cleanup
- Tests auto-cleanup services
- Manually verify no hanging processes
- Monitor wallet balances

---

## Comparison: Infrastructure Tests vs TRUE E2E

### Infrastructure Tests (`real-payment-flow.test.ts`)
✅ Real database operations
✅ Real spending limit logic
✅ Real service registry
❌ Mock service endpoints
❌ No actual payments
**Use for:** Fast unit/integration testing

### TRUE E2E Tests (`true-e2e-payment-flow.test.ts`)
✅ Real x402 services
✅ Real blockchain transactions
✅ Real on-chain verification
✅ Real service responses
✅ Real error scenarios
**Use for:** Pre-deployment validation

---

## FAQ

**Q: Can I run these tests without funding a wallet?**
A: No. TRUE E2E tests require real blockchain transactions, which need funded wallets.

**Q: Will these tests cost me money?**
A: On devnet, tokens are free. On mainnet, yes, but you should **never** run tests on mainnet.

**Q: How long do E2E tests take?**
A: ~2-3 minutes for full suite (multiple blockchain confirmations)

**Q: Can I run tests in parallel?**
A: Not recommended. Blockchain transactions need sequential processing to avoid nonce conflicts.

**Q: What if a test fails mid-execution?**
A: Services auto-cleanup in `afterAll()`. Your wallet will have spent USDC on successful transactions.

**Q: How do I check my wallet balance?**
A: `solana balance <ADDRESS> --url devnet`
   `spl-token balance <USDC_MINT> --url devnet`

---

## Support

Having issues? Check:
1. **Logs:** `npm test` outputs detailed logs
2. **Wallet:** Verify balances and token accounts
3. **Services:** Check if sentiment-analyzer can start manually
4. **Network:** Try a different Solana RPC endpoint

Still stuck? Open an issue with:
- Error message
- Test output logs
- Wallet address (public key only!)
- Environment (OS, Node version, etc.)

---

## Next Steps

After running TRUE E2E tests successfully:

1. **Deploy to Testnet:** Update `NETWORK=testnet` and repeat
2. **Add More Services:** Test image-analyzer, text-summarizer
3. **Stress Testing:** Implement concurrent payment tests
4. **Monitoring:** Add metrics and alerts
5. **Production:** Deploy with confidence!

🎉 **You're now running production-grade E2E tests!**
