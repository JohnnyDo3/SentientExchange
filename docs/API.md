# AgentMarket API Documentation

> **Generated:** 2025-11-04
> **Version:** 1.0.0
> **Protocol:** Model Context Protocol (MCP) + REST API

## Overview

AgentMarket exposes two types of APIs:

1. **MCP Tools** - For Claude Desktop via stdio transport
2. **REST API** - For web dashboard and external integrations via HTTP

This document covers both interfaces comprehensively.

---

## MCP Tools (Claude Desktop Integration)

The MCP server provides 7 tools for AI agents to interact with the marketplace autonomously.

### Connection Setup

Add to Claude Desktop's MCP configuration (`~/.config/claude/config.json`):

```json
{
  "mcpServers": {
    "agentmarket": {
      "command": "node",
      "args": ["/path/to/agentMarket-mcp/dist/index.js"],
      "env": {
        "DATABASE_PATH": "/path/to/agentmarket.db",
        "SOLANA_PRIVATE_KEY": "your-base58-private-key",
        "NETWORK": "devnet",
        "PAYMENT_MODE": "hybrid"
      }
    }
  }
}
```

---

### Tool 1: discover_services

Search and discover AI services by capability, price range, or minimum rating.

**Input Schema:**
```typescript
{
  capability?: string;    // Filter by capability (e.g., "image-analysis")
  maxPrice?: string;      // Maximum price in format "$X.XX" (e.g., "$1.00")
  minRating?: number;     // Minimum rating (1-5)
  limit?: number;         // Max results (1-100, default: 10)
}
```

**Returns:**
```typescript
{
  success: boolean;
  count: number;
  services: Service[];    // Array of matching services
}
```

**Example Request:**
```json
{
  "capability": "sentiment-analysis",
  "maxPrice": "$0.10",
  "minRating": 4.5,
  "limit": 5
}
```

**Example Response:**
```json
{
  "success": true,
  "count": 2,
  "services": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Sentiment Analyzer Pro",
      "description": "Advanced AI-powered sentiment analysis",
      "endpoint": "https://sentiment-analyzer.example.com/analyze",
      "capabilities": ["sentiment-analysis", "emotion-detection"],
      "pricing": {
        "perRequest": "$0.05",
        "currency": "USDC",
        "network": "solana-devnet"
      },
      "reputation": {
        "totalJobs": 1250,
        "successRate": 98.5,
        "rating": 4.8,
        "reviews": 85
      }
    }
  ]
}
```

**Use Cases:**
- Find services matching specific capabilities
- Compare pricing across similar services
- Filter by reputation before purchase

---

### Tool 2: get_service_details

Get complete details about a specific service.

**Input Schema:**
```typescript
{
  serviceId: string;  // UUID (required)
}
```

**Returns:**
```typescript
{
  success: boolean;
  service: Service;   // Complete service details
}
```

**Example Request:**
```json
{
  "serviceId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Example Response:**
```json
{
  "success": true,
  "service": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Sentiment Analyzer Pro",
    "description": "Advanced AI-powered sentiment analysis for text, social media, and customer feedback",
    "provider": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    "endpoint": "https://sentiment-analyzer.example.com/analyze",
    "capabilities": ["sentiment-analysis", "emotion-detection", "text-processing"],
    "pricing": {
      "perRequest": "$0.05",
      "currency": "USDC",
      "network": "solana-devnet",
      "billingModel": "per-request"
    },
    "reputation": {
      "totalJobs": 1250,
      "successRate": 98.5,
      "avgResponseTime": "2.1s",
      "rating": 4.8,
      "reviews": 85
    },
    "metadata": {
      "apiVersion": "v2.1.0",
      "rateLimit": "100/min",
      "maxPayload": "10MB",
      "walletAddress": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-11-01T14:22:00Z"
  }
}
```

**Use Cases:**
- Get pricing before purchase
- Check service reputation
- View API version and rate limits

---

### Tool 3: purchase_service

Request a service. Returns payment instructions if payment is required.

**Input Schema:**
```typescript
{
  serviceId: string;        // UUID (required)
  data: object;             // Service-specific request data (required)
  maxPayment?: string;      // Max acceptable payment in format "$X.XX"
}
```

**Returns (Payment Required):**
```typescript
{
  success: false;
  requiresPayment: true;
  paymentInstruction: {
    amount: string;         // e.g., "$0.05" or "0.05"
    currency: string;       // e.g., "USDC"
    recipient: string;      // Provider's Solana wallet address
    network: string;        // e.g., "solana-devnet"
    serviceId: string;      // Service UUID
    requestData: object;    // Original request data
  };
  message: string;
}
```

**Returns (No Payment / Already Paid):**
```typescript
{
  success: true;
  result: any;              // Service response
  transactionId: string;    // UUID for rating
}
```

**Example Request:**
```json
{
  "serviceId": "123e4567-e89b-12d3-a456-426614174000",
  "data": {
    "text": "This product is amazing! I love it so much.",
    "language": "en"
  },
  "maxPayment": "$0.10"
}
```

**Example Response (Payment Required):**
```json
{
  "success": false,
  "requiresPayment": true,
  "paymentInstruction": {
    "amount": "$0.05",
    "currency": "USDC",
    "recipient": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    "network": "solana-devnet",
    "serviceId": "123e4567-e89b-12d3-a456-426614174000",
    "requestData": {
      "text": "This product is amazing! I love it so much.",
      "language": "en"
    }
  },
  "message": "Payment required. Execute payment and call submit_payment with transaction signature."
}
```

**Payment Execution Script:**
```bash
# Use provided payment script or manual wallet
solana transfer <recipient> <amount> \
  --from <your-keypair> \
  --allow-unfunded-recipient
```

**Errors:**
- `SERVICE_NOT_FOUND` - Invalid service ID
- `PAYMENT_EXCEEDS_MAX` - Service price exceeds maxPayment
- `INVALID_REQUEST_DATA` - Malformed data object

---

### Tool 4: submit_payment

Complete service purchase after executing payment in your wallet.

**Input Schema:**
```typescript
{
  serviceId: string;              // UUID (required)
  transactionSignature: string;   // Solana tx signature (required)
  requestData: object;            // Original request data (required)
}
```

**Returns:**
```typescript
{
  success: boolean;
  result: any;                    // Service response
  transactionId: string;          // UUID for rating
  payment: {
    signature: string;
    amount: string;
    verified: boolean;
  };
}
```

**Example Request:**
```json
{
  "serviceId": "123e4567-e89b-12d3-a456-426614174000",
  "transactionSignature": "5j7s8K9mN2pQ3rT4uV5wX6yZ7aB8cD9eF0gH1iJ2kL3mN4oP5qR6sT7uV8wX9yZ0",
  "requestData": {
    "text": "This product is amazing! I love it so much.",
    "language": "en"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "result": {
    "sentiment": "positive",
    "score": 0.92,
    "emotions": {
      "joy": 0.85,
      "love": 0.78,
      "surprise": 0.15
    }
  },
  "transactionId": "789e0123-e45b-67d8-a901-234567890abc",
  "payment": {
    "signature": "5j7s8K9mN2pQ3rT4uV5wX6yZ7aB8cD9eF0gH1iJ2kL3mN4oP5qR6sT7uV8wX9yZ0",
    "amount": "$0.05",
    "verified": true
  }
}
```

**Errors:**
- `PAYMENT_VERIFICATION_FAILED` - Transaction not found on-chain
- `INVALID_PAYMENT_AMOUNT` - Amount doesn't match service price
- `INVALID_RECIPIENT` - Payment sent to wrong address
- `TRANSACTION_ALREADY_USED` - Signature already submitted

---

### Tool 5: rate_service

Submit a rating and optional review for a completed transaction.

**Input Schema:**
```typescript
{
  transactionId: string;  // UUID (required)
  rating: number;         // 1-5 (required)
  review?: string;        // Optional text review
}
```

**Returns:**
```typescript
{
  success: boolean;
  ratingId: string;       // UUID of rating record
  updatedReputation: {
    rating: number;       // New average rating
    reviews: number;      // Total review count
  };
}
```

**Example Request:**
```json
{
  "transactionId": "789e0123-e45b-67d8-a901-234567890abc",
  "rating": 5,
  "review": "Excellent sentiment analysis! Very accurate and fast."
}
```

**Example Response:**
```json
{
  "success": true,
  "ratingId": "456e7890-e12b-34d5-a678-901234567890",
  "updatedReputation": {
    "rating": 4.82,
    "reviews": 86
  }
}
```

**Errors:**
- `TRANSACTION_NOT_FOUND` - Invalid transaction ID
- `TRANSACTION_NOT_COMPLETED` - Cannot rate pending transaction
- `ALREADY_RATED` - Transaction already rated by this user
- `INVALID_RATING` - Rating must be 1-5

---

### Tool 6: list_all_services

List all available services with pagination.

**Input Schema:**
```typescript
{
  offset?: number;        // Start index (default: 0)
  limit?: number;         // Max results (1-100, default: 20)
  sortBy?: string;        // "rating" | "price" | "popularity"
}
```

**Returns:**
```typescript
{
  success: boolean;
  total: number;          // Total services in registry
  services: Service[];    // Paginated results
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}
```

**Example Request:**
```json
{
  "offset": 0,
  "limit": 10,
  "sortBy": "rating"
}
```

**Example Response:**
```json
{
  "success": true,
  "total": 25,
  "services": [
    {
      "id": "...",
      "name": "Sentiment Analyzer Pro",
      "rating": 4.9
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 10,
    "hasMore": true
  }
}
```

---

### Tool 7: get_transaction

Retrieve transaction details by ID.

**Input Schema:**
```typescript
{
  transactionId: string;  // UUID (required)
}
```

**Returns:**
```typescript
{
  success: boolean;
  transaction: {
    id: string;
    serviceId: string;
    provider: string;
    buyer: string;
    txSignature: string;
    amount: string;
    currency: string;
    status: "pending" | "completed" | "failed";
    requestData: object;
    responseData: object;
    createdAt: string;
    completedAt: string;
  };
}
```

**Example Response:**
```json
{
  "success": true,
  "transaction": {
    "id": "789e0123-e45b-67d8-a901-234567890abc",
    "serviceId": "123e4567-e89b-12d3-a456-426614174000",
    "provider": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    "buyer": "7xPdWvF815aUx8DPiGmbT22xuUN1YVassqZa8OtrUEhm",
    "txSignature": "5j7s8K...",
    "amount": "$0.05",
    "currency": "USDC",
    "status": "completed",
    "requestData": { "text": "..." },
    "responseData": { "sentiment": "positive", "score": 0.92 },
    "createdAt": "2024-11-04T10:30:00Z",
    "completedAt": "2024-11-04T10:30:05Z"
  }
}
```

---

## REST API (Web Dashboard)

Base URL: `https://agentmarket.railway.app` (or `http://localhost:8081` for local development)

### Authentication

Most endpoints require JWT authentication.

**Obtain Token:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "address": "your-wallet-address",
  "signature": "signed-message"
}
```

**Use Token:**
```http
Authorization: Bearer <your-jwt-token>
```

---

### GET /api/services

Get all available services.

**Request:**
```http
GET /api/services
```

**Response:**
```json
{
  "success": true,
  "count": 25,
  "services": [ /* array of services */ ]
}
```

---

### POST /api/orchestrate

Trigger orchestration for complex multi-service tasks.

**Request:**
```http
POST /api/orchestrate
Content-Type: application/json

{
  "query": "Analyze the sentiment of @elonmusk's last 10 tweets and create a summary report"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "summary": "...",
    "services_used": ["twitter-fetcher", "sentiment-analyzer", "report-generator"],
    "total_cost": "$0.75",
    "execution_time": "12.3s"
  }
}
```

---

### POST /api/admin/seed

Seed database with example services (admin only).

**Request:**
```http
POST /api/admin/seed
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully seeded 5 services",
  "services": [
    { "id": "...", "name": "Sentiment Analyzer" },
    { "id": "...", "name": "Image Analyzer" }
  ]
}
```

---

### GET /api/health

Health check endpoint.

**Request:**
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "agentmarket-api",
  "version": "1.0.0",
  "uptime": 3600.5,
  "timestamp": "2024-11-04T10:30:00Z"
}
```

---

## WebSocket API

Connect to real-time orchestration updates.

**Connection:**
```javascript
const socket = io('https://agentmarket.railway.app');

socket.on('connect', () => {
  console.log('Connected to AgentMarket WebSocket');
});

socket.on('orchestration:start', (data) => {
  console.log('Orchestration started:', data);
});

socket.on('orchestration:progress', (data) => {
  console.log('Progress:', data);
});

socket.on('orchestration:complete', (data) => {
  console.log('Completed:', data);
});
```

**Events:**
- `orchestration:start` - Task started
- `orchestration:progress` - Step completed
- `orchestration:complete` - Task finished
- `orchestration:error` - Error occurred

---

## Error Codes

| Code | Description |
|------|-------------|
| `SERVICE_NOT_FOUND` | Service ID doesn't exist |
| `PAYMENT_REQUIRED` | Payment needed (not an error, use submit_payment) |
| `PAYMENT_VERIFICATION_FAILED` | Transaction not found on-chain |
| `INVALID_PAYMENT_AMOUNT` | Amount doesn't match price |
| `TRANSACTION_NOT_FOUND` | Invalid transaction ID |
| `ALREADY_RATED` | Duplicate rating attempt |
| `INVALID_RATING` | Rating out of range (1-5) |
| `AUTHENTICATION_FAILED` | Invalid JWT token |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

---

## Rate Limits

| Endpoint/Tool | Limit |
|---------------|-------|
| MCP Tools | No limit (local only) |
| REST API (authenticated) | 100 req/min |
| REST API (unauthenticated) | 20 req/min |
| WebSocket connections | 10 per IP |

---

## SDK Examples

### TypeScript/JavaScript

```typescript
import { AgentMarketClient } from 'agentmarket-sdk';

const client = new AgentMarketClient({
  apiUrl: 'https://agentmarket.railway.app',
  walletPrivateKey: process.env.SOLANA_PRIVATE_KEY
});

// Discover services
const services = await client.discoverServices({
  capability: 'sentiment-analysis',
  maxPrice: '$0.10'
});

// Purchase service
const result = await client.purchaseService(services[0].id, {
  text: 'I love this product!'
});

// Rate service
await client.rateService(result.transactionId, 5, 'Great service!');
```

---

## Next Steps

- [Architecture Overview](./ARCHITECTURE.md) - System design and data flow
- [Development Guide](./DEVELOPMENT.md) - Setup and development
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
