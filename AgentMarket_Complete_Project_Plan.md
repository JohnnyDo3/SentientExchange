# AgentMarket: Complete Project Plan & Implementation Guide

**The AI Agent Service Marketplace - x402 Hackathon 2025**

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [Technical Architecture](#technical-architecture)
4. [Complete Implementation Plan](#complete-implementation-plan)
5. [Day-by-Day Timeline](#day-by-day-timeline)
6. [Testing Strategy](#testing-strategy)
7. [Demo & Submission](#demo--submission)
8. [Revenue Model](#revenue-model)
9. [Competitive Advantages](#competitive-advantages)
10. [Risk Mitigation](#risk-mitigation)
11. [Code Repository Structure](#code-repository-structure)
12. [Appendix: Full Code Examples](#appendix-full-code-examples)

---

## Executive Summary

### What We're Building
**AgentMarket** is the first AI-native service marketplace that enables autonomous AI agents to discover, purchase, and provide services to each other using the x402 payment protocol and Model Context Protocol (MCP).

### The Problem
- 1,000+ AI agents exist with x402 payment capabilities
- ~30 services accept x402 payments
- **NO centralized discovery mechanism exists**
- Agents can't easily find services they need
- No reputation/trust system for agent services

### Our Solution
An MCP server that acts as:
1. **Service Registry** - Yellow pages for AI services
2. **Payment Router** - Automatic x402 payment handling
3. **Reputation System** - Trust scores for services
4. **Discovery Engine** - Search and match services to needs

### Why We'll Win
- ✅ **No direct competition** - First mover in agent marketplace
- ✅ **Multi-track coverage** - Qualifies for 3 hackathon tracks
- ✅ **Real utility** - Solves actual pain point today
- ✅ **Network effects** - Value compounds with adoption
- ✅ **Infrastructure play** - Platform beats products

### Hackathon Tracks Covered
1. **MCP Server** (Primary) - Core product is an MCP server
2. **x402 API Integration** (Secondary) - Full payment integration
3. **x402 Developer Tool** (Tertiary) - SDK for service providers

### Expected Outcome
- Win $10,000 top prize in MCP Server track
- Strong contender in x402 Integration track
- Foundation for $5-20M acquisition or profitable business

---

## Project Overview

### Core Value Proposition

**For AI Agents (Consumers):**
- Discover services through natural language queries
- Automatic payment handling (no manual setup)
- Reputation-based service ranking
- Pay-per-use pricing (no subscriptions)

**For Service Providers:**
- List services in agent-accessible marketplace
- Automatic payment collection via x402
- Build reputation through quality work
- Reach all x402-enabled agents

**For Developers:**
- SDK to easily create x402 services
- MCP integration in 5 lines of code
- No payment infrastructure needed
- Focus on business logic, not payments

### Market Validation

**Existing Evidence:**
- x402 transaction volume grew 10,000% in October 2025
- 50+ active x402 projects launched
- Multiple hackathon winners using x402 + MCP
- Clear demand for agent-to-agent commerce

**Our Unique Position:**
- Only project building discovery layer
- First to combine MCP + x402 + marketplace
- Solving infrastructure gap (not another service)

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Claude Desktop / AI Client              │
│                    (MCP Client)                          │
└────────────────────┬────────────────────────────────────┘
                     │ MCP Protocol (JSON-RPC via stdio)
                     ▼
┌─────────────────────────────────────────────────────────┐
│              AgentMarket MCP Server                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ MCP Tools Layer                                  │   │
│  │  • discover_services()                           │   │
│  │  • get_service_details()                         │   │
│  │  • purchase_service()                            │   │
│  │  • list_my_purchases()                           │   │
│  │  • rate_service()                                │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Service Registry                                 │   │
│  │  • In-memory + SQLite storage                    │   │
│  │  • Service metadata & capabilities               │   │
│  │  • Reputation scores                             │   │
│  │  • Historical transaction data                   │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ x402 Payment Client                              │   │
│  │  • HTTP 402 handling                             │   │
│  │  • Wallet management (CDP)                       │   │
│  │  • Payment verification                          │   │
│  │  • Transaction logging                           │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP + x402 Headers
                     ▼
┌─────────────────────────────────────────────────────────┐
│           External x402 Services                         │
│  • Image Analysis API (vision-pro.xyz)                  │
│  • Sentiment Analysis (sentiment.ai)                    │
│  • Text Summarizer (summarize.io)                       │
│  • [Any x402-enabled service]                           │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

**Core Server:**
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.0+
- **MCP SDK**: @modelcontextprotocol/sdk
- **Transport**: stdio (standard MCP pattern)

**Payment Integration:**
- **Protocol**: x402 (HTTP 402 Payment Required)
- **Blockchain**: Base Sepolia (testnet) / Base (mainnet)
- **Wallet**: Coinbase CDP Wallet Smart Accounts
- **Currency**: USDC stablecoin

**Data Storage:**
- **Primary**: SQLite (for persistence)
- **Cache**: In-memory Map (for speed)
- **Schema**: Services, Transactions, Ratings, Users

**API Communication:**
- **HTTP Client**: axios
- **x402 Headers**: Custom header parsing/generation
- **Error Handling**: Exponential backoff, retries

### Data Models

#### Service Model
```typescript
interface Service {
  id: string;                    // UUID
  name: string;                  // "vision-pro"
  description: string;           // Human-readable description
  provider: string;              // Wallet address
  endpoint: string;              // https://vision-pro.xyz/analyze
  capabilities: string[];        // ["image-analysis", "ocr"]
  pricing: {
    perRequest: string;          // "$0.02"
    currency: string;            // "USDC"
    network: string;             // "base-sepolia"
  };
  reputation: {
    totalJobs: number;           // 1247
    successRate: number;         // 99.2
    avgResponseTime: string;     // "3.2s"
    rating: number;              // 4.8/5.0
    reviews: number;             // 89
  };
  metadata: {
    apiVersion: string;          // "v1"
    rateLimit: string;           // "100/min"
    maxPayload: string;          // "10MB"
  };
  createdAt: string;             // ISO timestamp
  updatedAt: string;
}
```

#### Transaction Model
```typescript
interface Transaction {
  id: string;                    // UUID
  serviceId: string;             // Reference to Service
  buyer: string;                 // Agent wallet address
  seller: string;                // Service provider address
  amount: string;                // "0.02"
  currency: string;              // "USDC"
  status: 'pending' | 'completed' | 'failed';
  request: {
    method: string;              // "POST"
    endpoint: string;            // Full URL
    payload: any;                // Request data
  };
  response: {
    status: number;              // HTTP status
    data: any;                   // Response data
    responseTime: number;        // Milliseconds
  };
  paymentHash: string;           // On-chain tx hash
  timestamp: string;             // ISO timestamp
}
```

#### Rating Model
```typescript
interface Rating {
  id: string;
  transactionId: string;
  serviceId: string;
  rater: string;                 // Wallet address
  score: number;                 // 1-5
  review?: string;               // Optional text review
  timestamp: string;
}
```

### Security Considerations

**Wallet Security:**
- Private keys stored in environment variables only
- Never log or expose private keys
- Use CDP Wallet Smart Accounts (no key management)

**Payment Verification:**
- Verify x402 payment headers before executing requests
- Check payment amount matches service pricing
- Validate payment recipient address
- Store transaction hashes for audit trail

**Service Validation:**
- Verify service endpoints are accessible
- Rate limiting on service discovery (prevent spam)
- Reputation threshold for featured listings
- Manual review for initial service listings

**Data Protection:**
- No storage of sensitive user data
- Transaction data anonymized where possible
- SQLite database encrypted at rest (optional)
- Regular backups of registry data

---

## Complete Implementation Plan

### Phase 1: Project Setup & Foundation (Day 1)

#### 1.1 Initialize Project

```bash
# Create project directory
mkdir agentmarket-mcp
cd agentmarket-mcp

# Initialize npm project
npm init -y

# Install dependencies
npm install \
  @modelcontextprotocol/sdk \
  @coinbase/coinbase-sdk \
  axios \
  sqlite3 \
  dotenv \
  uuid

# Install dev dependencies
npm install -D \
  typescript \
  @types/node \
  ts-node \
  nodemon \
  jest \
  @types/jest \
  ts-jest
```

#### 1.2 TypeScript Configuration

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

#### 1.3 Package.json Scripts

```json
{
  "name": "agentmarket-mcp",
  "version": "1.0.0",
  "description": "AI Agent Service Marketplace via MCP + x402",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "nodemon --watch src --exec ts-node src/index.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "clean": "rm -rf dist"
  },
  "keywords": ["mcp", "x402", "ai-agents", "marketplace"],
  "author": "Your Name",
  "license": "MIT"
}
```

#### 1.4 Environment Configuration

**.env.example:**
```bash
# CDP Wallet Configuration
CDP_API_KEY_NAME=your-key-name
CDP_API_KEY_PRIVATE_KEY=your-private-key

# Network Configuration
NETWORK=base-sepolia
# Use base-sepolia for testing, base for production

# Database
DATABASE_PATH=./data/agentmarket.db

# Server Configuration
NODE_ENV=development
LOG_LEVEL=debug

# Optional: Analytics
ENABLE_ANALYTICS=false
```

#### 1.5 Project Structure

```
agentmarket-mcp/
├── src/
│   ├── index.ts                 # Entry point
│   ├── server.ts                # MCP server implementation
│   ├── types/
│   │   ├── service.ts           # Service types
│   │   ├── transaction.ts       # Transaction types
│   │   └── index.ts             # Export all types
│   ├── registry/
│   │   ├── ServiceRegistry.ts   # Service storage/retrieval
│   │   └── database.ts          # SQLite setup
│   ├── payment/
│   │   ├── X402Client.ts        # x402 payment handling
│   │   └── WalletManager.ts     # CDP wallet management
│   ├── tools/
│   │   ├── discover.ts          # discover_services tool
│   │   ├── details.ts           # get_service_details tool
│   │   ├── purchase.ts          # purchase_service tool
│   │   ├── rate.ts              # rate_service tool
│   │   └── index.ts             # Export all tools
│   └── utils/
│       ├── logger.ts            # Logging utility
│       └── validation.ts        # Input validation
├── examples/
│   ├── sample-services/
│   │   ├── image-analyzer/      # Example service
│   │   ├── sentiment-api/       # Example service
│   │   └── summarizer/          # Example service
│   └── client-usage/
│       └── demo.ts              # Usage examples
├── tests/
│   ├── unit/
│   │   ├── registry.test.ts
│   │   ├── payment.test.ts
│   │   └── tools.test.ts
│   └── integration/
│       └── e2e.test.ts
├── data/                        # SQLite database (gitignored)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── jest.config.js
├── README.md
└── LICENSE
```

### Phase 2: Core MCP Server (Days 2-3)

#### 2.1 Type Definitions

**src/types/service.ts:**
```typescript
export interface Service {
  id: string;
  name: string;
  description: string;
  provider: string;
  endpoint: string;
  capabilities: string[];
  pricing: {
    perRequest: string;
    currency: string;
    network: string;
  };
  reputation: {
    totalJobs: number;
    successRate: number;
    avgResponseTime: string;
    rating: number;
    reviews: number;
  };
  metadata: {
    apiVersion: string;
    rateLimit?: string;
    maxPayload?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ServiceSearchQuery {
  capabilities?: string[];
  maxPrice?: string;
  minRating?: number;
  sortBy?: 'price' | 'rating' | 'popularity';
}
```

**src/types/transaction.ts:**
```typescript
export interface Transaction {
  id: string;
  serviceId: string;
  buyer: string;
  seller: string;
  amount: string;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  request: {
    method: string;
    endpoint: string;
    payload: any;
  };
  response?: {
    status: number;
    data: any;
    responseTime: number;
  };
  paymentHash?: string;
  error?: string;
  timestamp: string;
}

export interface Rating {
  id: string;
  transactionId: string;
  serviceId: string;
  rater: string;
  score: number;
  review?: string;
  timestamp: string;
}
```

#### 2.2 Database Setup

**src/registry/database.ts:**
```typescript
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

export class Database {
  private db: sqlite3.Database;
  private runAsync: any;
  private getAsync: any;
  private allAsync: any;

  constructor(dbPath: string) {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath);
    this.runAsync = promisify(this.db.run.bind(this.db));
    this.getAsync = promisify(this.db.get.bind(this.db));
    this.allAsync = promisify(this.db.all.bind(this.db));
  }

  async initialize(): Promise<void> {
    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        provider TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        capabilities TEXT NOT NULL,
        pricing TEXT NOT NULL,
        reputation TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        service_id TEXT NOT NULL,
        buyer TEXT NOT NULL,
        seller TEXT NOT NULL,
        amount TEXT NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        request TEXT NOT NULL,
        response TEXT,
        payment_hash TEXT,
        error TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (service_id) REFERENCES services(id)
      )
    `);

    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS ratings (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        rater TEXT NOT NULL,
        score INTEGER NOT NULL,
        review TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id),
        FOREIGN KEY (service_id) REFERENCES services(id)
      )
    `);

    await this.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_services_capabilities 
      ON services(capabilities)
    `);

    await this.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_service 
      ON transactions(service_id)
    `);

    await this.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_ratings_service 
      ON ratings(service_id)
    `);
  }

  async run(query: string, params?: any[]): Promise<void> {
    await this.runAsync(query, params);
  }

  async get<T>(query: string, params?: any[]): Promise<T | undefined> {
    return await this.getAsync(query, params);
  }

  async all<T>(query: string, params?: any[]): Promise<T[]> {
    return await this.allAsync(query, params);
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
```

#### 2.3 Service Registry

**src/registry/ServiceRegistry.ts:**
```typescript
import { v4 as uuidv4 } from 'uuid';
import { Database } from './database';
import { Service, ServiceSearchQuery } from '../types';

export class ServiceRegistry {
  private db: Database;
  private cache: Map<string, Service> = new Map();

  constructor(db: Database) {
    this.db = db;
  }

  async initialize(): Promise<void> {
    // Load all services into cache
    const services = await this.db.all<any>(
      'SELECT * FROM services'
    );

    for (const row of services) {
      const service = this.deserializeService(row);
      this.cache.set(service.id, service);
    }
  }

  async registerService(service: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>): Promise<Service> {
    const newService: Service = {
      id: uuidv4(),
      ...service,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.db.run(
      `INSERT INTO services VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newService.id,
        newService.name,
        newService.description,
        newService.provider,
        newService.endpoint,
        JSON.stringify(newService.capabilities),
        JSON.stringify(newService.pricing),
        JSON.stringify(newService.reputation),
        JSON.stringify(newService.metadata),
        newService.createdAt,
        newService.updatedAt
      ]
    );

    this.cache.set(newService.id, newService);
    return newService;
  }

  async getService(id: string): Promise<Service | undefined> {
    return this.cache.get(id);
  }

  async searchServices(query: ServiceSearchQuery): Promise<Service[]> {
    let results = Array.from(this.cache.values());

    // Filter by capabilities
    if (query.capabilities && query.capabilities.length > 0) {
      results = results.filter(service =>
        query.capabilities!.some(cap =>
          service.capabilities.includes(cap)
        )
      );
    }

    // Filter by max price
    if (query.maxPrice) {
      const maxPrice = parseFloat(query.maxPrice.replace('$', ''));
      results = results.filter(service => {
        const price = parseFloat(service.pricing.perRequest.replace('$', ''));
        return price <= maxPrice;
      });
    }

    // Filter by minimum rating
    if (query.minRating) {
      results = results.filter(service =>
        service.reputation.rating >= query.minRating!
      );
    }

    // Sort results
    if (query.sortBy === 'price') {
      results.sort((a, b) => {
        const priceA = parseFloat(a.pricing.perRequest.replace('$', ''));
        const priceB = parseFloat(b.pricing.perRequest.replace('$', ''));
        return priceA - priceB;
      });
    } else if (query.sortBy === 'rating') {
      results.sort((a, b) => b.reputation.rating - a.reputation.rating);
    } else if (query.sortBy === 'popularity') {
      results.sort((a, b) => b.reputation.totalJobs - a.reputation.totalJobs);
    }

    return results;
  }

  async updateReputation(serviceId: string, rating: number): Promise<void> {
    const service = this.cache.get(serviceId);
    if (!service) return;

    // Recalculate reputation
    const currentRating = service.reputation.rating;
    const currentReviews = service.reputation.reviews;
    const newRating = ((currentRating * currentReviews) + rating) / (currentReviews + 1);

    service.reputation.rating = Math.round(newRating * 10) / 10;
    service.reputation.reviews += 1;
    service.updatedAt = new Date().toISOString();

    // Update database
    await this.db.run(
      `UPDATE services SET reputation = ?, updated_at = ? WHERE id = ?`,
      [JSON.stringify(service.reputation), service.updatedAt, serviceId]
    );

    this.cache.set(serviceId, service);
  }

  private deserializeService(row: any): Service {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      provider: row.provider,
      endpoint: row.endpoint,
      capabilities: JSON.parse(row.capabilities),
      pricing: JSON.parse(row.pricing),
      reputation: JSON.parse(row.reputation),
      metadata: JSON.parse(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
```

### Phase 3: x402 Payment Integration (Days 4-5)

#### 3.1 Wallet Manager

**src/payment/WalletManager.ts:**
```typescript
import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';

export class WalletManager {
  private coinbase: Coinbase;
  private wallet?: Wallet;

  constructor(apiKeyName: string, privateKey: string) {
    this.coinbase = new Coinbase({
      apiKeyName,
      privateKey
    });
  }

  async initialize(networkId: string = 'base-sepolia'): Promise<void> {
    try {
      // Try to load existing wallet
      const wallets = await this.coinbase.listWallets();
      if (wallets.length > 0) {
        this.wallet = wallets[0];
        console.log('Loaded existing wallet:', this.wallet.getId());
      } else {
        // Create new wallet
        this.wallet = await this.coinbase.createWallet({ networkId });
        console.log('Created new wallet:', this.wallet.getId());
      }
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      throw error;
    }
  }

  getAddress(): string {
    if (!this.wallet) throw new Error('Wallet not initialized');
    return this.wallet.getDefaultAddress()?.getId() || '';
  }

  async getBalance(asset: string = 'usdc'): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not initialized');
    const balance = await this.wallet.getBalance(asset);
    return balance.toString();
  }

  async signTransaction(tx: any): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not initialized');
    // Implement transaction signing
    // This is simplified - actual implementation depends on CDP SDK
    return 'signed-tx-hash';
  }
}
```

#### 3.2 x402 Payment Client

**src/payment/X402Client.ts:**
```typescript
import axios, { AxiosInstance } from 'axios';
import { WalletManager } from './WalletManager';
import { Transaction } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class X402Client {
  private http: AxiosInstance;
  private wallet: WalletManager;

  constructor(wallet: WalletManager) {
    this.wallet = wallet;
    this.http = axios.create({
      timeout: 30000,
      validateStatus: (status) => status < 600 // Don't throw on 402
    });
  }

  async makePayment(
    endpoint: string,
    method: string,
    data: any,
    maxPayment: string
  ): Promise<Transaction> {
    const transaction: Transaction = {
      id: uuidv4(),
      serviceId: '', // Will be filled by caller
      buyer: this.wallet.getAddress(),
      seller: '', // Will be filled from 402 response
      amount: '0',
      currency: 'USDC',
      status: 'pending',
      request: {
        method,
        endpoint,
        payload: data
      },
      timestamp: new Date().toISOString()
    };

    try {
      // Step 1: Make initial request (expect 402)
      const initialResponse = await this.http.request({
        method,
        url: endpoint,
        data,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (initialResponse.status === 402) {
        // Parse payment requirements
        const paymentInfo = initialResponse.data;
        const acceptedPayment = paymentInfo.accepts[0];

        transaction.seller = acceptedPayment.payTo;
        transaction.amount = (parseInt(acceptedPayment.maxAmountRequired) / 1e6).toString();

        // Verify we're willing to pay this amount
        const requestedPrice = parseFloat(transaction.amount);
        const maxPrice = parseFloat(maxPayment.replace('$', ''));
        
        if (requestedPrice > maxPrice) {
          transaction.status = 'failed';
          transaction.error = `Price ${requestedPrice} exceeds max ${maxPrice}`;
          return transaction;
        }

        // Step 2: Execute payment (simplified - actual implementation uses CDP)
        const paymentHash = await this.executePayment(
          acceptedPayment.payTo,
          acceptedPayment.maxAmountRequired,
          acceptedPayment.asset,
          acceptedPayment.network
        );

        transaction.paymentHash = paymentHash;

        // Step 3: Retry request with payment proof
        const startTime = Date.now();
        const paidResponse = await this.http.request({
          method,
          url: endpoint,
          data,
          headers: {
            'Content-Type': 'application/json',
            'X-Payment': JSON.stringify({
              network: acceptedPayment.network,
              txHash: paymentHash,
              from: this.wallet.getAddress(),
              to: acceptedPayment.payTo,
              amount: acceptedPayment.maxAmountRequired,
              asset: acceptedPayment.asset
            })
          }
        });

        const responseTime = Date.now() - startTime;

        transaction.response = {
          status: paidResponse.status,
          data: paidResponse.data,
          responseTime
        };

        transaction.status = paidResponse.status === 200 ? 'completed' : 'failed';
        
      } else if (initialResponse.status === 200) {
        // Service doesn't require payment (free tier or error)
        transaction.response = {
          status: 200,
          data: initialResponse.data,
          responseTime: 0
        };
        transaction.status = 'completed';
      }

    } catch (error: any) {
      transaction.status = 'failed';
      transaction.error = error.message;
    }

    return transaction;
  }

  private async executePayment(
    to: string,
    amount: string,
    asset: string,
    network: string
  ): Promise<string> {
    // Simplified payment execution
    // In production, use CDP SDK to actually send USDC
    console.log(`Executing payment: ${amount} ${asset} to ${to} on ${network}`);
    
    // Simulate transaction hash
    return `0x${Math.random().toString(16).slice(2)}`;
  }
}
```

### Phase 4: MCP Tools Implementation (Day 5)

#### 4.1 Discover Services Tool

**src/tools/discover.ts:**
```typescript
import { ServiceRegistry } from '../registry/ServiceRegistry';
import { ServiceSearchQuery } from '../types';

export async function discoverServices(
  registry: ServiceRegistry,
  args: {
    capability?: string;
    maxPrice?: string;
    minRating?: number;
    limit?: number;
  }
) {
  const query: ServiceSearchQuery = {
    capabilities: args.capability ? [args.capability] : undefined,
    maxPrice: args.maxPrice,
    minRating: args.minRating,
    sortBy: 'rating'
  };

  const services = await registry.searchServices(query);
  const limited = services.slice(0, args.limit || 10);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          count: limited.length,
          services: limited.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            price: s.pricing.perRequest,
            rating: s.reputation.rating,
            reviews: s.reputation.reviews,
            capabilities: s.capabilities
          }))
        }, null, 2)
      }
    ]
  };
}
```

#### 4.2 Purchase Service Tool

**src/tools/purchase.ts:**
```typescript
import { ServiceRegistry } from '../registry/ServiceRegistry';
import { X402Client } from '../payment/X402Client';
import { Database } from '../registry/database';

export async function purchaseService(
  registry: ServiceRegistry,
  paymentClient: X402Client,
  db: Database,
  args: {
    serviceId: string;
    data: any;
    maxPayment?: string;
  }
) {
  // Get service details
  const service = await registry.getService(args.serviceId);
  if (!service) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: 'Service not found' })
      }]
    };
  }

  // Execute payment and request
  const maxPayment = args.maxPayment || service.pricing.perRequest;
  const transaction = await paymentClient.makePayment(
    service.endpoint,
    'POST',
    args.data,
    maxPayment
  );

  transaction.serviceId = service.id;

  // Save transaction
  await db.run(
    `INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.id,
      transaction.serviceId,
      transaction.buyer,
      transaction.seller,
      transaction.amount,
      transaction.currency,
      transaction.status,
      JSON.stringify(transaction.request),
      transaction.response ? JSON.stringify(transaction.response) : null,
      transaction.paymentHash || null,
      transaction.error || null,
      transaction.timestamp
    ]
  );

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        transactionId: transaction.id,
        status: transaction.status,
        cost: `${transaction.amount} ${transaction.currency}`,
        result: transaction.response?.data,
        error: transaction.error
      }, null, 2)
    }]
  };
}
```

#### 4.3 Rate Service Tool

**src/tools/rate.ts:**
```typescript
import { v4 as uuidv4 } from 'uuid';
import { ServiceRegistry } from '../registry/ServiceRegistry';
import { Database } from '../registry/database';

export async function rateService(
  registry: ServiceRegistry,
  db: Database,
  args: {
    transactionId: string;
    score: number;
    review?: string;
  }
) {
  // Validate score
  if (args.score < 1 || args.score > 5) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: 'Score must be between 1 and 5' })
      }]
    };
  }

  // Get transaction
  const transaction = await db.get<any>(
    'SELECT * FROM transactions WHERE id = ?',
    [args.transactionId]
  );

  if (!transaction) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: 'Transaction not found' })
      }]
    };
  }

  // Save rating
  const rating = {
    id: uuidv4(),
    transactionId: args.transactionId,
    serviceId: transaction.service_id,
    rater: transaction.buyer,
    score: args.score,
    review: args.review,
    timestamp: new Date().toISOString()
  };

  await db.run(
    'INSERT INTO ratings VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      rating.id,
      rating.transactionId,
      rating.serviceId,
      rating.rater,
      rating.score,
      rating.review || null,
      rating.timestamp
    ]
  );

  // Update service reputation
  await registry.updateReputation(transaction.service_id, args.score);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: 'Rating submitted successfully'
      })
    }]
  };
}
```

### Phase 5: Main Server (Day 6)

**src/server.ts:**
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { Database } from './registry/database';
import { ServiceRegistry } from './registry/ServiceRegistry';
import { WalletManager } from './payment/WalletManager';
import { X402Client } from './payment/X402Client';

import { discoverServices } from './tools/discover';
import { purchaseService } from './tools/purchase';
import { rateService } from './tools/rate';

export class AgentMarketServer {
  private server: Server;
  private db: Database;
  private registry: ServiceRegistry;
  private wallet: WalletManager;
  private paymentClient: X402Client;

  constructor() {
    this.server = new Server(
      {
        name: 'agentmarket-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize components
    const dbPath = process.env.DATABASE_PATH || './data/agentmarket.db';
    this.db = new Database(dbPath);
    this.registry = new ServiceRegistry(this.db);
    
    this.wallet = new WalletManager(
      process.env.CDP_API_KEY_NAME!,
      process.env.CDP_API_KEY_PRIVATE_KEY!
    );
    
    this.paymentClient = new X402Client(this.wallet);

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'discover_services',
          description: 'Search for AI services by capability, price, or rating',
          inputSchema: {
            type: 'object',
            properties: {
              capability: {
                type: 'string',
                description: 'Service capability (e.g., "image-analysis", "sentiment-analysis")'
              },
              maxPrice: {
                type: 'string',
                description: 'Maximum price per request (e.g., "$0.05")'
              },
              minRating: {
                type: 'number',
                description: 'Minimum service rating (1-5)'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results',
                default: 10
              }
            }
          }
        },
        {
          name: 'get_service_details',
          description: 'Get detailed information about a specific service',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: {
                type: 'string',
                description: 'Service ID'
              }
            },
            required: ['serviceId']
          }
        },
        {
          name: 'purchase_service',
          description: 'Purchase and execute a service request with automatic payment',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: {
                type: 'string',
                description: 'Service ID from discovery'
              },
              data: {
                type: 'object',
                description: 'Request payload for the service'
              },
              maxPayment: {
                type: 'string',
                description: 'Maximum willing to pay (optional, defaults to service price)'
              }
            },
            required: ['serviceId', 'data']
          }
        },
        {
          name: 'rate_service',
          description: 'Rate a completed service transaction',
          inputSchema: {
            type: 'object',
            properties: {
              transactionId: {
                type: 'string',
                description: 'Transaction ID from purchase'
              },
              score: {
                type: 'number',
                description: 'Rating score (1-5)',
                minimum: 1,
                maximum: 5
              },
              review: {
                type: 'string',
                description: 'Optional text review'
              }
            },
            required: ['transactionId', 'score']
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'discover_services':
          return await discoverServices(this.registry, args as any);

        case 'get_service_details':
          const service = await this.registry.getService((args as any).serviceId);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(service, null, 2)
            }]
          };

        case 'purchase_service':
          return await purchaseService(
            this.registry,
            this.paymentClient,
            this.db,
            args as any
          );

        case 'rate_service':
          return await rateService(this.registry, this.db, args as any);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async start() {
    // Initialize database
    await this.db.initialize();
    await this.registry.initialize();
    await this.wallet.initialize(process.env.NETWORK || 'base-sepolia');

    // Seed with example services (for demo)
    await this.seedExampleServices();

    // Start MCP server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('AgentMarket MCP Server running');
    console.error('Wallet address:', this.wallet.getAddress());
  }

  private async seedExampleServices() {
    // Check if we already have services
    const existing = await this.registry.searchServices({});
    if (existing.length > 0) return;

    // Add example services
    await this.registry.registerService({
      name: 'vision-pro',
      description: 'Professional image analysis with object detection and OCR',
      provider: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
      endpoint: 'http://localhost:3001/analyze',
      capabilities: ['image-analysis', 'ocr', 'object-detection'],
      pricing: {
        perRequest: '$0.02',
        currency: 'USDC',
        network: 'base-sepolia'
      },
      reputation: {
        totalJobs: 1247,
        successRate: 99.2,
        avgResponseTime: '3.2s',
        rating: 4.8,
        reviews: 89
      },
      metadata: {
        apiVersion: 'v1',
        rateLimit: '100/min',
        maxPayload: '10MB'
      }
    });

    console.error('Seeded example services');
  }
}
```

**src/index.ts:**
```typescript
import dotenv from 'dotenv';
dotenv.config();

import { AgentMarketServer } from './server';

async function main() {
  const server = new AgentMarketServer();
  await server.start();
}

main().catch(console.error);
```

### Phase 6: Example Services (Day 7)

#### Image Analysis Service

**examples/sample-services/image-analyzer/server.ts:**
```typescript
import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

const WALLET_ADDRESS = process.env.WALLET_ADDRESS!;
const PRICE_USDC = 0.02; // $0.02

function x402Middleware(req: any, res: any, next: any) {
  const paymentHeader = req.headers['x-payment'];
  
  if (!paymentHeader) {
    return res.status(402).json({
      x402Version: 1,
      accepts: [{
        scheme: "exact",
        network: "base-sepolia",
        maxAmountRequired: (PRICE_USDC * 1e6).toString(),
        resource: req.path,
        description: "Image analysis service",
        mimeType: "application/json",
        payTo: WALLET_ADDRESS,
        maxTimeoutSeconds: 30,
        asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        extra: { name: "USD Coin", version: "2" }
      }]
    });
  }

  // In production: verify payment
  const payment = JSON.parse(paymentHeader);
  console.log('Received payment:', payment);
  
  next();
}

app.post('/analyze', x402Middleware, async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl required' });
  }

  try {
    // Simulate image analysis
    const analysis = {
      objects: ["sunset", "ocean", "beach", "palm tree"],
      colors: ["orange", "blue", "yellow", "green"],
      text: [],
      sentiment: "peaceful",
      confidence: 0.94,
      metadata: {
        dimensions: "1920x1080",
        format: "JPEG"
      }
    };

    res.json({
      success: true,
      analysis,
      metadata: {
        model: "vision-pro-v1",
        processingTime: "1.2s",
        cost: `$${PRICE_USDC} USDC`
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'image-analyzer' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Image Analysis Service running on port ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}/analyze`);
  console.log(`Price: $${PRICE_USDC} USDC per analysis`);
});
```

---

## Day-by-Day Timeline

### Day 1: Foundation
- [x] Project setup (npm init, dependencies)
- [x] TypeScript configuration
- [x] Directory structure
- [x] Environment configuration
- [x] Database schema design
- [ ] Initial Git commit

**Deliverable:** Project skeleton with all dependencies installed

### Day 2: Core Infrastructure
- [ ] Implement Database class
- [ ] Implement ServiceRegistry
- [ ] Implement type definitions
- [ ] Write unit tests for registry
- [ ] Seed example services

**Deliverable:** Working service registry with CRUD operations

### Day 3: Payment System
- [ ] Implement WalletManager
- [ ] Implement X402Client
- [ ] Test payment flow (testnet)
- [ ] Error handling for failed payments
- [ ] Transaction logging

**Deliverable:** Working payment client that can make x402 payments

### Day 4: MCP Tools
- [ ] Implement discover_services tool
- [ ] Implement get_service_details tool
- [ ] Implement purchase_service tool
- [ ] Implement rate_service tool
- [ ] Write unit tests for all tools

**Deliverable:** All 4 MCP tools functional

### Day 5: Server Integration
- [ ] Implement main MCP server
- [ ] Connect all components
- [ ] Test with Claude Desktop
- [ ] Fix integration bugs
- [ ] Add logging and monitoring

**Deliverable:** End-to-end working MCP server

### Day 6: Example Services
- [ ] Create image-analyzer service
- [ ] Create sentiment-analyzer service
- [ ] Create text-summarizer service
- [ ] Test all services with x402
- [ ] Deploy services to testnet

**Deliverable:** 3 working example services

### Day 7: Testing & Polish
- [ ] End-to-end integration tests
- [ ] Performance testing
- [ ] Bug fixes
- [ ] Code cleanup
- [ ] Documentation updates

**Deliverable:** Production-ready code

### Day 8: Documentation
- [ ] Complete README.md
- [ ] Write ARCHITECTURE.md
- [ ] Write API.md
- [ ] Create setup guide
- [ ] Add inline code comments

**Deliverable:** Professional documentation

### Day 9: Demo Video
- [ ] Script demo video (see section below)
- [ ] Record screen capture
- [ ] Add narration
- [ ] Edit video
- [ ] Upload to YouTube

**Deliverable:** 2-3 minute demo video

### Day 10: Submission
- [ ] Final code review
- [ ] Deploy to mainnet (optional)
- [ ] Create submission deck
- [ ] Submit to hackathon
- [ ] Share on social media

**Deliverable:** Submitted project

---

## Testing Strategy

### Unit Tests

**tests/unit/registry.test.ts:**
```typescript
import { Database } from '../../src/registry/database';
import { ServiceRegistry } from '../../src/registry/ServiceRegistry';

describe('ServiceRegistry', () => {
  let db: Database;
  let registry: ServiceRegistry;

  beforeAll(async () => {
    db = new Database(':memory:');
    await db.initialize();
    registry = new ServiceRegistry(db);
    await registry.initialize();
  });

  afterAll(async () => {
    await db.close();
  });

  test('should register a new service', async () => {
    const service = await registry.registerService({
      name: 'test-service',
      description: 'Test service',
      provider: '0xTest',
      endpoint: 'http://localhost:3000',
      capabilities: ['test'],
      pricing: {
        perRequest: '$0.01',
        currency: 'USDC',
        network: 'base-sepolia'
      },
      reputation: {
        totalJobs: 0,
        successRate: 0,
        avgResponseTime: '0s',
        rating: 0,
        reviews: 0
      },
      metadata: {
        apiVersion: 'v1'
      }
    });

    expect(service.id).toBeDefined();
    expect(service.name).toBe('test-service');
  });

  test('should search services by capability', async () => {
    const results = await registry.searchServices({
      capabilities: ['test']
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].capabilities).toContain('test');
  });

  test('should update service reputation', async () => {
    const services = await registry.searchServices({});
    const serviceId = services[0].id;

    await registry.updateReputation(serviceId, 5);
    
    const updated = await registry.getService(serviceId);
    expect(updated?.reputation.reviews).toBe(1);
    expect(updated?.reputation.rating).toBe(5);
  });
});
```

### Integration Tests

**tests/integration/e2e.test.ts:**
```typescript
import { AgentMarketServer } from '../../src/server';

describe('End-to-End Tests', () => {
  let server: AgentMarketServer;

  beforeAll(async () => {
    // Set test environment
    process.env.DATABASE_PATH = ':memory:';
    server = new AgentMarketServer();
    // Note: Cannot fully test stdio transport in Jest
  });

  test('should discover services', async () => {
    // Test discovery logic directly
    // Actual MCP protocol testing requires manual testing with Claude Desktop
  });
});
```

### Manual Testing Checklist

- [ ] Install MCP server in Claude Desktop
- [ ] Test service discovery
- [ ] Test service purchase
- [ ] Verify payment transaction on block explorer
- [ ] Test rating system
- [ ] Test error handling (insufficient funds, invalid service)
- [ ] Test performance (response times)

---

## Demo & Submission

### Demo Video Script (2-3 minutes)

**[0:00-0:15] Hook**
> "What if AI agents could buy services from each other, automatically, with micropayments? Today I'll show you AgentMarket - the first marketplace for autonomous AI commerce."

**[0:15-0:45] Problem**
> "Right now, there are over 1,000 AI agents with payment capabilities, and about 30 services that accept payments via x402. But there's no way for agents to discover these services. It's like having a thousand shoppers and thirty stores, but no directory. AgentMarket solves this."

**[0:45-1:30] Demo**
> [Show Claude Desktop]
> "Watch as I ask Claude to analyze this image for me.
> 
> [Type: 'Analyze this sunset image']
> 
> Behind the scenes, Claude uses AgentMarket to:
> 1. Discover image analysis services
> 2. Compare prices and ratings
> 3. Automatically pay $0.02 via x402
> 4. Return the results
> 
> [Show terminal logs of service discovery, payment, and response]
> 
> The entire transaction took 3 seconds. Claude never asked me about payment - it just worked."

**[1:30-2:00] Technical Overview**
> "AgentMarket is built with three core components:
> - An MCP server that integrates with Claude
> - A service registry with reputation tracking
> - An x402 payment client using Coinbase CDP
> 
> [Show architecture diagram]
> 
> Service providers can list their APIs, agents can discover and pay for them, and everyone builds reputation over time."

**[2:00-2:30] Vision**
> "This enables a new economy: AI agents working together, paying each other for specialized services, forming autonomous networks of commerce.
> 
> [Show example: Research agent hiring translator, chart maker, and fact-checker]
> 
> AgentMarket is the infrastructure layer that makes this possible."

**[2:30-2:45] Call to Action**
> "Try it yourself - the code is open source on GitHub. Install the MCP server, connect to Claude, and watch AI agents discover and purchase services automatically. The future of autonomous commerce is here."

### Recording Tips

1. **Use Loom or OBS Studio** for screen recording
2. **1080p minimum** resolution
3. **Clear audio** - use good microphone
4. **Smooth demo** - rehearse multiple times
5. **Show real transactions** - use testnet with actual payments
6. **Include captions** - accessibility matters

### Submission Checklist

**Code:**
- [ ] GitHub repository public
- [ ] README.md complete
- [ ] All code commented
- [ ] Tests passing
- [ ] No secrets in code
- [ ] License file (MIT)

**Documentation:**
- [ ] Architecture diagram
- [ ] API documentation
- [ ] Setup instructions
- [ ] Example usage
- [ ] Troubleshooting guide

**Demo:**
- [ ] Video recorded (2-3 min)
- [ ] Uploaded to YouTube
- [ ] Link in submission
- [ ] Thumbnail created
- [ ] Description written

**Submission Form:**
- [ ] Project name
- [ ] Team information
- [ ] Track selection (MCP Server primary)
- [ ] GitHub link
- [ ] Demo video link
- [ ] Live demo URL (if deployed)
- [ ] Project description (200 words)

---

## Revenue Model

### Phase 1: Free (Months 0-6)
**Goal:** Build network effects

- All services listed for free
- No transaction fees
- Focus on quality and adoption
- Metrics: Services listed, transactions processed

### Phase 2: Freemium (Months 6-12)
**Revenue Streams:**

1. **Premium Listings** - $49/month
   - Featured placement in search
   - Custom branding
   - Priority support
   - Advanced analytics

2. **Transaction Fees** - 1-2%
   - Small percentage of each transaction
   - Only for high-volume services (>1000 txns/month)
   - Incentivizes quality over quantity

3. **Enterprise API** - $299/month
   - Higher rate limits
   - Dedicated infrastructure
   - Custom SLA
   - Priority routing

**Projected Revenue (Month 12):**
- 50 premium listings × $49 = $2,450
- 2% of $75K monthly volume = $1,500
- 15 enterprise customers × $299 = $4,485
- **Total: ~$8,500/month**

### Phase 3: Scale (Year 2+)

1. **White-label Solution** - $10K-50K one-time
   - Companies run their own marketplace
   - Customized branding
   - Integration support

2. **Data & Analytics** - $999/month
   - Market insights
   - Service performance data
   - Trend analysis
   - Competitive intelligence

3. **Acquisition Target** - $5-20M
   - Anthropic, Coinbase, or another major player
   - Infrastructure is valuable even at low volume
   - First-mover advantage = premium valuation

---

## Competitive Advantages

### 1. Network Effects
- More services → More agents
- More agents → More services
- More transactions → Better reputation data
- Better data → Better discovery

### 2. First-Mover Advantage
- **No competitors** building MCP + x402 marketplace
- Capture early adopters
- Set standards for the industry
- Own the reputation data

### 3. Infrastructure Play
- Platform beats products
- Don't depend on high transaction volume
- Value compounds over time
- Defensive moat through data

### 4. Multi-Track Coverage
- Qualifies for 3 hackathon tracks
- Demonstrates technical breadth
- Shows understanding of ecosystem
- Higher chance of winning

### 5. Real Utility
- Solves actual pain point (discovery)
- Works with existing tools (MCP, x402)
- No behavior change needed
- Immediate value to users

---

## Risk Mitigation

### Technical Risks

**Risk:** x402 adoption remains low
**Mitigation:**
- Support multiple payment methods
- Offer free tier for services
- Focus on utility over payments
- Can pivot to different payment protocol

**Risk:** MCP protocol changes
**Mitigation:**
- Follow MCP SDK updates closely
- Abstract protocol logic from business logic
- Maintain backward compatibility
- Version the API

**Risk:** Wallet security issues
**Mitigation:**
- Use CDP Smart Accounts (no key management)
- Never store private keys
- Implement spending limits
- Add multi-sig for large amounts

### Market Risks

**Risk:** Low demand for agent services
**Mitigation:**
- Focus on infrastructure value (not volume)
- Build for future market
- Capture market as it grows
- Valuable even with low volume

**Risk:** Competitors emerge
**Mitigation:**
- Move fast and ship early
- Build strong brand
- Accumulate reputation data
- Create switching costs

**Risk:** Regulatory changes
**Mitigation:**
- Work with compliant partners (Coinbase)
- Geographic diversification
- Focus on international markets first
- Adapt to regulations quickly

### Execution Risks

**Risk:** Miss hackathon deadline
**Mitigation:**
- Start Day 1
- Ship MVP first, polish later
- Cut scope if needed
- Have buffer days

**Risk:** Technical bugs in demo
**Mitigation:**
- Test extensively
- Record demo multiple times
- Have backup recording
- Use stable testnet

---

## Code Repository Structure

```
agentmarket-mcp/
├── .github/
│   ├── workflows/
│   │   ├── test.yml          # CI/CD
│   │   └── deploy.yml
│   └── ISSUE_TEMPLATE/
├── src/
│   ├── index.ts
│   ├── server.ts
│   ├── types/
│   ├── registry/
│   ├── payment/
│   ├── tools/
│   └── utils/
├── examples/
│   ├── sample-services/
│   └── client-usage/
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── CONTRIBUTING.md
│   └── images/
│       └── architecture.png
├── scripts/
│   ├── setup.sh
│   ├── seed-services.ts
│   └── deploy.sh
├── data/                     # Gitignored
├── .env.example
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── package.json
├── tsconfig.json
├── jest.config.js
├── README.md
└── LICENSE
```

### .gitignore

```
# Dependencies
node_modules/
package-lock.json

# Build output
dist/
*.tsbuildinfo

# Environment
.env
.env.local

# Database
data/
*.db
*.sqlite

# Logs
logs/
*.log

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/
```

---

## Appendix: Full Code Examples

### Claude Desktop Configuration

**~/.config/claude/config.json:**
```json
{
  "mcpServers": {
    "agentmarket": {
      "command": "node",
      "args": ["/path/to/agentmarket-mcp/dist/index.js"],
      "env": {
        "DATABASE_PATH": "/path/to/data/agentmarket.db",
        "CDP_API_KEY_NAME": "your-key-name",
        "CDP_API_KEY_PRIVATE_KEY": "your-private-key",
        "NETWORK": "base-sepolia"
      }
    }
  }
}
```

### Example Usage from Claude

```
User: "I need to analyze this image: https://example.com/sunset.jpg"

Claude: Let me find an image analysis service for you.

[Uses discover_services tool with capability: "image-analysis"]
[Finds vision-pro service at $0.02]
[Uses purchase_service tool with the image URL]
[Receives analysis results]

Claude: "I've analyzed your sunset image! Here's what I found:
- Main objects: sunset, ocean, beach, palm tree
- Dominant colors: orange, blue, yellow
- Sentiment: Peaceful and serene
- Confidence: 94%

The analysis cost $0.02 USDC and was completed in 1.2 seconds."
```

---

## Final Notes

### Critical Success Factors

1. **Start immediately** - Don't overthink, just build
2. **Ship working code** - Better done than perfect
3. **Focus on demo** - Make it visual and exciting
4. **Document everything** - Professional presentation matters
5. **Test thoroughly** - Demo must work flawlessly

### What Makes This Win

- ✅ **Solves real problem** (agent discovery)
- ✅ **First in category** (no competition)
- ✅ **Technical excellence** (multi-track coverage)
- ✅ **Market timing** (x402 ecosystem growing fast)
- ✅ **Network effects** (value compounds)
- ✅ **Professional execution** (docs, tests, demo)

### Your Next Steps

1. **Read this document fully** ✓
2. **Set up development environment**
3. **Follow day-by-day timeline**
4. **Build, test, iterate**
5. **Create awesome demo**
6. **Submit and win!**

---

**You've got this! Let's build the infrastructure for the AI agent economy. 🚀**

**Questions? Need help? Let's discuss as you build!**

---

*Document Version: 1.0*  
*Last Updated: October 28, 2025*  
*Project: AgentMarket MCP Server*  
*Hackathon: x402 2025*
