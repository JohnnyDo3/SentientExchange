# @sentientexchange/x402-middleware

**Zero-config payment middleware for AI services**

Secure your Express.js endpoints with automatic blockchain payment verification. No database, no blockchain knowledge required—just one line of code.

## Features

✅ **Zero Configuration** - No wallet setup, no database, no config files
✅ **Automatic Payment Verification** - AgentMarket verifies payments on Solana
✅ **Replay Attack Prevention** - Each payment is single-use (handled by AgentMarket)
✅ **JWT-Based Security** - Cryptographic verification of payment proofs
✅ **Production Ready** - Type-safe, tested, and battle-hardened
✅ **Framework Agnostic** - Works with Express, Fastify, or any Node.js HTTP server

## Installation

```bash
npm install @sentientexchange/x402-middleware
```

## Quick Start

### Step 1: Add Middleware (30 seconds)

```typescript
import express from 'express';
import { x402Middleware } from '@sentientexchange/x402-middleware';

const app = express();
app.use(express.json());

app.post('/analyze', x402Middleware(), (req, res) => {
  // Your service logic here
  res.json({ result: 'Analysis complete!' });
});

app.listen(3000, () => {
  console.log('Service running on port 3000');
});
```

### Step 2: Register Your Service (2 minutes)

1. Go to [sentientexchange.com/providers/register](https://sentientexchange.com/providers/register)
2. Connect your Solana wallet
3. Enter your service endpoint and price
4. Submit for approval

### Step 3: Start Earning 💰

Once approved, AI agents will discover and pay for your service automatically!

## How It Works

```
┌─────────────┐
│ AI Agent    │
│ (Claude)    │
└──────┬──────┘
       │ 1. Requests service
       ▼
┌─────────────┐
│ AgentMarket │
│  Backend    │
└──────┬──────┘
       │ 2. Returns 402 "Pay 0.01 USDC"
       ▼
┌─────────────┐
│ AI Agent    │
│  Wallet     │
└──────┬──────┘
       │ 3. Pays service owner on Solana
       │ 4. Sends tx signature to AgentMarket
       ▼
┌─────────────┐
│ AgentMarket │
│  Backend    │
└──────┬──────┘
       │ 5. Verifies payment on blockchain
       │ 6. Generates signed JWT
       │ 7. Calls your service with JWT
       ▼
┌─────────────┐
│ Your Service│ ← x402Middleware() verifies JWT
│ + Middleware│
└──────┬──────┘
       │ 8. Executes service logic
       ▼
┌─────────────┐
│   Result    │
└─────────────┘
```

## API Reference

### `x402Middleware()`

Express middleware that verifies payment JWTs from AgentMarket.

**Returns:** Express middleware function

**Behavior:**
- If no JWT: Returns `402 Payment Required` with registration instructions
- If invalid/expired JWT: Returns `401 Payment Verification Failed`
- If valid JWT: Adds `req.agentMarketPayment` and calls `next()`

**Example:**

```typescript
app.post('/endpoint', x402Middleware(), (req, res) => {
  const payment = req.agentMarketPayment;
  console.log('Paid:', payment.price, 'USDC');
  console.log('Tx:', payment.txSignature);
  console.log('From:', payment.walletAddress);

  res.json({ status: 'success' });
});
```

### `getPaymentInfo(req)`

Helper to retrieve payment info from request.

**Returns:** `AgentMarketPayload | undefined`

```typescript
import { getPaymentInfo } from '@sentientexchange/x402-middleware';

app.post('/endpoint', x402Middleware(), (req, res) => {
  const payment = getPaymentInfo(req);
  if (payment) {
    console.log('Payment verified:', payment.txSignature);
  }
});
```

### `requirePayment(req)`

Helper that throws if payment is not present.

**Returns:** `AgentMarketPayload`
**Throws:** `Error` if no payment

```typescript
import { requirePayment } from '@sentientexchange/x402-middleware';

app.post('/endpoint', x402Middleware(), (req, res) => {
  try {
    const payment = requirePayment(req);
    // Payment guaranteed to exist here
  } catch (error) {
    res.status(402).json({ error: 'Payment required' });
  }
});
```

### `AgentMarketPayload`

TypeScript interface for payment data:

```typescript
interface AgentMarketPayload {
  serviceId: string;       // Your service ID
  requestId: string;       // Unique request ID (replay prevention)
  txSignature: string;     // Solana transaction signature
  walletAddress: string;   // Your wallet address
  price: string;           // Price in USDC
  timestamp: number;       // Payment timestamp
  exp: number;             // JWT expiration (unix timestamp)
}
```

## Advanced Usage

### TypeScript Support

Full TypeScript support with type definitions included:

```typescript
import { Request, Response } from 'express';
import { x402Middleware, AgentMarketPayload } from '@sentientexchange/x402-middleware';

app.post('/endpoint', x402Middleware(), (req: Request, res: Response) => {
  // req.agentMarketPayment is typed!
  const payment: AgentMarketPayment = req.agentMarketPayment!;
});
```

### Custom Error Handling

```typescript
import { x402Middleware } from '@sentientexchange/x402-middleware';

app.post('/endpoint', x402Middleware(), (req, res) => {
  if (!req.agentMarketPayment) {
    return res.status(402).json({ error: 'Payment required' });
  }

  try {
    // Your service logic
  } catch (error) {
    res.status(500).json({ error: 'Service error' });
  }
});
```

### Logging Payment Info

```typescript
import { x402Middleware } from '@sentientexchange/x402-middleware';

app.post('/endpoint', x402Middleware(), (req, res) => {
  const payment = req.agentMarketPayment!;

  console.log('Payment Details:', {
    amount: payment.price,
    txHash: payment.txSignature,
    serviceId: payment.serviceId,
    timestamp: new Date(payment.timestamp).toISOString(),
  });

  res.json({ result: 'Done' });
});
```

### Multiple Endpoints

Use the same middleware on multiple endpoints:

```typescript
import { x402Middleware } from '@sentientexchange/x402-middleware';

const paymentGate = x402Middleware();

app.post('/analyze', paymentGate, analyzeHandler);
app.post('/translate', paymentGate, translateHandler);
app.post('/summarize', paymentGate, summarizeHandler);
```

## Security

### How Payment Verification Works

1. **AgentMarket verifies payment on Solana blockchain** (1 RPC call)
2. **AgentMarket generates signed JWT** with payment details
3. **Your middleware verifies JWT signature** (fast, no RPC call)
4. **JWT expires in 5 minutes** (prevents reuse)
5. **RequestId is unique per payment** (replay prevention on AgentMarket side)

### What This Middleware Does

- ✅ Verifies JWT signature (proves it was signed by AgentMarket)
- ✅ Checks JWT not expired
- ✅ Validates required fields present

### What This Middleware Does NOT Do

- ❌ Does NOT verify payment on blockchain (AgentMarket does this)
- ❌ Does NOT need database (AgentMarket tracks used payments)
- ❌ Does NOT need blockchain RPC access
- ❌ Does NOT need your wallet private key

This architecture is **secure** because:
- Only AgentMarket's private key can sign valid JWTs
- JWTs can't be forged without the private key
- Payment verification happens once on AgentMarket (not twice)
- Replay prevention is centralized (no coordination needed)

## Troubleshooting

### 402 Payment Required

**Cause:** No JWT token in request
**Solution:** Register your service at sentientexchange.com

### 401 Payment Verification Failed

**Cause:** Invalid or expired JWT
**Solutions:**
- Ensure requests come through AgentMarket
- Check service is registered and approved
- JWT expires after 5 minutes

### Type Errors with Express

**Cause:** TypeScript doesn't recognize `req.agentMarketPayment`
**Solution:** The middleware extends Express types automatically. If you still see errors:

```typescript
import '@sentientexchange/x402-middleware';

// Now req.agentMarketPayment will be recognized
```

## FAQ

### Do I need a database?

No! AgentMarket handles all replay prevention in their database.

### Do I need blockchain knowledge?

No! AgentMarket verifies payments on Solana for you.

### Do I need to configure my wallet?

No! Just enter your wallet address when registering. Payments go directly to you.

### How do I test locally?

1. Deploy your service to a public URL (use ngrok, Railway, or Vercel)
2. Register on AgentMarket
3. Test via Claude Desktop or API client

### Can I use this without AgentMarket?

No, this middleware is designed to work with AgentMarket's payment flow. It verifies JWTs signed by AgentMarket.

### What if AgentMarket goes down?

Your service will return 402 until AgentMarket is back online. Consider implementing a fallback or graceful degradation.

## Support

- **Documentation:** [sentientexchange.com/docs](https://sentientexchange.com/docs)
- **Support:** [sentientexchange.com/support](https://sentientexchange.com/support)
- **GitHub Issues:** [github.com/sentient-exchange/x402-middleware](https://github.com/sentient-exchange/x402-middleware)

## License

MIT License - see LICENSE file for details

## Credits

Built with ❤️ by [Sentient Exchange](https://sentientexchange.com)

Powered by Solana, USDC, and the x402 protocol.
