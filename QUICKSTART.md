# AgentMarket MCP - Quick Start Guide

## 🎯 Current Project Status

**GREAT NEWS!** The project is ~90% complete and ready for testing!

### ✅ What's Working:
- ✅ Core MCP Server with 7 tools fully implemented
- ✅ All 201 tests passing
- ✅ Database initialized and seeded with services
- ✅ CDP Wallet configured with 10.06 USDC on Base Sepolia testnet
- ✅ Example sentiment-analyzer service built and ready
- ✅ Complete documentation

### 📊 Test Results:
```
Test Suites: 15 total (all passing)
Tests: 201 passed, 201 total
Wallet: 0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123
Balance: 10.06 USDC (base-sepolia testnet)
```

---

## 🚀 How to Test Everything

### Option 1: Test with Claude Desktop (Full Experience)

#### Step 1: Configure Claude Desktop

1. **Find your Claude Desktop config file:**
   - Windows: `%APPDATA%\Claude\config.json`
   - macOS: `~/Library/Application Support/Claude/config.json`
   - Linux: `~/.config/claude/config.json`

2. **Add this MCP server configuration:**

```json
{
  "mcpServers": {
    "agentmarket": {
      "command": "node",
      "args": ["C:/Users/johnn/Desktop/agentMarket-mcp/dist/index.js"],
      "env": {
        "CDP_API_KEY_NAME": "your-api-key-name",
        "CDP_API_KEY_PRIVATE_KEY": "your-api-key-private-key",
        "NETWORK": "base-sepolia",
        "DATABASE_PATH": "C:/Users/johnn/Desktop/agentMarket-mcp/data/agentmarket.db",
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Note:** Use your actual CDP API credentials from `.env` file!

3. **Restart Claude Desktop completely** (quit and reopen)

#### Step 2: Start Required Services

```bash
# Terminal 1: Start the sentiment analyzer service
cd examples/sentiment-analyzer
npm start

# Terminal 2: Claude Desktop will auto-start the MCP server when you open it
```

#### Step 3: Test in Claude Desktop

Open Claude Desktop and try these commands:

```
"Show me what AI services are available"
→ Should list the Sentiment Analyzer service

"Get details about the sentiment analysis service"
→ Should show pricing, capabilities, endpoint info

"Check my USDC wallet balance"
→ Should show ~10.06 USDC on base-sepolia

"Use the sentiment analyzer to analyze this text: This product is absolutely amazing! I love it so much!"
→ Will execute x402 payment and return sentiment analysis

"Show my transaction history"
→ Should show the completed purchase
```

---

### Option 2: Test via API (Without Claude Desktop)

If you want to test without Claude Desktop integration:

#### Step 1: Start the API Server

```bash
# Terminal 1: Start sentiment analyzer
cd examples/sentiment-analyzer
npm start

# Terminal 2: Start MCP server (for database/registry)
npm start

# Terminal 3: Start API server
npm run start:api
```

#### Step 2: Test with curl

```bash
# List all services
curl http://localhost:3333/api/services

# Search for services
curl -X POST http://localhost:3333/api/services/search \
  -H "Content-Type: application/json" \
  -d '{
    "capabilities": ["sentiment-analysis"],
    "maxPrice": "0.10"
  }'

# Get marketplace stats
curl http://localhost:3333/api/stats
```

---

### Option 3: Automated Test Flow

We have a test script that simulates the full flow:

```bash
# Make sure sentiment analyzer is running first
cd examples/sentiment-analyzer && npm start &

# Run the e2e test
npm run test:e2e
```

---

## 🧪 Testing the x402 Payment Flow

The x402 protocol flow works like this:

```
1. MCP Client (Claude) → discover_services
   └─ Returns available services

2. MCP Client → purchase_service with data
   └─ AgentMarket initiates x402 flow:

3. AgentMarket → HTTP Request to service endpoint
   └─ Service returns 402 Payment Required + payment details

4. AgentMarket → Execute USDC payment on Base blockchain
   └─ Transaction hash returned

5. AgentMarket → Retry request with X-Payment header (proof)
   └─ Service validates payment and returns result

6. AgentMarket → Return result + receipt to client
   └─ Transaction logged in database
```

### Manual x402 Test:

```bash
# Terminal 1: Sentiment analyzer running on port 3001
cd examples/sentiment-analyzer && npm start

# Terminal 2: Test the x402 flow
node test-e2e-flow.js
```

---

## 📁 Project Structure

```
agentmarket-mcp/
├── src/
│   ├── index.ts              # MCP server entry point ✅
│   ├── server.ts             # MCP server with 7 tools ✅
│   ├── registry/             # Service registry + SQLite ✅
│   ├── payment/              # CDP wallet + x402 client ✅
│   ├── tools/                # 7 MCP tools ✅
│   ├── api/                  # REST API server ✅
│   └── auth/                 # SIWE authentication ✅
├── examples/
│   └── sentiment-analyzer/   # Example x402 service ✅
├── tests/                    # 201 passing tests ✅
├── data/
│   ├── agentmarket.db        # SQLite database (seeded) ✅
│   └── wallet.json           # CDP wallet data ✅
└── dist/                     # Compiled TypeScript ✅
```

---

## 🔧 Common Commands

```bash
# Build project
npm run build

# Run all tests
npm test

# Start MCP server
npm start

# Start API server
npm run start:api

# Seed database
npx ts-node scripts/seed-sentiment-analyzer.ts

# Check wallet balance
npx ts-node scripts/get-wallet-address.ts
```

---

## 🎬 Demo for Hackathon

### Quick Demo Script (30 seconds):

1. **Show the MCP server running:**
   ```bash
   npm start
   # Shows: 7 tools available, wallet address, ready message
   ```

2. **Show Claude Desktop integration:**
   - Open Claude Desktop
   - Say: "What AI services are available?"
   - Say: "Analyze the sentiment: This is awesome!"
   - Shows: Service discovery → Payment → Result

3. **Show the transaction:**
   - Say: "Show my transaction history"
   - Shows: Payment proof, amount, timestamp, result

### Video Recording Tips:
- Record Claude Desktop screen showing the natural language interaction
- Split screen: Claude Desktop + Terminal showing services running
- Highlight: No manual payment handling - all automatic!
- Show: Real USDC transaction on Base Sepolia block explorer

---

## 🐛 Troubleshooting

### Issue: "Service not found"
```bash
# Re-seed the database
npx ts-node scripts/seed-sentiment-analyzer.ts
```

### Issue: "Connection refused" to sentiment analyzer
```bash
# Check if service is running
curl http://localhost:3001/health

# If not, start it
cd examples/sentiment-analyzer && npm start
```

### Issue: "Insufficient funds"
```bash
# Check balance
npm run check-balance

# Get testnet USDC from faucet:
# https://faucet.quicknode.com/base/sepolia
# Your address: 0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123
```

### Issue: Claude Desktop not detecting server
1. Check config.json has absolute paths
2. Verify project is built: `npm run build`
3. Check dist/index.js exists
4. Restart Claude Desktop completely

---

## 📝 What's Left for Hackathon

### Must-Have (Critical):
- [x] Core MCP server working
- [x] Tests passing
- [x] Example service working
- [ ] **5-minute demo video** ⭐
- [ ] **Deploy to production (optional but impressive)** ⭐

### Nice-to-Have:
- [ ] Add 2-3 more example services
- [ ] Web dashboard (basic React app showing marketplace)
- [ ] Analytics/metrics endpoint
- [ ] Better error messages

### For Submission:
1. **README.md** - Already comprehensive ✅
2. **Demo Video** - Record testing in Claude Desktop
3. **Deployment** - Optional: Deploy to Cloud Run
4. **GitHub Repo** - Clean up and push

---

## 🎯 Next Steps

1. **Test Claude Desktop integration** (30 min)
   - Configure config.json
   - Test all 7 tools
   - Record screen

2. **Create demo video** (30 min)
   - Script the demo
   - Record Claude Desktop + terminal
   - Add captions

3. **Polish documentation** (15 min)
   - Update README with video
   - Add architecture diagram
   - Clean up comments

4. **Deploy (optional)** (1 hour)
   - Use /deploy-gcp command
   - Test production deployment
   - Add deployment docs

---

## 🏆 Key Differentiators

What makes AgentMarket special:

1. **Real blockchain payments** - Not simulated, actual USDC on Base
2. **x402 protocol** - HTTP-native micropayments
3. **MCP integration** - Works with Claude Desktop natively
4. **Agent-to-agent** - AI agents can discover and pay for services autonomously
5. **Production-ready** - 201 tests, proper error handling, security

---

**You're in great shape! The core functionality is done. Focus on the demo and polish!** 🚀
