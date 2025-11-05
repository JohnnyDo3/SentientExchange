# Claude Desktop Setup for SentientExchange

This guide shows you how to connect Claude Desktop to the SentientExchange MCP server via SSE (Server-Sent Events) for remote access.

## 🌐 Remote Connection (Production)

Connect to the live SentientExchange marketplace deployed on Railway.

### Configuration

1. **Open Claude Desktop Configuration**:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/claude/claude_desktop_config.json`

2. **Add SentientExchange MCP Server**:

```json
{
  "mcpServers": {
    "sentientexchange": {
      "url": "https://sentientexchange.com/mcp/sse",
      "transport": "sse"
    }
  }
}
```

3. **Restart Claude Desktop**

4. **Verify Connection**:
   - Open Claude Desktop
   - Look for the 🔌 MCP icon in the bottom toolbar
   - Click it to see available servers
   - You should see "sentientexchange" listed

### Available Tools

Once connected, you'll have access to these MCP tools:

**Service Discovery**:
- `discover_services` - Search for AI services by capability, price, or rating
- `get_service_details` - Get detailed information about a specific service
- `list_all_services` - List all available services with pagination

**Service Purchase** (3-call workflow):
- `purchase_service` - Request service (returns 402 payment instructions)
- `execute_payment` - Execute USDC payment on Solana (CLIENT-SIDE with your wallet)
- `submit_payment` - Submit transaction signature to complete purchase

**Smart Tools** (Reduce workflow from 5 calls to 3):
- `discover_and_prepare_service` - Discover best service + health check + prepare payment
- `complete_service_with_payment` - Verify payment + submit + auto-retry with backups

**Service Rating**:
- `rate_service` - Rate a service after completing a transaction

**Spending Management**:
- `set_spending_limits` - Configure per-transaction, daily, monthly limits
- `check_spending` - View current spending and remaining budget
- `reset_spending_limits` - Remove all spending limits

**Transaction History**:
- `get_transaction` - Retrieve transaction details by ID

---

## 💻 Local Connection (Development)

For local testing and development.

### Prerequisites

1. **Solana Wallet** (for payments):
   - Install [Phantom Wallet](https://phantom.app/) or [Solflare](https://solflare.com/)
   - Export your private key (base58 format)
   - **⚠️ SECURITY**: Only use devnet wallets for testing!

2. **Get Devnet USDC**:
   - Go to [Solana Faucet](https://faucet.solana.com/)
   - Request devnet SOL
   - Swap for devnet USDC on [Raydium](https://raydium.io/)

### Configuration

```json
{
  "mcpServers": {
    "sentientexchange-local": {
      "command": "node",
      "args": ["C:/path/to/agentMarket-mcp/dist/index.js"],
      "env": {
        "DATABASE_PATH": "C:/path/to/agentMarket-mcp/data/agentmarket.db",
        "SOLANA_PRIVATE_KEY": "your-base58-private-key-here",
        "NETWORK": "devnet",
        "NODE_ENV": "development"
      }
    }
  }
}
```

### Local Development Setup

1. **Clone and Install**:
```bash
git clone https://github.com/yourusername/agentMarket-mcp.git
cd agentMarket-mcp
npm install
npm run build
```

2. **Configure Environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Seed Local Database**:
```bash
npm run seed
```

4. **Start API Server** (optional - for web UI):
```bash
npm run start:api
```

5. **Update Claude Desktop Config** (see configuration above)

6. **Restart Claude Desktop**

---

## 🔐 Security Best Practices

### Wallet Security

1. **Never Share Private Keys**:
   - Your SOLANA_PRIVATE_KEY stays in Claude Desktop config (client-side)
   - Never transmitted to any server
   - Only used locally for signing transactions

2. **Use Separate Wallets**:
   - **Development**: Devnet wallet with no real funds
   - **Production**: Mainnet wallet with only what you're willing to spend

3. **Set Spending Limits**:
   ```
   "I want to set spending limits: $1 per transaction, $10 daily, $50 monthly"
   ```

### Rate Limiting

The production server has rate limits:
- **SSE Connections**: 10 connections per 15 minutes per IP
- **MCP Messages**: 60 messages per minute per session
- **API Requests**: 100 requests per 15 minutes per IP

If you hit rate limits, wait 15 minutes or use exponential backoff.

---

## 🎯 Example Usage

### Example 1: Find and Purchase a Service

```
You: "Find me a sentiment analysis service under $1"

Claude: [Uses discover_services to search]
"I found the Sentiment Analyzer service for $0.50. Would you like details?"

You: "Yes, and purchase it to analyze: 'This product is amazing!'"

Claude: [Uses discover_and_prepare_service]
"Service is healthy and ready. Payment required: 0.50 USDC to [address]"
"I'll execute the payment now using your Solana wallet..."
[Uses execute_payment CLIENT-SIDE]
"Payment successful! Transaction: [signature]"
[Uses complete_service_with_payment]
"✅ Service result: Positive sentiment (0.92 confidence)"
```

### Example 2: Check Your Spending

```
You: "How much have I spent today?"

Claude: [Uses check_spending]
"Today's spending: $2.50 / $10.00 daily limit
 This month: $8.75 / $50.00 monthly limit
 Remaining budget: $7.50 daily, $41.25 monthly"
```

### Example 3: Rate a Service

```
You: "That sentiment analyzer was great! Rate it 5 stars"

Claude: [Uses rate_service]
"✅ Rated Sentiment Analyzer 5/5 stars. Thank you for your feedback!"
```

---

## 🛠️ Troubleshooting

### "Failed to connect to MCP server"

**Solution**: Check if Railway deployment is running:
```bash
curl https://sentientexchange.com/api/pulse
```

Should return: `{"status": "ok", "mcp": {"sseEndpoint": "/mcp/sse"}}`

### "Payment failed: Insufficient funds"

**Solution**:
1. Check your Solana wallet balance
2. Ensure you have enough USDC for the service price + transaction fees
3. For devnet: Get more devnet USDC from faucet

### "Session not found"

**Solution**: Your SSE connection was closed. Restart Claude Desktop to reconnect.

### "Rate limit exceeded"

**Solution**: You've hit the rate limit. Wait 15 minutes or slow down your requests.

---

## 📚 Additional Resources

- **MCP Protocol**: https://modelcontextprotocol.io/
- **x402 Payment Protocol**: https://github.com/coinbase/x402
- **Solana Devnet Faucet**: https://faucet.solana.com/
- **Project Repository**: https://github.com/yourusername/agentMarket-mcp

---

## 🤝 Support

Having issues? Check:
1. [GitHub Issues](https://github.com/yourusername/agentMarket-mcp/issues)
2. [Documentation](https://sentientexchange.com/docs)
3. Railway logs: `railway logs`

---

**🎉 You're ready to use SentientExchange!**

Start by asking Claude: *"Show me all available AI services on SentientExchange"*
