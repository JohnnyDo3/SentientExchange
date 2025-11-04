# AgentMarket MCP - Architecture Documentation

This document provides a comprehensive technical overview of AgentMarket's architecture, design decisions, and implementation details.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Core Components](#core-components)
4. [Data Layer](#data-layer)
5. [Payment Protocol (x402)](#payment-protocol-x402)
6. [Authentication Flow](#authentication-flow)
7. [MCP Integration](#mcp-integration)
8. [API Architecture](#api-architecture)
9. [Security Architecture](#security-architecture)
10. [Technology Stack](#technology-stack)
11. [Design Decisions](#design-decisions)
12. [Scalability](#scalability)
13. [Future Enhancements](#future-enhancements)

---

## Executive Summary

AgentMarket is an AI-native service marketplace that enables autonomous AI agents to discover, purchase, and provide services using blockchain micropayments. The system consists of two primary interfaces:

1. **MCP Server** - Exposes tools to AI clients (like Claude Desktop) via stdio transport
2. **REST API Server** - Provides HTTP/WebSocket interface for web/mobile applications

Both interfaces share a common backend consisting of:
- **Service Registry** - In-memory cached SQLite database
- **Payment Layer** - x402 protocol handler with CDP wallet integration
- **Security Layer** - SIWE authentication + JWT tokens + rate limiting

The architecture is designed for:
- **Simplicity** - Minimal dependencies, straightforward data flows
- **Performance** - In-memory caching, efficient database queries
- **Security** - Wallet-based auth, input validation, rate limiting
- **Extensibility** - Plugin-based tools, modular design

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
├────────────────────────────┬────────────────────────────────────┤
│   Claude Desktop (MCP)     │   Web Browser / Mobile App         │
│   - stdio transport        │   - HTTP/WebSocket                 │
│   - 7 MCP tools            │   - REST API + Socket.IO           │
└────────────┬───────────────┴─────────────────┬──────────────────┘
             │                                 │
             │                                 │
┌────────────▼─────────────────────────────────▼──────────────────┐
│                      Application Layer                           │
├─────────────────────┬────────────────────────────────────────────┤
│   MCP Server        │   REST API Server                          │
│   (src/server.ts)   │   (src/api/apiServer.ts)                   │
│                     │                                            │
│   Tools:            │   Endpoints:                               │
│   - discover        │   - GET  /api/services                     │
│   - details         │   - POST /api/services/search              │
│   - purchase        │   - POST /api/auth/verify                  │
│   - rate            │   - GET  /api/stats                        │
│   - balance         │   - WS   socket.io events                  │
│   - transactions    │                                            │
│   - list            │                                            │
└─────────────────────┴─────────────┬──────────────────────────────┘
                                    │
┌───────────────────────────────────▼──────────────────────────────┐
│                      Business Logic Layer                        │
├──────────────────────┬───────────────────┬───────────────────────┤
│  Service Registry    │  Payment Layer    │  Auth Layer           │
│  (registry/)         │  (payment/)       │  (auth/)              │
│                      │                   │                       │
│  - ServiceRegistry   │  - WalletManager  │  - SIWE               │
│  - Database          │  - X402Client     │  - JWT                │
│  - In-memory cache   │  - Transaction    │  - Middleware         │
└──────────────┬───────┴─────┬─────────────┴─────┬─────────────────┘
               │             │                   │
┌──────────────▼─────────────▼───────────────────▼─────────────────┐
│                        Data Layer                                │
├──────────────────────────────────────────────────────────────────┤
│  SQLite Database (data/agentmarket.db)                           │
│  - services table (13 columns, indexed)                          │
│  - transactions table (payment history)                          │
│  - ratings table (reviews and scores)                            │
│  - audit_log table (change tracking)                             │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                     External Services                            │
├───────────────────────┬──────────────────────────────────────────┤
│  Coinbase CDP         │  External x402 Services                  │
│  - Wallet management  │  - AI services (image, text, etc.)       │
│  - USDC transfers     │  - HTTP 402 payment protocol             │
│  - Base blockchain    │  - Service-specific endpoints            │
└───────────────────────┴──────────────────────────────────────────┘
```

### Request Flow Examples

#### Example 1: Service Discovery via MCP

```
1. User: "Show me image analysis services"
2. Claude Desktop → MCP Server (stdio)
3. Tool: discover_services({ capabilities: ["image-analysis"] })
4. ServiceRegistry.searchServices()
5. In-memory cache hit / SQLite query
6. Return: List of matching services
7. Claude Desktop displays results to user
```

#### Example 2: Service Purchase with Payment

```
1. User: "Purchase sentiment analyzer to analyze: 'Great product!'"
2. Claude Desktop → MCP Server
3. Tool: purchase_service({ serviceId, requestData })
4. ServiceRegistry.getService(serviceId) → Get pricing
5. WalletManager.getBalance() → Check funds
6. X402Client.executeRequest():
   a. HTTP GET http://service.com/analyze → 402 Payment Required
   b. Parse payment details from response
   c. WalletManager.transfer(USDC, amount, recipient)
   d. Wait for blockchain confirmation
   e. HTTP GET with X-Payment header (transaction hash)
   f. Service validates payment → 200 OK with results
7. Database.logTransaction(transaction)
8. Return: Service results + payment receipt
9. Claude Desktop displays results to user
```

#### Example 3: Service Registration via API

```
1. User (Web UI): Fill service registration form
2. Browser → POST /api/services (with auth token)
3. JWT Middleware: Verify token
4. Input Validation: Zod schema validation
5. Rate Limiter: Check request limits
6. ServiceRegistry.registerService(data, creator)
7. Database.insertService()
8. In-memory cache update
9. Socket.IO: Broadcast 'new-service' event
10. Response: 201 Created with service data
11. All connected clients receive real-time update
```

---

## Core Components

### 1. MCP Server (src/server.ts)

**Purpose:** Expose AgentMarket functionality as MCP tools for AI clients.

**Implementation:**
```typescript
export class AgentMarketServer {
  private server: Server;
  private registry: ServiceRegistry;
  private walletManager: WalletManager;
  private x402Client: X402Client;

  async initialize() {
    // 1. Initialize database and registry
    // 2. Create wallet manager (CDP)
    // 3. Create x402 payment client
    // 4. Register MCP tools
  }

  async handleToolCall(name: string, params: any) {
    switch (name) {
      case 'discover_services': return await discoverServices(params);
      case 'purchase_service': return await purchaseService(params);
      // ... other tools
    }
  }
}
```

**Key Features:**
- stdio transport for Claude Desktop integration
- 7 tools for complete marketplace functionality
- Automatic payment handling
- Transaction logging
- Error handling with user-friendly messages

**Tool List:**
1. `discover_services` - Search with filters
2. `get_service_details` - Get full service info
3. `purchase_service` - Buy and execute service
4. `rate_service` - Submit ratings
5. `wallet_balance` - Check USDC balance
6. `list_transactions` - View payment history
7. `list_services` - Browse all services

### 2. REST API Server (src/api/apiServer.ts)

**Purpose:** Provide HTTP/WebSocket interface for web and mobile applications.

**Implementation:**
```typescript
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer);

// Middleware stack
app.use(helmetConfig);           // Security headers
app.use(requestId);              // Request tracking
app.use(cors(corsOptions));      // CORS configuration
app.use(apiLimiter);             // Rate limiting
app.use(sanitizeRequest);        // Input sanitization

// Authentication endpoints
POST /api/auth/nonce             // Get nonce for SIWE
POST /api/auth/verify            // Verify signature → JWT
GET  /api/auth/me                // Get current user
POST /api/auth/logout            // Logout

// Service endpoints
GET    /api/services             // List all services
GET    /api/services/:id         // Get service details
POST   /api/services             // Create service (auth required)
PUT    /api/services/:id         // Update service (owner only)
DELETE /api/services/:id         // Delete service (owner only)
POST   /api/services/search      // Advanced search

// Other endpoints
POST   /api/services/:id/rate    // Rate service
GET    /api/stats                // Marketplace stats
GET    /api/transactions/recent  // Recent transactions
GET    /api/services/:id/audit   // Audit history

// WebSocket events
io.on('connection') → emit('initial-stats')
io.emit('new-service', service)
io.emit('service-updated', service)
io.emit('service-deleted', { id })
io.emit('new-transaction', tx)
```

**Security Layers:**
1. **Helmet** - OWASP security headers
2. **CORS** - Configurable origin policies
3. **Rate Limiting** - Per-IP request limits
4. **Input Sanitization** - XSS prevention
5. **JWT Authentication** - Secure sessions
6. **Ownership Verification** - CRUD authorization

### 3. Service Registry (src/registry/ServiceRegistry.ts)

**Purpose:** Manage service listings with caching and persistence.

**Architecture:**
```typescript
export class ServiceRegistry {
  private db: Database;
  private serviceCache: Map<string, RegisteredService> = new Map();

  async initialize() {
    // 1. Load all services from database
    // 2. Populate in-memory cache
    // 3. Create indexes for performance
  }

  // Cache-first reads
  getService(id: string): RegisteredService | undefined {
    return this.serviceCache.get(id);
  }

  getAllServices(): RegisteredService[] {
    return Array.from(this.serviceCache.values());
  }

  // Write-through cache
  async registerService(data, creator): Promise<RegisteredService> {
    const service = await this.db.insertService(data, creator);
    this.serviceCache.set(service.id, service);
    return service;
  }

  // Advanced search with filters
  async searchServices(query: SearchQuery): Promise<RegisteredService[]> {
    let results = this.getAllServices();

    // Filter by capabilities (tags)
    if (query.capabilities) {
      results = results.filter(s =>
        query.capabilities!.some(cap =>
          s.capabilities.includes(cap)
        )
      );
    }

    // Filter by price
    if (query.maxPrice) {
      results = results.filter(s =>
        parsePrice(s.pricing.perRequest) <= query.maxPrice!
      );
    }

    // Filter by rating
    if (query.minRating) {
      results = results.filter(s =>
        s.reputation.rating >= query.minRating!
      );
    }

    // Sort results
    results.sort((a, b) => sortFunction(a, b, query.sortBy));

    return results;
  }
}
```

**Caching Strategy:**
- **In-memory Map** - All services cached for fast reads
- **Write-through** - Updates hit both cache and database
- **Lazy loading** - Cache populated on startup
- **No TTL** - Services remain cached until updated/deleted

**Benefits:**
- O(1) lookups by ID
- O(n) full-text search (acceptable for small datasets)
- No external cache dependency (Redis, Memcached)
- Simple consistency model

### 4. Database (src/registry/database.ts)

**Purpose:** SQLite persistence layer with promisified API.

**Schema:**

```sql
-- Services table
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  capabilities TEXT NOT NULL,           -- JSON array
  pricing TEXT NOT NULL,                 -- JSON object
  reputation TEXT NOT NULL,              -- JSON object
  metadata TEXT,                         -- JSON object
  created_by TEXT,                       -- Wallet address
  updated_by TEXT,                       -- Wallet address
  deleted_at TEXT,                       -- Soft delete timestamp
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_services_capabilities ON services(capabilities);
CREATE INDEX idx_services_deleted_at ON services(deleted_at);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  serviceId TEXT NOT NULL,
  clientAddress TEXT NOT NULL,
  providerAddress TEXT NOT NULL,
  amount TEXT NOT NULL,                  -- e.g., "$0.05"
  currency TEXT NOT NULL,                -- e.g., "USDC"
  txHash TEXT NOT NULL,                  -- Blockchain transaction hash
  status TEXT NOT NULL,                  -- pending, completed, failed
  requestData TEXT,                      -- JSON request
  responseData TEXT,                     -- JSON response
  timestamp TEXT NOT NULL,
  FOREIGN KEY (serviceId) REFERENCES services(id)
);

CREATE INDEX idx_transactions_serviceId ON transactions(serviceId);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  transactionId TEXT NOT NULL,
  serviceId TEXT NOT NULL,
  rater TEXT NOT NULL,                   -- User identifier
  score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
  review TEXT,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (transactionId) REFERENCES transactions(id),
  FOREIGN KEY (serviceId) REFERENCES services(id)
);

CREATE INDEX idx_ratings_serviceId ON ratings(serviceId);
CREATE INDEX idx_ratings_score ON ratings(score);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,             -- 'service', 'transaction', etc.
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,                  -- 'created', 'updated', 'deleted'
  changes TEXT,                          -- JSON diff
  performed_by TEXT,                     -- Wallet address
  timestamp TEXT NOT NULL
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
```

**Features:**
- **Promisified API** - async/await support
- **Prepared statements** - SQL injection prevention
- **Foreign keys** - Data integrity
- **Indexes** - Query performance
- **Audit logging** - Complete change history
- **Soft deletes** - Recoverable deletions

### 5. Payment Layer

#### WalletManager (src/payment/WalletManager.ts)

**Purpose:** Manage CDP Smart Account wallets for USDC payments.

**Implementation:**
```typescript
export class WalletManager {
  private coinbase: Coinbase;
  private wallet?: Wallet;
  private address?: string;

  async initialize() {
    // 1. Initialize CDP SDK
    this.coinbase = Coinbase.configureFromJson({
      filePath: process.env.CDP_API_KEY_PATH
    });

    // 2. Load or create wallet
    const wallets = await this.coinbase.listWallets();
    if (wallets.length > 0) {
      this.wallet = wallets[0];
    } else {
      this.wallet = await this.coinbase.createWallet({
        networkId: process.env.NETWORK || 'base-sepolia'
      });
    }

    // 3. Get wallet address
    this.address = await this.wallet.getDefaultAddress();
  }

  async getBalance(currency: 'usdc' | 'eth'): Promise<string> {
    const balance = await this.wallet!.getBalance(currency);
    return balance.toString();
  }

  async transfer(
    currency: 'usdc',
    amount: string,
    destination: string
  ): Promise<string> {
    const transfer = await this.wallet!.createTransfer({
      amount,
      assetId: currency,
      destination
    });

    await transfer.wait();
    return transfer.getTransactionHash()!;
  }
}
```

**Key Features:**
- **Smart Accounts** - No private key management
- **Multi-network** - Supports 7 blockchains
- **Gas abstraction** - CDP handles gas fees
- **Transaction tracking** - Wait for confirmations

#### X402Client (src/payment/X402Client.ts)

**Purpose:** Handle HTTP 402 payment protocol for AI services.

**Protocol Flow:**
```
┌─────────┐                ┌─────────┐                ┌─────────┐
│ Client  │                │ x402    │                │ Wallet  │
│         │                │ Service │                │ Manager │
└────┬────┘                └────┬────┘                └────┬────┘
     │                          │                          │
     │ 1. GET /service          │                          │
     │─────────────────────────►│                          │
     │                          │                          │
     │ 2. 402 Payment Required  │                          │
     │◄─────────────────────────│                          │
     │ X-Payment-Required: USDC │                          │
     │ X-Payment-Amount: 0.05   │                          │
     │ X-Payment-Address: 0x... │                          │
     │                          │                          │
     │ 3. Initiate payment      │                          │
     │───────────────────────────────────────────────────►│
     │                          │                          │
     │ 4. Transfer USDC         │                          │
     │◄───────────────────────────────────────────────────│
     │ txHash: 0xabc123...      │                          │
     │                          │                          │
     │ 5. GET /service          │                          │
     │ X-Payment: 0xabc123...   │                          │
     │─────────────────────────►│                          │
     │                          │                          │
     │                          │ 6. Verify on-chain       │
     │                          │─────────►┌──────────┐    │
     │                          │          │Blockchain│    │
     │                          │◄─────────│  (Base)  │    │
     │                          │          └──────────┘    │
     │                          │                          │
     │ 7. 200 OK with data      │                          │
     │◄─────────────────────────│                          │
     │ { result: "..." }        │                          │
     │                          │                          │
```

**Implementation:**
```typescript
export class X402Client {
  constructor(
    private walletManager: WalletManager
  ) {}

  async executeRequest(
    endpoint: string,
    requestData: any,
    maxPrice: string
  ): Promise<any> {
    // Step 1: Initial request
    const response1 = await axios.post(endpoint, requestData);

    // Step 2: Check for 402
    if (response1.status === 402) {
      const paymentDetails = this.parsePaymentHeaders(response1.headers);

      // Step 3: Verify price is acceptable
      if (parseFloat(paymentDetails.amount) > parseFloat(maxPrice)) {
        throw new Error('Price exceeds maximum');
      }

      // Step 4: Execute payment
      const txHash = await this.walletManager.transfer(
        'usdc',
        paymentDetails.amount,
        paymentDetails.address
      );

      // Step 5: Retry with payment proof
      const response2 = await axios.post(endpoint, requestData, {
        headers: {
          'X-Payment': txHash,
          'X-Payment-Network': process.env.NETWORK
        }
      });

      // Step 6: Return service response
      return response2.data;
    }

    // No payment required
    return response1.data;
  }
}
```

**Error Handling:**
- Invalid payment address → Abort
- Insufficient funds → User-friendly error
- Transaction timeout → Retry logic
- Service validation failure → Refund (future)

---

## Data Layer

### Database Design Philosophy

**Principles:**
1. **Simplicity** - SQLite for zero-config persistence
2. **Performance** - In-memory cache for reads
3. **Integrity** - Foreign keys and constraints
4. **Auditability** - Complete change tracking
5. **Recoverability** - Soft deletes

### Caching Strategy

```
Read Path:
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  In-Memory Map  │◄──── O(1) lookup
└──────┬──────────┘
       │ Cache miss (rare)
       ▼
┌─────────────────┐
│  SQLite Query   │◄──── Indexed query
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Update Cache   │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│    Response     │
└─────────────────┘

Write Path:
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Validate Input │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  SQLite Insert  │◄──── Transaction
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Update Cache   │◄──── Write-through
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Broadcast Event │◄──── Socket.IO
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│    Response     │
└─────────────────┘
```

### Data Consistency

**Consistency Model: Strong**

- All writes go to SQLite first (source of truth)
- Cache updated immediately after successful write
- No eventual consistency - cache always matches DB

**Concurrency Control:**

- SQLite handles concurrent reads (no locking)
- Writes are serialized by SQLite
- No distributed transactions needed (single node)

**Cache Invalidation:**

- No TTL (services don't expire)
- Explicit invalidation on updates/deletes
- Full cache reload on server restart

---

## Payment Protocol (x402)

### Protocol Specification

x402 extends HTTP with a new status code: **402 Payment Required**.

**Response Headers:**
```
HTTP/1.1 402 Payment Required
X-Payment-Required: USDC
X-Payment-Amount: 0.05
X-Payment-Address: 0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5
X-Payment-Network: base-sepolia
X-Payment-Currency: USDC
```

**Payment Request Headers:**
```
POST /service HTTP/1.1
X-Payment: 0xabc123...def456           # Transaction hash
X-Payment-Network: base-sepolia
```

### Payment Verification

**Service-side verification:**
```typescript
// 1. Extract transaction hash from header
const txHash = req.headers['x-payment'];
const network = req.headers['x-payment-network'];

// 2. Query blockchain
const tx = await blockchain.getTransaction(txHash, network);

// 3. Verify transaction details
if (tx.to !== SERVICE_WALLET_ADDRESS) {
  return res.status(402).json({ error: 'Invalid payment address' });
}

if (parseFloat(tx.amount) < REQUIRED_AMOUNT) {
  return res.status(402).json({ error: 'Insufficient payment' });
}

if (tx.confirmations < REQUIRED_CONFIRMATIONS) {
  return res.status(402).json({ error: 'Payment not confirmed' });
}

// 4. Check for double-spend
if (await db.hasTransactionBeenUsed(txHash)) {
  return res.status(402).json({ error: 'Payment already used' });
}

// 5. Mark transaction as used
await db.markTransactionUsed(txHash);

// 6. Process request
return res.status(200).json({ result: processRequest(req.body) });
```

### Security Considerations

**Attack Vectors:**

1. **Replay attacks** - Reusing same transaction
   - **Mitigation:** Track used transactions in database

2. **Underpayment** - Sending less than required
   - **Mitigation:** Verify amount on-chain

3. **Wrong recipient** - Sending to wrong address
   - **Mitigation:** Verify recipient address

4. **Unconfirmed transactions** - 0-conf attacks
   - **Mitigation:** Require N confirmations (Base: 1-2 blocks)

5. **Different network** - Testnet vs mainnet confusion
   - **Mitigation:** Verify network matches expectation

---

## Authentication Flow

### SIWE (Sign-In with Ethereum)

**Protocol: EIP-4361**

**Flow:**
```
┌────────┐                    ┌────────┐                    ┌────────┐
│Browser │                    │  API   │                    │ Wallet │
└───┬────┘                    └───┬────┘                    └───┬────┘
    │                             │                             │
    │ 1. Request nonce            │                             │
    │────────────────────────────►│                             │
    │                             │                             │
    │ 2. Generate nonce           │                             │
    │◄────────────────────────────│                             │
    │ nonce: "abc123xyz"          │                             │
    │                             │                             │
    │ 3. Create SIWE message      │                             │
    │─────────────────────────────────────────────────────────►│
    │ "agentmarket.xyz wants you  │                             │
    │  to sign in with Ethereum"  │                             │
    │                             │                             │
    │ 4. Sign message             │                             │
    │◄─────────────────────────────────────────────────────────│
    │ signature: "0xdef456..."    │                             │
    │                             │                             │
    │ 5. Submit signature         │                             │
    │────────────────────────────►│                             │
    │                             │                             │
    │                             │ 6. Verify signature         │
    │                             │ - Check nonce is valid      │
    │                             │ - Verify signature matches  │
    │                             │ - Check not expired         │
    │                             │                             │
    │ 7. Return JWT token         │                             │
    │◄────────────────────────────│                             │
    │ token: "eyJhbGc..."         │                             │
    │                             │                             │
    │ 8. Use token for requests   │                             │
    │ Authorization: Bearer ...   │                             │
    │────────────────────────────►│                             │
    │                             │                             │
```

### JWT Token Structure

**Payload:**
```json
{
  "address": "0x742d35cc6634c0532925a3b844bc9e7595beb5e5",
  "chainId": 84532,
  "iat": 1699123456,
  "exp": 1699728256
}
```

**Expiry:** 7 days

**Validation:**
```typescript
export function requireAuth(req, res, next) {
  // 1. Extract token from header
  const authHeader = req.headers['authorization'];
  const token = extractToken(authHeader);

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // 2. Verify and decode token
    const decoded = verifyToken(token);

    // 3. Attach user to request
    req.user = {
      address: decoded.address,
      chainId: decoded.chainId
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

---

## MCP Integration

### Protocol Overview

**Model Context Protocol (MCP)** is a standard for AI assistants to access tools and resources.

**Transport:** stdio (standard input/output)

**Message Format:** JSON-RPC 2.0

### Tool Registration

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'discover_services',
        description: 'Search for AI services by capabilities, price, or rating',
        inputSchema: {
          type: 'object',
          properties: {
            capabilities: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by capability tags'
            },
            maxPrice: {
              type: 'string',
              description: 'Maximum price per request (e.g., "0.10")'
            },
            minRating: {
              type: 'number',
              description: 'Minimum rating (1-5)'
            }
          }
        }
      },
      // ... more tools
    ]
  };
});
```

### Tool Execution

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: params } = request.params;

  try {
    switch (name) {
      case 'discover_services':
        return await discoverServices(params, this.registry);

      case 'purchase_service':
        return await purchaseService(
          params,
          this.walletManager,
          this.x402Client,
          this.registry
        );

      // ... other tools
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: error.message })
      }],
      isError: true
    };
  }
});
```

### Error Handling

**User-friendly errors:**
```typescript
// Instead of:
throw new Error('ECONNREFUSED 127.0.0.1:3000');

// Return:
return {
  content: [{
    type: 'text',
    text: JSON.stringify({
      error: 'Service is currently unavailable. Please try again later.'
    })
  }],
  isError: true
};
```

---

## API Architecture

### Middleware Stack

```typescript
// Order matters! Each layer builds on previous layers.

1. Helmet (security headers)
2. Request ID (tracking)
3. Request Logger (observability)
4. CORS (cross-origin)
5. Body Parser (JSON parsing)
6. Request Size Limiter (DoS prevention)
7. Input Sanitizer (XSS prevention)
8. Rate Limiter (abuse prevention)
9. Authentication (JWT validation)
10. Route Handler
11. Error Handler (catch-all)
```

### Rate Limiting Strategy

**Tiers:**
```typescript
// Global API limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                  // 100 requests per IP
  message: 'Too many requests from this IP'
});

// Write operations (more strict)
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                   // 20 writes per IP
  message: 'Too many write requests'
});

// Registration (very strict)
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,                    // 5 registrations per IP
  message: 'Too many registration attempts'
});
```

### Real-Time Updates

**Socket.IO Events:**
```typescript
// Server → Client events
io.emit('new-service', service);
io.emit('service-updated', service);
io.emit('service-deleted', { id });
io.emit('new-transaction', transaction);
io.emit('initial-stats', { services: count });

// Client → Server events
socket.on('subscribe', (serviceId) => {
  socket.join(`service:${serviceId}`);
});

socket.on('unsubscribe', (serviceId) => {
  socket.leave(`service:${serviceId}`);
});
```

---

## Security Architecture

### Defense in Depth

**Layer 1: Network**
- HTTPS only in production
- CORS with whitelist
- Rate limiting per IP

**Layer 2: Application**
- Helmet security headers
- Input sanitization
- Zod schema validation
- SQL prepared statements

**Layer 3: Authentication**
- Wallet-based auth (no passwords)
- JWT with short expiry
- SIWE signature verification

**Layer 4: Authorization**
- Ownership checks for updates/deletes
- Role-based permissions (future)

**Layer 5: Data**
- Encrypted database (future)
- Audit logging
- Soft deletes

### Threat Model

**Threats Mitigated:**
- ✅ SQL injection - Prepared statements
- ✅ XSS attacks - Input sanitization
- ✅ CSRF attacks - JWT tokens (no cookies)
- ✅ DoS attacks - Rate limiting
- ✅ Replay attacks - Nonce validation
- ✅ Man-in-the-middle - HTTPS only
- ✅ Unauthorized access - JWT + ownership checks

**Threats NOT Fully Mitigated:**
- ⚠️ DDoS - Need external protection (Cloudflare)
- ⚠️ 51% attack - Rely on blockchain security
- ⚠️ Smart contract bugs - Rely on CDP security

---

## Technology Stack

### Backend

**Runtime:**
- Node.js 20+ (LTS)
- TypeScript 5.0+

**Frameworks:**
- Express 5.1.0 - HTTP server
- Socket.IO 4.8.1 - WebSocket server
- @modelcontextprotocol/sdk 1.20.2 - MCP implementation

**Database:**
- SQLite 5.1.7 - Embedded database
- In-memory Map - Caching layer

**Blockchain:**
- @coinbase/coinbase-sdk 0.25.0 - CDP integration
- ethers 6.15.0 - Ethereum utilities
- @solana/web3.js 1.98.4 - Solana support

**Security:**
- helmet 8.1.0 - Security headers
- cors 2.8.5 - CORS middleware
- express-rate-limit 8.2.0 - Rate limiting
- siwe 3.0.0 - Sign-In with Ethereum
- jsonwebtoken 9.0.2 - JWT tokens
- zod 3.25.76 - Schema validation

**Utilities:**
- axios 1.13.1 - HTTP client
- uuid 13.0.0 - ID generation
- dotenv 17.2.3 - Environment config

### Testing

- jest 30.2.0 - Test framework
- ts-jest 29.4.5 - TypeScript support
- supertest 7.1.4 - HTTP testing
- @types/* - Type definitions

### Development

- nodemon 3.1.10 - Hot reload
- ts-node 10.9.2 - TypeScript execution
- typescript 5.9.3 - Compiler

### Rationale

**Why SQLite?**
- Zero configuration
- Single file database
- Sufficient for MVP scale
- Easy backups
- No separate server process

**Why Node.js?**
- JavaScript ecosystem
- Async I/O for x402 requests
- Large package ecosystem
- Good TypeScript support

**Why TypeScript?**
- Type safety
- Better IDE support
- Easier refactoring
- Self-documenting code

**Why CDP over ethers?**
- Simpler wallet management
- No private key handling
- Gas abstraction
- Multi-network support

---

## Design Decisions

### 1. In-Memory Caching vs External Cache

**Decision:** Use in-memory Map instead of Redis/Memcached

**Rationale:**
- **Simplicity** - No external dependencies
- **Performance** - Lower latency than network cache
- **Consistency** - Easier to keep in sync with database
- **Cost** - No cache server to run

**Trade-offs:**
- Can't scale horizontally (single node only)
- Cache lost on restart (reload from DB)
- Memory constraints (all services in RAM)

**When to reconsider:** >10,000 services or >1GB cache size

### 2. SQLite vs PostgreSQL

**Decision:** Use SQLite for MVP

**Rationale:**
- **Zero config** - No separate database server
- **Portability** - Single file, easy backups
- **Performance** - Fast for read-heavy workloads
- **Simplicity** - No connection pooling needed

**Trade-offs:**
- No horizontal scaling
- Limited concurrency
- No built-in replication
- Single point of failure

**Migration path:** Switch to PostgreSQL when:
- Need horizontal scaling
- >1000 writes/second
- Need replication
- Multi-region deployment

### 3. stdio vs HTTP for MCP

**Decision:** Use stdio transport

**Rationale:**
- **Standard** - Default MCP transport
- **Security** - No network exposure
- **Simplicity** - No HTTP server needed
- **Claude Desktop** - Only supports stdio

**Trade-offs:**
- Can't access from browser
- Single client at a time
- No load balancing
- Harder to debug

**Alternative:** Provide HTTP API server for web clients

### 4. x402 vs Traditional API Keys

**Decision:** Use x402 payment protocol

**Rationale:**
- **Pay-per-use** - No subscriptions
- **Automatic** - No manual billing
- **Universal** - Works across all services
- **Decentralized** - No payment processor

**Trade-offs:**
- Higher latency (blockchain confirmations)
- More complex implementation
- Gas fees (mitigated by Base L2)
- Requires crypto wallet

**When to reconsider:** Enterprise customers wanting subscriptions

### 5. SIWE vs OAuth

**Decision:** Use SIWE for authentication

**Rationale:**
- **Decentralized** - No OAuth provider needed
- **Wallet-based** - Leverage existing crypto identity
- **No passwords** - Better UX for Web3 users
- **Standard** - EIP-4361 specification

**Trade-offs:**
- Requires MetaMask/wallet
- Unfamiliar to Web2 users
- Can't revoke compromised keys easily

**Alternative:** Support both SIWE and OAuth

---

## Scalability

### Current Limitations

**Single Node Architecture:**
- 1 MCP server (stdio = single client)
- 1 API server (can handle ~1000 req/sec)
- 1 SQLite database (read-heavy OK, write-limited)
- In-memory cache (lost on restart)

**Bottlenecks:**
1. **SQLite writes** - ~500 writes/sec max
2. **Cache memory** - All services must fit in RAM
3. **No redundancy** - Single point of failure

### Scaling Strategy

**Phase 1: Vertical Scaling (0-10k services)**
- Increase server resources (CPU, RAM)
- Optimize database indexes
- Add database connection pooling
- Profile and optimize hot paths

**Phase 2: Database Migration (10k-100k services)**
- Migrate to PostgreSQL
- Add read replicas
- Implement connection pooling
- Add database monitoring

**Phase 3: Horizontal Scaling (100k+ services)**
- Load balancer (multiple API servers)
- Redis for shared cache
- Database sharding by service category
- CDN for static assets

**Phase 4: Microservices (1M+ services)**
- Separate services:
  - Discovery service
  - Payment service
  - Auth service
  - Registry service
- Message queue (RabbitMQ)
- Service mesh (Istio)

### Performance Targets

**Current (MVP):**
- 1,000 services
- 100 req/sec
- <100ms latency (cached)

**Phase 1:**
- 10,000 services
- 1,000 req/sec
- <200ms latency

**Phase 2:**
- 100,000 services
- 10,000 req/sec
- <300ms latency

**Phase 3:**
- 1,000,000 services
- 100,000 req/sec
- <500ms latency

---

## Future Enhancements

### Short-term (Next 3 months)

1. **Service Categories** - Organize services by type
2. **Advanced Search** - Full-text search with rankings
3. **Service Analytics** - Usage stats, revenue tracking
4. **Refund System** - Automatic refunds for failed services
5. **Batch Payments** - Pay for multiple services at once

### Medium-term (3-6 months)

1. **Service Marketplace UI** - Web-based service browser
2. **Provider Dashboard** - Analytics for service owners
3. **Subscription Plans** - Monthly/yearly subscriptions
4. **API Versioning** - Multiple API versions
5. **GraphQL API** - Alternative to REST

### Long-term (6-12 months)

1. **Decentralized Registry** - Move registry to smart contract
2. **Reputation Tokens** - NFT-based reputation system
3. **Dispute Resolution** - On-chain arbitration
4. **Service Composition** - Chain multiple services
5. **Multi-chain Payments** - Accept ETH, BTC, etc.

### Research (12+ months)

1. **Zero-knowledge Proofs** - Private service usage
2. **Federated Learning** - Collaborative AI training
3. **Service Discovery AI** - ML-powered recommendations
4. **Automated Testing** - AI-driven service validation
5. **Interplanetary Services** - IPFS-based service hosting

---

## Conclusion

AgentMarket's architecture prioritizes **simplicity, security, and extensibility** while maintaining high performance for the target use case of AI-native service discovery and purchase.

Key architectural strengths:
- **Clean separation** of concerns (MCP, API, Registry, Payment, Auth)
- **Caching strategy** that balances performance and consistency
- **Security-first** design with multiple layers of protection
- **Extensible** tool-based architecture
- **Well-tested** with 85%+ code coverage

As the platform scales, the architecture provides clear migration paths to more complex solutions while maintaining backward compatibility.

---

**For questions or suggestions, please open an issue on GitHub.**
