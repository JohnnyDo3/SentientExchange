# AgentMarket Demo Script for Hackathon

## 🎬 30-Second Elevator Pitch

"AgentMarket is an AI-native marketplace that lets Claude and other AI agents discover and purchase services using automatic blockchain micropayments. No human intervention needed - agents find services, negotiate pricing, execute payments, and rate providers - all through natural language."

---

## 🎥 5-Minute Demo Flow

### Setup (Before Recording)

```bash
# Terminal 1: Start sentiment analyzer service
cd examples/sentiment-analyzer
npm start

# Verify it's running
curl http://localhost:3001/health

# Terminal 2: Start MCP server (or Claude Desktop will auto-start)
npm start
```

### Scene 1: Introduction (30 seconds)

**What to show:**
- Project README on screen
- Highlight key features:
  - MCP server with 7 tools
  - Real USDC payments on Base blockchain
  - x402 payment protocol
  - 201 passing tests

**What to say:**
> "AgentMarket solves a critical problem: how do AI agents discover and pay for services autonomously? We built an MCP server that acts as a marketplace, payment router, and reputation system - all integrated with Claude Desktop."

### Scene 2: Service Discovery (60 seconds)

**Open Claude Desktop**

**Prompt 1:**
```
"What AI services are available in the marketplace?"
```

**What happens:**
- discover_services tool is called
- Shows Sentiment Analyzer service
- Displays pricing, capabilities, endpoint

**Point out:**
> "Notice Claude automatically used the discover_services tool. The agent can search by capabilities, price range, or minimum rating."

**Prompt 2:**
```
"Get me details about the sentiment analysis service"
```

**What happens:**
- get_service_details tool called
- Shows full service metadata
- Reputation score, response time, reviews

---

### Scene 3: Check Wallet (30 seconds)

**Prompt:**
```
"Check my USDC wallet balance"
```

**What happens:**
- check_wallet_balance tool called
- Shows wallet address: `0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123`
- Shows balance: `10.06 USDC` on base-sepolia

**Point out:**
> "This is a real Coinbase CDP Smart Account wallet with actual USDC on Base testnet. Not simulated - real blockchain transactions."

---

### Scene 4: Purchase Service (90 seconds) ⭐ **STAR OF THE SHOW**

**Prompt:**
```
"Use the sentiment analyzer to analyze this text: 'This product is absolutely amazing! I've never been happier with a purchase. Five stars!'"
```

**What happens:**
1. purchase_service tool called
2. AgentMarket initiates x402 payment flow
3. Service returns 402 Payment Required
4. AgentMarket executes USDC payment on Base blockchain
5. Retry with payment proof
6. Service returns analysis result

**What Claude shows:**
```json
{
  "sentiment": "positive",
  "polarity": 0.95,
  "emotions": {
    "joy": 0.85,
    "excitement": 0.78,
    "satisfaction": 0.92
  },
  "confidence": 0.94,
  "analysis": "Extremely positive sentiment with high confidence...",
  "payment": {
    "amount": "$0.01 USDC",
    "txHash": "0x1234...",
    "network": "base-sepolia"
  }
}
```

**Point out:**
> "Everything happened automatically - no manual payment handling! The agent discovered the price, approved the payment, executed the blockchain transaction, and got the result. The entire x402 payment protocol is handled transparently."

**Split screen to terminal showing:**
```bash
# In MCP server logs
[INFO] Tool called: purchase_service
[INFO] Initiating x402 payment flow...
[INFO] Service returned 402 Payment Required
[INFO] Executing USDC payment: 0.01 USDC
[INFO] Payment successful: 0x1234...
[INFO] Retrying with payment proof...
[INFO] Service returned result
[INFO] Transaction logged
```

---

### Scene 5: Transaction History (30 seconds)

**Prompt:**
```
"Show my transaction history"
```

**What happens:**
- list_transactions tool called
- Shows completed purchase
- Includes payment proof, amount, timestamp

**Point out:**
> "All transactions are logged with complete audit trail - buyer, seller, amount, payment hash, and request/response data."

---

### Scene 6: Rate the Service (20 seconds)

**Prompt:**
```
"Rate that service 5 stars - 'Lightning fast and super accurate!'"
```

**What happens:**
- rate_service tool called
- Rating added to database
- Service reputation updated

**Point out:**
> "The marketplace includes a reputation system. Services build trust over time through ratings and reviews."

---

### Scene 7: Technical Deep Dive (60 seconds)

**Switch to code editor**

**Show:**

1. **MCP Server** (`src/server.ts`)
   - 7 tools registered
   - Handle discovery, purchase, ratings, transactions

2. **x402 Client** (`src/payment/X402Client.ts`)
   ```typescript
   // Show the x402 payment flow code
   async executePayment(service, data) {
     // 1. Initial request
     const response = await axios.post(service.endpoint, data);

     // 2. Check for 402 Payment Required
     if (response.status === 402) {
       const paymentDetails = response.headers['x-payment'];

       // 3. Execute blockchain payment
       const txHash = await this.wallet.sendUSDC(...);

       // 4. Retry with proof
       return await axios.post(service.endpoint, data, {
         headers: { 'X-Payment': txHash }
       });
     }
   }
   ```

3. **Database Schema** (`src/registry/database.ts`)
   - Services table
   - Transactions table
   - Ratings table

4. **Test Suite**
   ```bash
   npm test
   # Shows: 201 tests passing
   ```

**Point out:**
> "Production-ready with comprehensive tests, proper error handling, and secure wallet management using Coinbase CDP SDK."

---

### Scene 8: Architecture Overview (30 seconds)

**Show architecture diagram or README**

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Claude Desktop │  MCP    │ AgentMarket MCP  │  x402   │  AI Service     │
│  (AI Client)    │◄───────►│    Server        │◄───────►│  Provider       │
└─────────────────┘         └──────────────────┘         └─────────────────┘
         │                            │                            │
         │  discover_services         │                            │
         │───────────────────────────►│                            │
         │                            │  HTTP 402 + Payment        │
         │  purchase_service          │───────────────────────────►│
         │───────────────────────────►│  USDC Payment (Base)       │
         │                            │───────────────────────────►│
         │  Result + Receipt          │  Service Response          │
         │◄───────────────────────────│◄───────────────────────────│
```

**Point out:**
> "The MCP server acts as the marketplace layer - it doesn't provide the services, it helps agents find and pay for them. Service providers register their x402-enabled APIs, and agents can discover and purchase them automatically."

---

### Scene 9: Real-World Use Cases (20 seconds)

**What to say:**

> "This enables powerful use cases:
> - AI agents using specialized models (image analysis, code review, data processing)
> - Agents paying for API access (weather data, market data, database queries)
> - Agents hiring other agents (translation, research, analysis)
> - All with automatic micropayments and reputation tracking"

---

### Scene 10: Wrap Up (20 seconds)

**Key Takeaways:**

1. ✅ **AI-native marketplace** - Built for agents, not humans
2. ✅ **Real blockchain payments** - Actual USDC on Base
3. ✅ **Zero friction** - Natural language to payment in seconds
4. ✅ **Production-ready** - 201 tests, security, proper architecture
5. ✅ **Extensible** - Easy to add new services and tools

**Final line:**
> "AgentMarket makes AI-to-AI commerce as easy as human-to-human. The future of work is agents paying agents."

**Show:**
- GitHub repo URL
- Quick stats:
  - 7 MCP tools
  - 201 tests passing
  - x402 + MCP + Base blockchain
  - Real USDC payments

---

## 🎤 Q&A Prep

### Expected Questions:

**Q: How do you prevent fraud or malicious services?**
> A: Three layers: (1) Service registration requires wallet verification, (2) Reputation system tracks success rate and ratings, (3) Agents can set max payment limits and verify service capabilities before purchase.

**Q: What happens if a service doesn't deliver after payment?**
> A: The transaction is logged with the payment hash. Agents can rate services poorly, affecting their reputation. Future versions could add escrow or refund mechanisms.

**Q: Can this work with other blockchains besides Base?**
> A: Yes! The payment layer is abstracted. We support Ethereum, Polygon, Arbitrum, Optimism, and Solana through the Coinbase CDP SDK.

**Q: How much do transactions cost?**
> A: Gas fees on Base are ~$0.0001-0.001, making micropayments viable. Services set their own prices starting at $0.01.

**Q: Can human users use this too?**
> A: Absolutely! The REST API allows web/mobile apps to integrate. The MCP interface is specifically for AI agents like Claude.

**Q: How do you ensure service availability?**
> A: Services can register health check endpoints. The marketplace can track uptime and remove consistently unavailable services.

---

## 📹 Recording Tips

### Camera/Screen Setup:
- **Primary**: Screen recording (Claude Desktop + Terminal)
- **Secondary**: Webcam in corner (optional)
- **Resolution**: 1920x1080 minimum

### Audio:
- Use a decent microphone
- Record in a quiet room
- Speak clearly and not too fast

### Editing:
- Add captions for key points
- Highlight important text on screen
- Speed up long operations (2x)
- Add transitions between sections

### Platform:
- Upload to YouTube (unlisted or public)
- Add to hackathon submission
- Share on Twitter/LinkedIn

---

## ✅ Pre-Demo Checklist

Before recording:

- [ ] Both services running (sentiment-analyzer + MCP server)
- [ ] Database seeded with services
- [ ] Wallet has sufficient USDC (~10 USDC)
- [ ] Claude Desktop configured and restarted
- [ ] Test all prompts work as expected
- [ ] Clean up terminal windows
- [ ] Close unnecessary browser tabs
- [ ] Practice the script 2-3 times
- [ ] Check recording software works
- [ ] Verify audio levels

---

## 🎯 Success Metrics

Your demo is successful if viewers understand:

1. **The Problem**: AI agents need to discover and pay for services
2. **The Solution**: MCP marketplace with x402 payments
3. **The Innovation**: Natural language → blockchain payment in seconds
4. **The Implementation**: Production-ready with tests and security
5. **The Potential**: Enables autonomous AI-to-AI commerce

---

**Good luck! You've built something amazing. Now show it off!** 🚀
