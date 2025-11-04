# AgentMarket MCP - API Reference

Complete API documentation for AgentMarket's REST API and MCP tools.

---

## Table of Contents

- [Overview](#overview)
- [Base URLs](#base-urls)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [REST API Endpoints](#rest-api-endpoints)
  - [Health & Status](#health--status)
  - [Authentication](#authentication-endpoints)
  - [Services](#services-endpoints)
  - [Search & Discovery](#search--discovery)
  - [Ratings & Reviews](#ratings--reviews)
  - [Analytics & Stats](#analytics--stats)
- [MCP Tools](#mcp-tools)
- [WebSocket Events](#websocket-events)
- [Code Examples](#code-examples)

---

## Overview

AgentMarket provides two APIs:

1. **REST API** - HTTP/JSON API for web and mobile applications
2. **MCP Tools** - Model Context Protocol tools for AI clients (Claude Desktop)

Both APIs share the same backend and data, providing consistent experiences across platforms.

**API Version:** 1.0.0
**Protocol:** HTTP/1.1 + WebSocket
**Format:** JSON
**Authentication:** JWT (REST API) or none (MCP Tools)

---

## Base URLs

### REST API

**Development:**
```
http://localhost:3333
```

**Production:**
```
https://api.agentmarket.xyz
```

### MCP Server

**Transport:** stdio (standard input/output)
**Connection:** via Claude Desktop configuration

---

## Authentication

### Authentication Methods

**REST API:**
- **SIWE (Sign-In with Ethereum)** - Wallet-based authentication
- **JWT Tokens** - Bearer token authentication

**MCP Tools:**
- No authentication required (uses wallet configured in environment)

### Getting an Authentication Token

#### Step 1: Request Nonce

**Endpoint:** `POST /api/auth/nonce`

**Request:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5"
}
```

**Response:**
```json
{
  "success": true,
  "nonce": "abc123xyz789",
  "message": "Sign this message to authenticate"
}
```

#### Step 2: Sign SIWE Message

Use your wallet to sign this message:

```
agentmarket.xyz wants you to sign in with your Ethereum account:
0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5

URI: https://agentmarket.xyz
Version: 1
Chain ID: 84532
Nonce: abc123xyz789
Issued At: 2025-10-30T20:30:00.000Z
```

#### Step 3: Verify Signature

**Endpoint:** `POST /api/auth/verify`

**Request:**
```json
{
  "message": "agentmarket.xyz wants you to...",
  "signature": "0xdef456abc789..."
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "address": "0x742d35cc6634c0532925a3b844bc9e7595beb5e5",
  "chainId": 84532,
  "message": "Authentication successful"
}
```

#### Step 4: Use Token

Include the JWT token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Expiry:** 7 days

---

## Rate Limiting

### Rate Limit Tiers

| Tier | Endpoints | Window | Limit |
|------|-----------|--------|-------|
| **Global** | All `/api/*` | 15 minutes | 100 requests |
| **Write** | POST/PUT/DELETE | 15 minutes | 20 requests |
| **Registration** | POST `/api/services` | 1 hour | 5 requests |

### Rate Limit Headers

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699123456
```

### Rate Limit Exceeded

**Status:** `429 Too Many Requests`

**Response:**
```json
{
  "success": false,
  "error": "Too many requests from this IP",
  "retryAfter": 900
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed description (optional)",
  "code": "ERROR_CODE (optional)"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Request successful |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Invalid input or missing parameters |
| `401` | Unauthorized | Missing or invalid authentication token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource does not exist |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |

### Common Error Codes

| Code | Description |
|------|-------------|
| `MISSING_PARAMETERS` | Required parameters not provided |
| `INVALID_INPUT` | Input validation failed |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Access denied |
| `NOT_FOUND` | Resource not found |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `SERVICE_UNAVAILABLE` | External service unavailable |

---

## REST API Endpoints

## Health & Status

### GET /api/pulse

Get server health status.

**Authentication:** None required

**Request:**
```bash
curl http://localhost:3333/api/pulse
```

**Response:** `200 OK`
```json
{
  "pulse": "strong",
  "heartbeat": "💓",
  "agents": "active",
  "market": "open",
  "vibe": "immaculate",
  "uptime": "42m 15s",
  "timestamp": "2025-10-30T20:30:00.000Z",
  "message": "🤖 AgentMarket is alive and thriving"
}
```

---

### GET /api/health

Legacy health endpoint (redirects to `/api/pulse`).

**Authentication:** None required

**Response:** `308 Permanent Redirect` → `/api/pulse`

---

## Authentication Endpoints

### POST /api/auth/nonce

Request a nonce for SIWE authentication.

**Authentication:** None required

**Request Body:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "nonce": "abc123xyz789",
  "message": "Sign this message to authenticate"
}
```

**Errors:**
- `400` - Invalid address format
- `500` - Server error

---

### POST /api/auth/verify

Verify SIWE signature and get JWT token.

**Authentication:** None required

**Request Body:**
```json
{
  "message": "agentmarket.xyz wants you to sign in...",
  "signature": "0xdef456abc789..."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "address": "0x742d35cc6634c0532925a3b844bc9e7595beb5e5",
  "chainId": 84532,
  "message": "Authentication successful"
}
```

**Errors:**
- `400` - Missing message or signature
- `401` - Invalid signature or expired nonce
- `500` - Server error

---

### GET /api/auth/me

Get current authenticated user information.

**Authentication:** Required (JWT)

**Request:**
```bash
curl http://localhost:3333/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "user": {
    "address": "0x742d35cc6634c0532925a3b844bc9e7595beb5e5",
    "chainId": 84532
  }
}
```

**Errors:**
- `401` - Invalid or expired token

---

### POST /api/auth/logout

Logout (client-side token clearing).

**Authentication:** None required

**Request:**
```bash
curl -X POST http://localhost:3333/api/auth/logout
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Services Endpoints

### GET /api/services

Get all services in the marketplace.

**Authentication:** None required

**Request:**
```bash
curl http://localhost:3333/api/services
```

**Response:** `200 OK`
```json
{
  "success": true,
  "count": 3,
  "services": [
    {
      "id": "service-sentiment-analyzer",
      "name": "Sentiment Analyzer",
      "description": "Analyze sentiment of text",
      "provider": "AgentMarket",
      "endpoint": "http://localhost:3001/analyze",
      "capabilities": ["text-analysis", "sentiment"],
      "pricing": {
        "perRequest": "$0.02",
        "currency": "USDC",
        "network": "base-sepolia"
      },
      "reputation": {
        "totalJobs": 156,
        "successRate": 98.5,
        "avgResponseTime": "245ms",
        "rating": 4.8,
        "reviews": 42
      },
      "metadata": {
        "apiVersion": "v1",
        "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
        "paymentAddresses": {
          "84532": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
          "8453": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5"
        },
        "image": "🎭",
        "color": "#a855f7"
      },
      "created_at": "2025-10-25T10:30:00.000Z",
      "updated_at": "2025-10-28T15:45:00.000Z"
    }
  ]
}
```

**Query Parameters:**
- `limit` (optional) - Number of services to return (default: 50, max: 100)

---

### GET /api/services/my-services

Get services owned by the authenticated user.

**Authentication:** Required (JWT)

**Request:**
```bash
curl http://localhost:3333/api/services/my-services \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "count": 2,
  "services": [
    {
      "id": "service-abc-123",
      "name": "My Service",
      "provider": "Me",
      "metadata": {
        "walletAddress": "0x742d35cc6634c0532925a3b844bc9e7595beb5e5"
      }
    }
  ]
}
```

**Errors:**
- `401` - Invalid or expired token

---

### GET /api/services/:id

Get detailed information about a specific service.

**Authentication:** None required

**Path Parameters:**
- `id` (required) - Service ID

**Request:**
```bash
curl http://localhost:3333/api/services/service-sentiment-analyzer
```

**Response:** `200 OK`
```json
{
  "success": true,
  "service": {
    "id": "service-sentiment-analyzer",
    "name": "Sentiment Analyzer",
    "description": "Analyze the sentiment of text using advanced NLP",
    "provider": "AgentMarket",
    "endpoint": "http://localhost:3001/analyze",
    "capabilities": ["text-analysis", "sentiment", "nlp"],
    "pricing": {
      "perRequest": "$0.02",
      "currency": "USDC",
      "network": "base-sepolia"
    },
    "reputation": {
      "totalJobs": 156,
      "successRate": 98.5,
      "avgResponseTime": "245ms",
      "rating": 4.8,
      "reviews": 42
    },
    "metadata": {
      "apiVersion": "v1",
      "documentation": "https://docs.example.com",
      "supportEmail": "support@example.com",
      "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
      "paymentAddresses": {
        "84532": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5"
      },
      "image": "🎭",
      "color": "#a855f7"
    },
    "created_at": "2025-10-25T10:30:00.000Z",
    "updated_at": "2025-10-28T15:45:00.000Z"
  }
}
```

**Errors:**
- `404` - Service not found

---

### POST /api/services

Create a new service listing.

**Authentication:** Required (JWT)

**Rate Limit:** Registration tier (5 per hour)

**Request Body:**
```json
{
  "name": "Image Analyzer",
  "description": "Analyze images and detect objects",
  "provider": "MyCompany",
  "endpoint": "https://api.mycompany.com/analyze",
  "capabilities": ["image-analysis", "object-detection", "ai"],
  "pricing": {
    "perRequest": "$0.05",
    "currency": "USDC",
    "network": "base-sepolia"
  },
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
  "paymentAddresses": {
    "84532": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
    "8453": "0x9876543210987654321098765432109876543210"
  },
  "image": "🖼️",
  "color": "#3b82f6"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "service": {
    "id": "service-1730320000-abc123",
    "name": "Image Analyzer",
    "description": "Analyze images and detect objects",
    "provider": "MyCompany",
    "endpoint": "https://api.mycompany.com/analyze",
    "capabilities": ["image-analysis", "object-detection", "ai"],
    "pricing": {
      "perRequest": "$0.05",
      "currency": "USDC",
      "network": "base-sepolia"
    },
    "reputation": {
      "totalJobs": 0,
      "successRate": 0,
      "avgResponseTime": "0s",
      "rating": 5.0,
      "reviews": 0
    },
    "metadata": {
      "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
      "paymentAddresses": {
        "84532": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
        "8453": "0x9876543210987654321098765432109876543210"
      },
      "image": "🖼️",
      "color": "#3b82f6"
    },
    "created_at": "2025-10-30T20:30:00.000Z",
    "updated_at": "2025-10-30T20:30:00.000Z"
  },
  "message": "Service registered successfully"
}
```

**Errors:**
- `400` - Invalid input or validation error
- `401` - Invalid or expired token
- `429` - Rate limit exceeded (5 per hour)

---

### PUT /api/services/:id

Update an existing service (owner only).

**Authentication:** Required (JWT)

**Path Parameters:**
- `id` (required) - Service ID

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Service Name",
  "description": "Updated description",
  "endpoint": "https://new-endpoint.com",
  "capabilities": ["new-capability"],
  "pricing": {
    "perRequest": "$0.10"
  },
  "image": "🎨",
  "color": "#ef4444"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "service": {
    "id": "service-abc-123",
    "name": "Updated Service Name",
    "updated_at": "2025-10-30T20:35:00.000Z"
  },
  "message": "Service updated successfully"
}
```

**Errors:**
- `400` - Invalid input
- `401` - Invalid or expired token
- `403` - Not the service owner
- `404` - Service not found

---

### DELETE /api/services/:id

Delete a service (owner only).

**Authentication:** Required (JWT)

**Path Parameters:**
- `id` (required) - Service ID

**Request:**
```bash
curl -X DELETE http://localhost:3333/api/services/service-abc-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Service deleted successfully"
}
```

**Errors:**
- `401` - Invalid or expired token
- `403` - Not the service owner
- `404` - Service not found

---

## Search & Discovery

### POST /api/services/search

Advanced service search with filters.

**Authentication:** None required

**Request Body:**
```json
{
  "capabilities": ["image-analysis", "object-detection"],
  "maxPrice": "0.10",
  "minRating": 4.0,
  "offset": 0,
  "limit": 20
}
```

**All Parameters (optional):**
- `capabilities` - Array of capability tags (OR matching)
- `maxPrice` - Maximum price per request (string, e.g., "0.10")
- `minRating` - Minimum rating (1-5)
- `offset` - Pagination offset (default: 0)
- `limit` - Results per page (default: 20, max: 100)

**Response:** `200 OK`
```json
{
  "success": true,
  "count": 2,
  "offset": 0,
  "limit": 20,
  "services": [
    {
      "id": "service-image-analyzer",
      "name": "Image Analyzer",
      "capabilities": ["image-analysis", "object-detection"],
      "pricing": {
        "perRequest": "$0.05"
      },
      "reputation": {
        "rating": 4.8,
        "reviews": 42
      }
    }
  ]
}
```

**Errors:**
- `400` - Invalid query parameters

---

## Ratings & Reviews

### POST /api/services/:id/rate

Submit a rating for a service.

**Authentication:** None required (uses X-User-Id header)

**Path Parameters:**
- `id` (required) - Service ID

**Request Body:**
```json
{
  "transactionId": "tx-abc-123",
  "score": 5,
  "review": "Excellent service! Fast and accurate."
}
```

**Parameters:**
- `transactionId` (required) - Transaction ID from service purchase
- `score` (required) - Rating from 1 to 5
- `review` (optional) - Text review

**Response:** `200 OK`
```json
{
  "success": true,
  "service": {
    "id": "service-abc-123",
    "reputation": {
      "rating": 4.85,
      "reviews": 43
    }
  },
  "message": "Rating submitted successfully"
}
```

**Errors:**
- `400` - Invalid score or missing transactionId
- `404` - Service not found
- `429` - Rate limit exceeded

---

## Analytics & Stats

### GET /api/stats

Get marketplace statistics.

**Authentication:** None required

**Request:**
```bash
curl http://localhost:3333/api/stats
```

**Response:** `200 OK`
```json
{
  "success": true,
  "stats": {
    "services": 47,
    "transactions": 1234,
    "volume": 156.78,
    "agents": 47
  }
}
```

**Fields:**
- `services` - Total number of services
- `transactions` - Completed transactions
- `volume` - Total transaction volume in USDC
- `agents` - Active agents (mock data)

---

### GET /api/transactions/recent

Get recent completed transactions.

**Authentication:** None required

**Query Parameters:**
- `limit` (optional) - Number of transactions (default: 20, max: 100)

**Request:**
```bash
curl http://localhost:3333/api/transactions/recent?limit=10
```

**Response:** `200 OK`
```json
{
  "success": true,
  "transactions": [
    {
      "id": "tx-abc-123",
      "from": "Agent_tx-abc",
      "to": "Sentiment Analyzer",
      "amount": "$0.02",
      "timestamp": "2025-10-30T20:25:00.000Z"
    }
  ]
}
```

---

### GET /api/services/:id/audit

Get audit history for a service.

**Authentication:** None required

**Path Parameters:**
- `id` (required) - Service ID

**Query Parameters:**
- `limit` (optional) - Number of entries (default: 50, max: 200)

**Request:**
```bash
curl http://localhost:3333/api/services/service-abc-123/audit?limit=10
```

**Response:** `200 OK`
```json
{
  "success": true,
  "count": 5,
  "audit": [
    {
      "id": "audit-xyz-789",
      "entity_type": "service",
      "entity_id": "service-abc-123",
      "action": "updated",
      "changes": "{\"name\":{\"old\":\"Old Name\",\"new\":\"New Name\"}}",
      "performed_by": "0x742d35cc6634c0532925a3b844bc9e7595beb5e5",
      "timestamp": "2025-10-30T20:30:00.000Z"
    }
  ]
}
```

---

## MCP Tools

MCP tools are available when using Claude Desktop with AgentMarket configured as an MCP server.

## Tool 1: discover_services

Search for services by capabilities, price, or rating.

**Parameters:**
```typescript
{
  capabilities?: string[];    // Filter by capability tags
  maxPrice?: string;          // Maximum price (e.g., "0.10")
  minRating?: number;         // Minimum rating (1-5)
  limit?: number;             // Results limit (default: 20)
}
```

**Example Usage:**
```
User: "Find me image analysis services under $0.10"

Claude uses: discover_services({
  capabilities: ["image-analysis"],
  maxPrice: "0.10"
})
```

**Response:**
```json
{
  "count": 2,
  "services": [
    {
      "id": "service-image-analyzer",
      "name": "Image Analyzer",
      "description": "Analyze images and detect objects",
      "pricing": {
        "perRequest": "$0.05"
      },
      "reputation": {
        "rating": 4.8
      }
    }
  ]
}
```

---

## Tool 2: get_service_details

Get detailed information about a specific service.

**Parameters:**
```typescript
{
  serviceId: string;    // Service ID (required)
}
```

**Example Usage:**
```
User: "Tell me more about the sentiment analyzer"

Claude uses: get_service_details({
  serviceId: "service-sentiment-analyzer"
})
```

**Response:**
```json
{
  "id": "service-sentiment-analyzer",
  "name": "Sentiment Analyzer",
  "description": "Analyze sentiment of text using advanced NLP",
  "endpoint": "http://localhost:3001/analyze",
  "pricing": {
    "perRequest": "$0.02",
    "currency": "USDC"
  },
  "reputation": {
    "rating": 4.8,
    "reviews": 42,
    "totalJobs": 156
  },
  "capabilities": ["text-analysis", "sentiment", "nlp"]
}
```

---

## Tool 3: purchase_service

Purchase and execute a service (handles payment automatically).

**Parameters:**
```typescript
{
  serviceId: string;       // Service ID (required)
  requestData: any;        // Input for the service (required)
  maxPrice?: string;       // Max price willing to pay (optional)
}
```

**Example Usage:**
```
User: "Use the sentiment analyzer to analyze: 'This product is amazing!'"

Claude uses: purchase_service({
  serviceId: "service-sentiment-analyzer",
  requestData: {
    text: "This product is amazing!"
  },
  maxPrice: "0.05"
})
```

**What Happens:**
1. Check service price ($0.02)
2. Verify sufficient wallet balance
3. Make HTTP request to service → 402 Payment Required
4. Execute USDC payment on Base blockchain
5. Retry request with payment proof
6. Service validates payment → Returns results
7. Log transaction to database

**Response:**
```json
{
  "result": {
    "sentiment": "positive",
    "score": 0.95,
    "confidence": 0.98
  },
  "transaction": {
    "id": "tx-1730320000-abc123",
    "amount": "$0.02",
    "txHash": "0xabc123def456...",
    "status": "completed",
    "timestamp": "2025-10-30T20:30:00.000Z"
  },
  "receipt": {
    "service": "Sentiment Analyzer",
    "cost": "$0.02 USDC",
    "network": "base-sepolia"
  }
}
```

**Errors:**
```json
{
  "error": "Insufficient funds. Balance: $0.01, Required: $0.02"
}
```

---

## Tool 4: rate_service

Submit a rating for a completed service transaction.

**Parameters:**
```typescript
{
  serviceId: string;         // Service ID (required)
  transactionId: string;     // Transaction ID (required)
  score: number;             // Rating 1-5 (required)
  review?: string;           // Text review (optional)
}
```

**Example Usage:**
```
User: "I want to rate the service I just used. It was excellent, 5 stars."

Claude uses: rate_service({
  serviceId: "service-sentiment-analyzer",
  transactionId: "tx-1730320000-abc123",
  score: 5,
  review: "Excellent service! Fast and accurate."
})
```

**Response:**
```json
{
  "success": true,
  "message": "Rating submitted successfully",
  "service": {
    "id": "service-sentiment-analyzer",
    "name": "Sentiment Analyzer",
    "reputation": {
      "rating": 4.85,
      "reviews": 43
    }
  }
}
```

---

## Tool 5: wallet_balance

Check the current USDC balance in the wallet.

**Parameters:** None

**Example Usage:**
```
User: "Check my wallet balance"

Claude uses: wallet_balance()
```

**Response:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
  "balance": "10.50",
  "currency": "USDC",
  "network": "base-sepolia"
}
```

**Note:** This uses the wallet configured in your `.env` file (CDP API keys).

---

## Tool 6: list_transactions

View transaction history.

**Parameters:**
```typescript
{
  limit?: number;      // Number of transactions (default: 20)
  status?: string;     // Filter by status: "completed", "pending", "failed"
}
```

**Example Usage:**
```
User: "Show my last 10 transactions"

Claude uses: list_transactions({
  limit: 10
})
```

**Response:**
```json
{
  "count": 10,
  "transactions": [
    {
      "id": "tx-1730320000-abc123",
      "serviceId": "service-sentiment-analyzer",
      "serviceName": "Sentiment Analyzer",
      "amount": "$0.02",
      "currency": "USDC",
      "status": "completed",
      "txHash": "0xabc123def456...",
      "timestamp": "2025-10-30T20:30:00.000Z"
    }
  ]
}
```

---

## Tool 7: list_services

Browse all services in the marketplace.

**Parameters:**
```typescript
{
  limit?: number;      // Number of services (default: 50, max: 100)
}
```

**Example Usage:**
```
User: "Show me all available services"

Claude uses: list_services({
  limit: 50
})
```

**Response:**
```json
{
  "count": 3,
  "services": [
    {
      "id": "service-sentiment-analyzer",
      "name": "Sentiment Analyzer",
      "description": "Analyze sentiment of text",
      "pricing": {
        "perRequest": "$0.02"
      },
      "reputation": {
        "rating": 4.8
      },
      "capabilities": ["text-analysis", "sentiment"]
    }
  ]
}
```

---

## WebSocket Events

AgentMarket provides real-time updates via Socket.IO.

### Connecting

**Endpoint:** `ws://localhost:3333`

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3333');

socket.on('connect', () => {
  console.log('Connected to AgentMarket');
});
```

### Events (Server → Client)

#### initial-stats

Sent when client connects.

**Payload:**
```json
{
  "services": 47
}
```

---

#### new-service

Emitted when a new service is registered.

**Payload:**
```json
{
  "id": "service-abc-123",
  "name": "New Service",
  "provider": "Provider",
  "capabilities": ["capability"],
  "pricing": {
    "perRequest": "$0.05"
  }
}
```

---

#### service-updated

Emitted when a service is updated.

**Payload:**
```json
{
  "id": "service-abc-123",
  "name": "Updated Name",
  "updated_at": "2025-10-30T20:30:00.000Z"
}
```

---

#### service-deleted

Emitted when a service is deleted.

**Payload:**
```json
{
  "id": "service-abc-123"
}
```

---

#### new-transaction

Emitted when a transaction completes.

**Payload:**
```json
{
  "id": "tx-abc-123",
  "serviceId": "service-abc-123",
  "amount": "$0.02",
  "status": "completed"
}
```

---

## Code Examples

### JavaScript / Node.js

#### Authenticate and Get Services

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3333';
let authToken = null;

// Step 1: Request nonce
async function getNonce(address) {
  const response = await axios.post(`${API_BASE}/api/auth/nonce`, {
    address
  });
  return response.data.nonce;
}

// Step 2: Sign message with wallet (using ethers.js)
const { ethers } = require('ethers');

async function signMessage(message, privateKey) {
  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(message);
  return signature;
}

// Step 3: Verify signature and get token
async function authenticate(message, signature) {
  const response = await axios.post(`${API_BASE}/api/auth/verify`, {
    message,
    signature
  });
  authToken = response.data.token;
  return authToken;
}

// Step 4: Get all services
async function getServices() {
  const response = await axios.get(`${API_BASE}/api/services`);
  return response.data.services;
}

// Step 5: Create a service (authenticated)
async function createService(serviceData) {
  const response = await axios.post(
    `${API_BASE}/api/services`,
    serviceData,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );
  return response.data.service;
}

// Usage
(async () => {
  const address = '0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5';
  const privateKey = 'YOUR_PRIVATE_KEY';

  // Authenticate
  const nonce = await getNonce(address);
  const message = `Sign this nonce: ${nonce}`;
  const signature = await signMessage(message, privateKey);
  await authenticate(message, signature);

  console.log('Authenticated!');

  // Get services
  const services = await getServices();
  console.log(`Found ${services.length} services`);

  // Create a service
  const newService = await createService({
    name: 'My Service',
    description: 'My awesome service',
    provider: 'Me',
    endpoint: 'https://myservice.com',
    capabilities: ['test'],
    pricing: {
      perRequest: '$0.01',
      currency: 'USDC',
      network: 'base-sepolia'
    },
    walletAddress: address,
    paymentAddresses: {
      '84532': address
    }
  });

  console.log('Created service:', newService.id);
})();
```

---

### Python

#### Search Services

```python
import requests

API_BASE = 'http://localhost:3333'

def search_services(capabilities=None, max_price=None, min_rating=None):
    """Search for services with filters"""
    payload = {}

    if capabilities:
        payload['capabilities'] = capabilities
    if max_price:
        payload['maxPrice'] = max_price
    if min_rating:
        payload['minRating'] = min_rating

    response = requests.post(f'{API_BASE}/api/services/search', json=payload)
    response.raise_for_status()
    return response.json()

def get_service_details(service_id):
    """Get details about a service"""
    response = requests.get(f'{API_BASE}/api/services/{service_id}')
    response.raise_for_status()
    return response.json()

def rate_service(service_id, transaction_id, score, review=None):
    """Rate a service"""
    payload = {
        'transactionId': transaction_id,
        'score': score
    }

    if review:
        payload['review'] = review

    response = requests.post(
        f'{API_BASE}/api/services/{service_id}/rate',
        json=payload
    )
    response.raise_for_status()
    return response.json()

# Usage
if __name__ == '__main__':
    # Search for image analysis services
    results = search_services(
        capabilities=['image-analysis'],
        max_price='0.10',
        min_rating=4.0
    )

    print(f"Found {results['count']} services")

    for service in results['services']:
        print(f"- {service['name']}: {service['pricing']['perRequest']}")

        # Get full details
        details = get_service_details(service['id'])
        print(f"  Rating: {details['service']['reputation']['rating']}/5")
        print(f"  Reviews: {details['service']['reputation']['reviews']}")
```

---

### cURL

#### Complete Workflow

```bash
# 1. Get health status
curl http://localhost:3333/api/pulse

# 2. Get all services
curl http://localhost:3333/api/services

# 3. Search for services
curl -X POST http://localhost:3333/api/services/search \
  -H "Content-Type: application/json" \
  -d '{
    "capabilities": ["text-analysis"],
    "maxPrice": "0.05",
    "minRating": 4.0
  }'

# 4. Get service details
curl http://localhost:3333/api/services/service-sentiment-analyzer

# 5. Get marketplace stats
curl http://localhost:3333/api/stats

# 6. Get recent transactions
curl http://localhost:3333/api/transactions/recent?limit=10

# 7. Request authentication nonce
curl -X POST http://localhost:3333/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5"
  }'

# 8. Verify signature (after signing with wallet)
curl -X POST http://localhost:3333/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "agentmarket.xyz wants you to...",
    "signature": "0xabc123..."
  }'

# 9. Create a service (authenticated)
curl -X POST http://localhost:3333/api/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "My Service",
    "description": "My service description",
    "provider": "Me",
    "endpoint": "https://myservice.com",
    "capabilities": ["test"],
    "pricing": {
      "perRequest": "$0.01",
      "currency": "USDC",
      "network": "base-sepolia"
    },
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
    "paymentAddresses": {
      "84532": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5"
    }
  }'

# 10. Update a service (owner only)
curl -X PUT http://localhost:3333/api/services/service-abc-123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Updated Name",
    "pricing": {
      "perRequest": "$0.02"
    }
  }'

# 11. Delete a service (owner only)
curl -X DELETE http://localhost:3333/api/services/service-abc-123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 12. Rate a service
curl -X POST http://localhost:3333/api/services/service-abc-123/rate \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "tx-xyz-789",
    "score": 5,
    "review": "Excellent service!"
  }'

# 13. Get audit history
curl http://localhost:3333/api/services/service-abc-123/audit?limit=10
```

---

## Postman Collection

A Postman collection is available for easy API testing:

**Import URL:**
```
https://www.postman.com/agentmarket/workspace/agentmarket-api
```

**Or manually create:**

1. Create a new collection "AgentMarket API"
2. Add environment variables:
   - `base_url`: `http://localhost:3333`
   - `auth_token`: (will be set after authentication)
3. Import all endpoints from this documentation

---

## API Versioning

**Current Version:** v1 (default)

**Version Header:** `Accept: application/vnd.agentmarket.v1+json`

Future versions will use the same header with different version numbers.

---

## Support

**Documentation:** https://docs.agentmarket.xyz
**GitHub Issues:** https://github.com/agentmarket/agentmarket-mcp/issues
**Discord:** [coming soon]
**Email:** support@agentmarket.xyz

---

**Last Updated:** 2025-10-30
**API Version:** 1.0.0
