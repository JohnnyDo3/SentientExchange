# AgentMarket Architecture

> **Generated:** 2025-11-04
> **Version:** 1.0.0
> **Last Updated:** Automated documentation generation

## Overview

AgentMarket is an AI-native service marketplace that enables autonomous AI agents to discover, purchase, and provide services using the **x402 payment protocol** and **Model Context Protocol (MCP)**. The system consists of three main components:

1. **MCP Server** - stdio-based server for Claude Desktop integration
2. **API Server** - REST API + WebSocket for real-time orchestration
3. **Web Dashboard** - Next.js frontend with 3D visualizations

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        CD[Claude Desktop]
        WEB[Web Dashboard]
        AGENT[AI Agents]
    end

    subgraph "AgentMarket Platform"
        MCP[MCP Server<br/>stdio transport]
        API[API Server<br/>Express + WebSocket]
        ORCH[Master Orchestrator<br/>Multi-agent coordination]
    end

    subgraph "Core Services"
        REG[Service Registry<br/>In-memory + SQLite]
        PAY[Payment Router<br/>x402 + Direct Solana]
        DB[(SQLite Database)]
    end

    subgraph "External Services"
        SOL[Solana Blockchain<br/>USDC Payments]
        X402[x402 Services<br/>AI Providers]
    end

    CD -->|MCP Protocol| MCP
    WEB -->|HTTP/WebSocket| API
    AGENT -->|HTTP| API

    MCP --> REG
    API --> REG
    API --> ORCH

    ORCH --> PAY
    MCP --> PAY

    REG --> DB
    PAY --> SOL
    PAY --> X402

    style MCP fill:#a855f7
    style API fill:#ec4899
    style ORCH fill:#10b981
    style REG fill:#3b82f6
    style PAY fill:#f59e0b
```

### Component Description

| Component | Purpose | Technology |
|-----------|---------|------------|
| **MCP Server** | Provides tools for Claude Desktop to discover and purchase services | MCP SDK, stdio transport |
| **API Server** | REST API and WebSocket for web dashboard and external integrations | Express.js, Socket.IO |
| **Master Orchestrator** | Coordinates complex multi-service workflows | Custom orchestration engine |
| **Service Registry** | Manages service listings with caching | SQLite + in-memory cache |
| **Payment Router** | Routes payments via x402 or direct Solana transfers | Solana Web3.js, x402 protocol |
| **Web Dashboard** | Real-time visualization of agent marketplace | Next.js 14, React Three Fiber |

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant MCP as MCP Server
    participant Registry as Service Registry
    participant Payment as Payment Router
    participant Solana as Solana Blockchain
    participant Service as AI Service

    User->>MCP: discover_services(capability)
    MCP->>Registry: searchServices(filters)
    Registry->>Registry: Query cache + DB
    Registry-->>MCP: Filtered services
    MCP-->>User: Service listings

    User->>MCP: purchase_service(serviceId, data)
    MCP->>Payment: initiatePayment(service)
    Payment->>Service: HTTP Request
    Service-->>Payment: 402 Payment Required
    Payment-->>MCP: Payment instruction
    MCP-->>User: Payment details (amount, recipient)

    User->>User: Execute payment in wallet
    User->>MCP: submit_payment(txSignature)
    MCP->>Payment: verifyPayment(txSignature)
    Payment->>Solana: Verify transaction on-chain
    Solana-->>Payment: Transaction confirmed
    Payment->>Service: HTTP Request + payment proof
    Service-->>Payment: Service result
    Payment->>Registry: logTransaction(txId)
    Payment-->>MCP: Service response
    MCP-->>User: Result + transaction ID

    User->>MCP: rate_service(txId, rating)
    MCP->>Registry: submitRating(txId, rating)
    Registry->>Registry: Update reputation
    Registry-->>MCP: Updated service stats
    MCP-->>User: Rating confirmed
```

## Payment Flow

### x402 Protocol Flow

```mermaid
sequenceDiagram
    participant Agent
    participant Router as Payment Router
    participant Service as x402 Service
    participant Chain as Solana Blockchain

    Note over Agent,Chain: Discovery & Initial Request

    Agent->>Router: Request service
    Router->>Service: POST /service/endpoint

    alt Service Requires Payment
        Service-->>Router: 402 Payment Required<br/>{amount, recipient, currency}
        Router-->>Agent: Payment instruction

        Note over Agent: User executes payment<br/>in their own wallet

        Agent->>Chain: Transfer USDC
        Chain-->>Agent: Transaction signature
        Agent->>Router: submit_payment(txSignature)

        Router->>Chain: Verify transaction
        Chain-->>Router: Confirmed (amount, recipient)

        Router->>Service: POST /service/endpoint<br/>X-Payment-Signature: {txSig}
        Service->>Chain: Verify payment
        Chain-->>Service: Payment valid
        Service-->>Router: Service result
        Router-->>Agent: Result + receipt
    else Service Is Free
        Service-->>Router: 200 OK + Result
        Router-->>Agent: Result
    end
```

### Direct Solana Transfer Flow

```mermaid
sequenceDiagram
    participant Agent
    participant Router
    participant Solana
    participant Provider as Service Provider

    Agent->>Router: Request paid service
    Router->>Router: Check service pricing
    Router-->>Agent: Payment required<br/>(amount, provider wallet)

    Agent->>Solana: Direct USDC transfer<br/>to provider wallet
    Solana-->>Agent: Transaction signature

    Agent->>Router: submit_payment(txSig)
    Router->>Solana: Verify on-chain
    Solana-->>Router: Confirmed
    Router->>Provider: Service request
    Provider-->>Router: Result
    Router-->>Agent: Service result + receipt
```

## Database Schema

```mermaid
erDiagram
    SERVICES ||--o{ TRANSACTIONS : "used_in"
    SERVICES ||--o{ RATINGS : "receives"
    TRANSACTIONS ||--o{ RATINGS : "rated_by"

    SERVICES {
        string id PK "UUID"
        string name "Service name"
        string description "Description"
        string provider "Wallet address"
        string endpoint "API URL"
        json capabilities "Array of capabilities"
        json pricing "Pricing details"
        json reputation "Stats and ratings"
        json metadata "Additional info"
        datetime createdAt
        datetime updatedAt
    }

    TRANSACTIONS {
        string id PK "UUID"
        string serviceId FK "References services.id"
        string provider "Provider wallet"
        string buyer "Buyer wallet"
        string txSignature "Solana tx signature"
        string amount "Payment amount"
        string currency "USDC"
        string status "pending/completed/failed"
        json requestData "Service input"
        json responseData "Service output"
        datetime createdAt
        datetime completedAt
    }

    RATINGS {
        string id PK "UUID"
        string transactionId FK "References transactions.id"
        string serviceId FK "References services.id"
        integer rating "1-5"
        string review "Optional text review"
        string ratedBy "Buyer wallet"
        datetime createdAt
    }
```

### Table Descriptions

#### services
Stores all registered AI service listings with metadata, pricing, and reputation.

**Key Features:**
- JSON fields for flexible metadata
- Capabilities array for multi-tag search
- Reputation tracking (totalJobs, successRate, rating)
- Multi-chain payment addresses support

**Indexes:**
- `idx_capabilities` - Fast capability-based search
- `idx_provider` - List services by provider

#### transactions
Records all service purchases and payment history.

**Key Features:**
- Links to services and stores payment proofs
- Tracks request/response data for debugging
- Status tracking (pending → completed/failed)
- Solana transaction signatures for verification

**Indexes:**
- `idx_service_transactions` - Get service history
- `idx_buyer_transactions` - Get user purchase history
- `idx_tx_signature` - Verify transaction uniqueness

#### ratings
User reviews and ratings for completed services.

**Key Features:**
- Linked to transactions (can only rate completed purchases)
- 1-5 star rating system
- Optional text reviews
- Used to calculate service reputation

**Indexes:**
- `idx_service_ratings` - Calculate average rating
- `idx_transaction_ratings` - Prevent duplicate ratings

## Component Relationships

```mermaid
classDiagram
    class AgentMarketServer {
        -Server mcpServer
        -Database db
        -ServiceRegistry registry
        -PaymentRouter paymentRouter
        +initialize()
        +start()
        +shutdown()
    }

    class ServiceRegistry {
        -Database db
        -Map~string Service~ cache
        +registerService(service)
        +getService(id)
        +searchServices(query)
        +updateReputation(serviceId)
    }

    class PaymentRouter {
        -X402Provider x402Provider
        -DirectSolanaProvider directProvider
        -string mode
        +executePayment(service, data)
        +verifyPayment(txSignature)
    }

    class MasterOrchestrator {
        -ServiceRegistry registry
        -PaymentRouter paymentRouter
        +executeComplexTask(query)
        -decompose Task(query)
        -executeSubtasks(subtasks)
    }

    class Database {
        -sqlite3 db
        +initialize()
        +query(sql, params)
        +transaction(fn)
    }

    class X402Provider {
        -string facilitatorUrl
        +requestService(endpoint, data)
        +executePayment(instruction)
    }

    class DirectSolanaProvider {
        -Connection connection
        -Keypair wallet
        +transfer(recipient, amount)
        +verifyTransaction(signature)
    }

    AgentMarketServer --> ServiceRegistry
    AgentMarketServer --> PaymentRouter
    AgentMarketServer --> Database
    MasterOrchestrator --> ServiceRegistry
    MasterOrchestrator --> PaymentRouter
    ServiceRegistry --> Database
    PaymentRouter --> X402Provider
    PaymentRouter --> DirectSolanaProvider

    style AgentMarketServer fill:#a855f7
    style ServiceRegistry fill:#3b82f6
    style PaymentRouter fill:#f59e0b
    style MasterOrchestrator fill:#10b981
```

## Technology Stack

### Backend
| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime environment | 22+ |
| **TypeScript** | Type-safe development | 5.9+ |
| **MCP SDK** | Model Context Protocol | 1.20+ |
| **Express.js** | REST API server | 5.1+ |
| **Socket.IO** | WebSocket for real-time | 4.8+ |
| **SQLite** | Embedded database | 5.1+ |
| **Solana Web3.js** | Blockchain interaction | 1.98+ |

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| **Next.js** | React framework | 14.2+ |
| **React** | UI library | 18+ |
| **Three.js** | 3D graphics | 0.164+ |
| **React Three Fiber** | React renderer for Three.js | 8.16+ |
| **Framer Motion** | Animations | Latest |
| **TailwindCSS** | Styling | 3+ |

### Blockchain
| Technology | Purpose |
|------------|---------|
| **Solana** | Layer 1 blockchain |
| **USDC** | Stablecoin for payments |
| **x402 Protocol** | HTTP-based micropayments |

### DevOps
| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Railway** | Cloud deployment |
| **GitHub Actions** | CI/CD |

## Key Design Patterns

### 1. Client-Side Payment Execution
- Server provides payment instructions
- Client executes payment in their own wallet
- Server verifies payment on-chain
- Eliminates need for server to custody user funds

### 2. Hybrid Payment Mode
- Try x402 protocol first (PayAI facilitator)
- Fallback to direct Solana transfers
- Automatic failover for reliability

### 3. In-Memory Caching
- Service registry loads all services into memory
- Reduces database queries
- Synced on updates
- Fast search and filtering

### 4. Multi-Transport Architecture
- MCP Server: stdio for Claude Desktop
- API Server: HTTP/WebSocket for web dashboard
- Same core services, different interfaces

### 5. Reputation System
- Transaction-based ratings
- Prevents fake reviews (must purchase first)
- Real-time reputation updates
- Influences service discovery ranking

## Deployment Architecture

```mermaid
graph TB
    subgraph "Railway Cloud"
        WEB[Next.js Web App<br/>Port 8080]
        API[API Server<br/>Port 8081]
        DATA[(SQLite<br/>Persistent Volume)]
    end

    subgraph "Client"
        CLAUDE[Claude Desktop<br/>MCP Client]
        BROWSER[Web Browser]
    end

    subgraph "External"
        SOL[Solana RPC<br/>Blockchain]
        SERVICES[x402 Services<br/>AI Providers]
    end

    BROWSER -->|HTTPS| WEB
    WEB -->|Internal| API
    CLAUDE -.->|stdio<br/>(local only)| MCP[MCP Server<br/>Not deployed]

    API --> DATA
    API --> SOL
    API --> SERVICES

    style WEB fill:#ec4899
    style API fill:#a855f7
    style DATA fill:#3b82f6
```

### Environment Separation

| Environment | MCP Server | API Server | Web Dashboard |
|-------------|------------|------------|---------------|
| **Local Dev** | ✅ (stdio) | ✅ (localhost:8081) | ✅ (localhost:3000) |
| **Railway** | ❌ (stdio incompatible) | ✅ (Port 8081) | ✅ (Port 8080) |

**Note:** MCP Server is designed for local use with Claude Desktop only. Railway deployment serves the API Server and Web Dashboard.

## Security Considerations

### 1. Payment Security
- No private key storage in server
- Client-side wallet management
- On-chain payment verification
- Transaction replay prevention

### 2. API Security
- JWT authentication for web API
- Rate limiting per endpoint
- CORS configuration
- Helmet.js security headers

### 3. Database Security
- Parameterized queries (SQL injection prevention)
- Transaction-level locking
- Input validation with Zod schemas

### 4. Service Security
- Provider wallet verification
- Service endpoint validation
- Request payload sanitization

## Scalability Considerations

### Current Design (Single Instance)
- In-memory cache (limited by RAM)
- SQLite (single-writer limitation)
- Suitable for: 100s of services, 1000s of transactions/day

### Future Scaling Options
1. **Horizontal Scaling**
   - Replace SQLite with PostgreSQL
   - Redis for distributed caching
   - Load balancer for multiple API instances

2. **Database Optimization**
   - Read replicas for queries
   - Write-master, read-slaves architecture
   - Database connection pooling

3. **Caching Layer**
   - Redis for service listings
   - CDN for static assets
   - Service worker caching

---

**Next Steps:**
- [API Documentation](./API.md) - Detailed API reference
- [Development Guide](./DEVELOPMENT.md) - Setup and development workflow
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions
