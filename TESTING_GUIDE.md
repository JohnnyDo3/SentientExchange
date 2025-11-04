
# AgentMarket Testing Guide

## Prerequisites

1. **Solana Wallet**: Export your private key from Phantom/Solflare
2. **Devnet SOL**: Get free devnet SOL from https://faucet.solana.com
3. **Claude Desktop**: Installed and running

## Setup Steps

### 1. Build the MCP Server

```bash
npm run build
```

### 2. Configure Claude Desktop

Edit your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/claude/claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "agentmarket": {
      "command": "node",
      "args": ["C:/Users/johnn/Desktop/agentMarket-mcp/dist/index.js"],
      "env": {
        "NETWORK": "devnet",
        "DATABASE_PATH": "C:/Users/johnn/Desktop/agentMarket-mcp/data/agentmarket.db",
        "SOLANA_PRIVATE_KEY": "your-base58-private-key-here"
      }
    }
  }
}
```

**IMPORTANT**: Replace `your-base58-private-key-here` with your actual Solana private key!

**Security Note**: This private key stays on YOUR machine in Claude Desktop's config. The MCP server never sees it - only Claude does, and Claude uses it to execute payment scripts on your behalf.

### 3. Get Devnet SOL

```bash
# After adding your wallet address to the config, fund it:
# Visit https://faucet.solana.com
# Paste your wallet address
# Click "Request Airdrop"
```

### 4. Restart Claude Desktop

Close and reopen Claude Desktop to load the MCP server.

### 5. Verify Connection

In Claude Desktop, ask:

```
What MCP tools do you have available?
```

You should see:
- ✅ discover_services
- ✅ get_service_details
- ✅ purchase_service
- ✅ submit_payment
- ✅ rate_service
- ✅ list_services
- ✅ check_transaction

## Testing Scenarios

### Test 1: Service Discovery

In Claude Desktop:
```
Show me all services available on AgentMarket
```

Expected: Claude lists all registered services with details

### Test 2: Search by Capability

```
Find services that can do sentiment analysis
```

Expected: Claude finds sentiment analysis services

### Test 3: Get Service Details

```
Tell me more about the sentiment analyzer service
```

Expected: Claude shows pricing, rating, capabilities, endpoint

### Test 4: Full Purchase Flow (Autonomous Payment)

```
Use the sentiment analyzer to analyze this text: "This product is absolutely amazing! Best purchase ever!"
```

**What happens behind the scenes:**

1. Claude calls `purchase_service` tool
2. Gets 402 Payment Required response with payment details
3. **Claude autonomously executes**: `npx ts-node scripts/solana-pay.ts <recipient> <amount> <token>`
   - Uses YOUR private key from config
   - Signs transaction
   - Broadcasts to Solana
4. Gets transaction signature back
5. Claude calls `submit_payment` tool with signature
6. Server verifies on-chain
7. Server completes service request
8. Returns analysis result to you

Expected: You see the sentiment analysis result WITHOUT any manual payment steps!

### Test 5: Check Transaction History

```
Show me recent transactions on AgentMarket
```

Expected: Claude shows completed transactions with signatures

### Test 6: Rate a Service

```
I want to rate the sentiment analyzer service. Give it 5 stars with review: "Fast and accurate!"
```

Expected: Rating recorded, service reputation updated

## Web Frontend Testing

### Start the Web App

```bash
cd web
npm run dev
```

Open: http://localhost:3000

### Test Flow:

1. **Connect Wallet** - Click "Connect Wallet" → Select Phantom/Solflare
2. **Sign In** - Sign authentication message
3. **Browse Services** - See marketplace with all services
4. **Purchase Service** - Click service → Click "Purchase Service"
5. **Confirm Payment** - Review details → Click "Confirm & Pay"
6. **Wallet Signs** - Approve transaction in wallet popup
7. **Success** - See transaction signature

## Troubleshooting

### "Command not found: node"

Make sure Node.js is installed and in your PATH:
```bash
node --version  # Should show v20+
```

### "Module not found" errors

Rebuild the project:
```bash
npm install
npm run build
```

### "Transaction failed" in Claude Desktop

Check you have devnet SOL:
```bash
# If you set up the private key correctly, Claude can check for you:
"Check my Solana wallet balance"
```

Or visit https://explorer.solana.com (switch to Devnet) and paste your address.

### "Payment verification failed"

The sentiment analyzer service is still configured for Base/Ethereum. Update it to use Solana:

1. Get the service's Solana wallet address
2. Update the service endpoint to verify Solana transactions

### MCP Server not showing up in Claude Desktop

1. Check config file path is correct
2. Check JSON syntax is valid (no trailing commas!)
3. Check absolute paths are correct
4. Restart Claude Desktop
5. Check Claude Desktop logs (Help → Show Logs)

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│           Claude Desktop (MCP Client)                 │
│  - Discovers services via discover_services           │
│  - Gets payment instructions via purchase_service     │
│  - EXECUTES PAYMENT LOCALLY (your private key)       │
│  - Submits signature via submit_payment              │
└──────────────────┬───────────────────────────────────┘
                   │ stdio (MCP Protocol)
                   ↓
┌──────────────────────────────────────────────────────┐
│           AgentMarket MCP Server                      │
│  - Coordinates payment flow                          │
│  - Parses 402 responses                              │
│  - Verifies transactions on Solana                   │
│  - NEVER touches private keys                        │
└──────────────────┬───────────────────────────────────┘
                   │ HTTP x402
                   ↓
┌──────────────────────────────────────────────────────┐
│           Service Provider                            │
│  - Returns 402 Payment Required                      │
│  - Verifies transaction signature                    │
│  - Returns service result                            │
└──────────────────────────────────────────────────────┘
```

## Key Features to Demonstrate

### 1. Autonomous Payments
- Claude handles the entire payment flow
- No manual wallet interaction needed
- User just asks for a service in natural language

### 2. Solana Speed & Cost
- Transactions confirm in < 1 second
- Costs ~$0.00025 per transaction
- 40x cheaper than Base Sepolia

### 3. Client-Side Security
- Private keys never leave your machine
- Server only sees transaction signatures (public)
- No custody, no trust required

### 4. Natural Language Interface
- "Find me a cheap sentiment analyzer"
- "Use the translator service"
- "What are the most popular services?"

### 5. Full x402 Implementation
- Automatic 402 detection
- Payment instruction parsing
- On-chain verification
- Service request completion

## Demo Script for Hackathon

```
User: "What services are available?"
Claude: [Lists services from registry]

User: "Use the sentiment analyzer on this: 'Solana is amazing!'"
Claude: [Sees 402 response]
        [Executes payment script with YOUR key]
        [Submits transaction signature]
        [Returns result]

Result: "Positive sentiment (0.95 confidence)"
        Transaction: 5Zq8k3mN7Hw... (verified on-chain)
```

**This is true autonomous agent behavior - no human interaction needed for payments!**

## Next Steps

1. ✅ Test basic discovery with Claude Desktop
2. ✅ Test autonomous payment flow
3. ✅ Test web frontend purchase flow
4. 📝 Update services to verify Solana transactions
5. 📝 Add more example services
6. 📝 Record demo video for hackathon

## Support

If you encounter issues:

1. Check MCP server logs: `npm start` (stdio will show in terminal)
2. Check Claude Desktop logs: Help → Show Logs
3. Check service logs: `cat sentiment-analyzer.log`
4. Test services directly: `curl http://localhost:3001/health`

---

**You're ready to test! Start with Claude Desktop for the full autonomous agent experience.** 🚀
