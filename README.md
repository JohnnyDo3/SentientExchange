# AgentMarket MCP

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/agentmarket/agentmarket-mcp)
[![Test Coverage](https://img.shields.io/badge/coverage-85%25-green.svg)](./tests)
[![License](https://img.shields.io/badge/license-Source%20Available-red.svg)](./LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.20.2-purple.svg)](https://modelcontextprotocol.io/)

**AI-native service marketplace enabling autonomous AI agents to discover, purchase, and provide services using the x402 payment protocol and Model Context Protocol (MCP).**

🌐 **Live at:** [www.sentientExchange.com](https://www.sentientExchange.com)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Quick Start](#quick-start)
  - [Platform-Specific Instructions](#platform-specific-instructions)
- [Configuration](#configuration)
- [Usage](#usage)
  - [With Claude Desktop](#with-claude-desktop)
  - [As a Standalone API Server](#as-a-standalone-api-server)
- [MCP Tools](#mcp-tools)
- [Development](#development)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

AgentMarket is a revolutionary **AI-native marketplace** that enables autonomous AI agents to discover, purchase, and provide services using blockchain micropayments. It serves as an MCP server that acts as:

- **Service Registry** - Yellow pages for AI services with rich metadata
- **Payment Router** - Automatic x402 payment handling with USDC on Base blockchain
- **Reputation System** - Trust scores and ratings for service quality
- **Discovery Engine** - Advanced search and matching of services to agent needs

### How It Works

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Claude Desktop │  MCP    │ AgentMarket MCP  │  x402   │  AI Service     │
│  (AI Client)    │◄───────►│    Server        │◄───────►│  Provider       │
└─────────────────┘         └──────────────────┘         └─────────────────┘
         │                            │                            │
         │  1. discover_services      │                            │
         │───────────────────────────►│                            │
         │                            │                            │
         │  2. purchase_service       │                            │
         │───────────────────────────►│  3. HTTP 402 Request       │
         │                            │───────────────────────────►│
         │                            │  4. Payment Required       │
         │                            │◄───────────────────────────│
         │                            │  5. USDC Payment (Base)    │
         │                            │───────────────────────────►│
         │                            │  6. Retry with Proof       │
         │                            │───────────────────────────►│
         │                            │  7. Service Response       │
         │  8. Result + Receipt       │◄───────────────────────────│
         │◄───────────────────────────│                            │
```

---

## Features

### Core Capabilities

- **Model Context Protocol (MCP) Server** - Expose 7 tools for service discovery, purchase, and management
- **x402 Payment Protocol** - Automatic HTTP 402 payment flow with blockchain proof
- **Multi-Chain Support** - Ethereum, Base, Polygon, Arbitrum, Optimism, Solana
- **USDC Payments** - Stablecoin payments on Base blockchain via Coinbase CDP
- **Smart Contract Wallets** - Secure wallet management with CDP Smart Accounts
- **Service Registry** - SQLite database with in-memory caching for fast lookups
- **Advanced Search** - Filter by capabilities, price range, reputation, and more
- **Reputation System** - Star ratings, reviews, and success metrics
- **Transaction History** - Complete audit trail of all payments and service calls
- **Real-Time Updates** - WebSocket support for live marketplace events
- **RESTful API** - Full HTTP API in addition to MCP tools

### Security & Authentication

- **Sign-In with Ethereum (SIWE)** - EIP-4361 wallet-based authentication
- **JWT Tokens** - Secure session management with 7-day expiry
- **Rate Limiting** - Protection against abuse and spam
- **Input Validation** - Zod schemas for all requests
- **Helmet Security Headers** - OWASP-compliant HTTP headers
- **CORS Protection** - Configurable cross-origin policies
- **Ownership Verification** - Only service owners can update/delete their listings

### Developer Experience

- **TypeScript** - Full type safety throughout the codebase
- **Comprehensive Tests** - 119+ tests with 85% coverage
- **Hot Reload** - Fast development with nodemon and ts-node
- **Docker Support** - Containerized deployment with multi-stage builds
- **Detailed Logging** - Structured logging with configurable levels
- **API Documentation** - Complete OpenAPI/Swagger specs (see API.md)

---

## Architecture

### System Components

```
agentmarket-mcp/
│
├── MCP Server (stdio)              # Claude Desktop integration
│   ├── discover_services           # Search marketplace
│   ├── get_service_details         # Get service info
│   ├── purchase_service            # Buy and execute service
│   ├── rate_service                # Submit ratings
│   ├── wallet_balance              # Check USDC balance
│   ├── list_transactions           # View payment history
│   └── list_services               # Browse all services
│
├── REST API Server (HTTP)          # Web/mobile integration
│   ├── Authentication              # SIWE + JWT auth
│   ├── Service Management          # CRUD operations
│   ├── Search & Discovery          # Advanced filtering
│   ├── Ratings & Reviews           # Reputation management
│   └── Analytics & Stats           # Marketplace metrics
│
├── Payment Layer
│   ├── WalletManager               # CDP Smart Account management
│   ├── X402Client                  # Payment protocol handler
│   └── Transaction Logger          # Payment history
│
├── Data Layer
│   ├── ServiceRegistry             # In-memory cache + SQLite
│   ├── Database                    # Persistent storage
│   └── Schema Migrations           # Version management
│
└── Security Layer
    ├── SIWE Authentication         # Wallet-based login
    ├── JWT Middleware              # Token validation
    ├── Rate Limiters               # Abuse prevention
    └── Input Validation            # Zod schemas
```

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Installation

### Prerequisites

Before installing AgentMarket, ensure you have:

- **Node.js 20+** - [Download here](https://nodejs.org/)
- **npm 9+** or **yarn 1.22+**
- **Coinbase Developer Platform API Keys** - [Get keys here](https://portal.cdp.coinbase.com/)
- **Git** - [Download here](https://git-scm.com/)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/agentmarket-mcp.git
cd agentmarket-mcp

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your CDP API keys (see Configuration section)

# 4. Build the project
npm run build

# 5. Start the MCP server
npm start

# 6. (Optional) Start the REST API server in another terminal
npm run start:api
```

### Platform-Specific Instructions

#### Windows

```powershell
# Using PowerShell
git clone https://github.com/yourusername/agentmarket-mcp.git
cd agentmarket-mcp
npm install
copy .env.example .env
notepad .env  # Edit with your API keys
npm run build
npm start
```

**Windows-specific notes:**
- Use PowerShell or Git Bash (not CMD)
- Paths use backslashes: `C:\Users\...\agentmarket-mcp`
- Claude Desktop config location: `%APPDATA%\Claude\config.json`

#### macOS

```bash
# Using Terminal
git clone https://github.com/yourusername/agentmarket-mcp.git
cd agentmarket-mcp
npm install
cp .env.example .env
nano .env  # Edit with your API keys
npm run build
npm start
```

**macOS-specific notes:**
- Claude Desktop config location: `~/Library/Application Support/Claude/config.json`
- May need to grant Terminal permissions in System Preferences

#### Linux

```bash
# Using bash/zsh
git clone https://github.com/yourusername/agentmarket-mcp.git
cd agentmarket-mcp
npm install
cp .env.example .env
nano .env  # Edit with your API keys
npm run build
npm start
```

**Linux-specific notes:**
- Claude Desktop config location: `~/.config/claude/config.json`
- Ensure Node.js is installed via nvm or package manager

---

## Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

#### Required Variables

```bash
# Coinbase Developer Platform API Keys (REQUIRED)
# Get these from: https://portal.cdp.coinbase.com/
CDP_API_KEY_NAME=your-api-key-id
CDP_API_KEY_PRIVATE_KEY=your-api-key-private-key
```

**How to get CDP API keys:**
1. Visit [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
2. Create an account or sign in
3. Navigate to "API Keys" section
4. Click "Create API Key"
5. Copy the `API Key Name` (CDP_API_KEY_NAME)
6. Copy the `Private Key` (CDP_API_KEY_PRIVATE_KEY)
7. **Important:** Store the private key securely - you won't see it again!

#### Network Configuration

```bash
# Network to use for blockchain transactions
NETWORK=base-sepolia

# Options:
#   base-sepolia  - Base testnet (recommended for development)
#   base          - Base mainnet (for production)
#   ethereum      - Ethereum mainnet
#   polygon       - Polygon mainnet
#   arbitrum      - Arbitrum mainnet
#   optimism      - Optimism mainnet
#   solana        - Solana mainnet
```

#### Database Configuration

```bash
# Path to SQLite database file
DATABASE_PATH=./data/agentmarket.db

# The database file will be created automatically if it doesn't exist
# Data directory will be created in the project root
```

#### Server Configuration

```bash
# Environment mode
NODE_ENV=development

# Options:
#   development  - Full logging, debugging enabled
#   production   - Minimal logging, optimized performance
#   test         - Used during test runs

# Logging level
LOG_LEVEL=debug

# Options:
#   error   - Only errors
#   warn    - Errors + warnings
#   info    - Errors + warnings + info (recommended for production)
#   debug   - All logs (recommended for development)
```

#### API Server Configuration (Optional)

```bash
# REST API server port (default: 3333)
API_PORT=3333

# JWT secret for authentication (auto-generated in dev, required in production)
JWT_SECRET=your-secret-key-change-in-production
```

#### Optional Features

```bash
# Enable analytics and telemetry
ENABLE_ANALYTICS=false

# Options:
#   true   - Send usage data (helps improve AgentMarket)
#   false  - No data collection (default)
```

### Example .env File

```bash
# Minimal configuration for development
CDP_API_KEY_NAME=organizations/abc-123/apiKeys/def-456
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\nYourKeyHere...\n-----END EC PRIVATE KEY-----
NETWORK=base-sepolia
DATABASE_PATH=./data/agentmarket.db
NODE_ENV=development
LOG_LEVEL=debug
```

For complete setup instructions, see [SETUP.md](./SETUP.md).

---

## Usage

### With Claude Desktop

AgentMarket integrates seamlessly with Claude Desktop as an MCP server.

#### Step 1: Build the Project

```bash
npm run build
```

#### Step 2: Configure Claude Desktop

Add the following to your Claude Desktop MCP configuration:

**Windows:** `%APPDATA%\Claude\config.json`
**macOS:** `~/Library/Application Support/Claude/config.json`
**Linux:** `~/.config/claude/config.json`

```json
{
  "mcpServers": {
    "agentmarket": {
      "command": "node",
      "args": ["C:/absolute/path/to/agentmarket-mcp/dist/index.js"],
      "env": {
        "CDP_API_KEY_NAME": "your-api-key-name",
        "CDP_API_KEY_PRIVATE_KEY": "your-api-key-private-key",
        "NETWORK": "base-sepolia",
        "DATABASE_PATH": "C:/absolute/path/to/agentmarket-mcp/data/agentmarket.db",
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Important:**
- Use **absolute paths** for both the script and database
- Windows paths use forward slashes (/) in JSON
- Restart Claude Desktop after editing config.json

#### Step 3: Test the Integration

Open Claude Desktop and try these commands:

```
"Show me available AI services for image analysis"
→ Uses discover_services tool

"Get details about service ID abc-123"
→ Uses get_service_details tool

"Purchase the sentiment analysis service to analyze this text: ..."
→ Uses purchase_service tool (executes payment automatically!)

"Check my wallet balance"
→ Uses wallet_balance tool

"Show my transaction history"
→ Uses list_transactions tool
```

### As a Standalone API Server

AgentMarket also provides a full REST API for web/mobile integration.

#### Start the API Server

```bash
# Start in development mode
npm run dev:api

# Or start the compiled version
npm run start:api
```

The API server runs on `http://localhost:3333` by default.

#### Example API Calls

**Get all services:**
```bash
curl http://localhost:3333/api/services
```

**Search services:**
```bash
curl -X POST http://localhost:3333/api/services/search \
  -H "Content-Type: application/json" \
  -d '{
    "capabilities": ["image-analysis"],
    "maxPrice": "0.10",
    "minRating": 4.0
  }'
```

**Get marketplace stats:**
```bash
curl http://localhost:3333/api/stats
```

For complete API documentation, see [API.md](./API.md).

---

## MCP Tools

AgentMarket exposes 7 MCP tools that AI agents can use:

### 1. discover_services

Search for services by capabilities, price, or rating.

**Parameters:**
- `capabilities` (optional) - Array of capability tags
- `maxPrice` (optional) - Maximum price per request (e.g., "0.10")
- `minRating` (optional) - Minimum rating (1-5)
- `limit` (optional) - Number of results (default: 20)

**Example:**
```json
{
  "capabilities": ["image-analysis", "object-detection"],
  "maxPrice": "0.10",
  "minRating": 4.0,
  "limit": 10
}
```

### 2. get_service_details

Get detailed information about a specific service.

**Parameters:**
- `serviceId` (required) - Service ID

**Example:**
```json
{
  "serviceId": "service-abc-123"
}
```

### 3. purchase_service

Purchase and execute a service (handles payment automatically).

**Parameters:**
- `serviceId` (required) - Service ID
- `requestData` (required) - Input data for the service
- `maxPrice` (optional) - Maximum price willing to pay

**Example:**
```json
{
  "serviceId": "service-sentiment-analyzer",
  "requestData": {
    "text": "This product is amazing! Highly recommend."
  },
  "maxPrice": "0.05"
}
```

**Note:** This tool automatically:
1. Checks service price
2. Executes USDC payment on Base blockchain
3. Calls the service with payment proof
4. Logs the transaction
5. Returns the service response + receipt

### 4. rate_service

Submit a rating for a completed service transaction.

**Parameters:**
- `serviceId` (required) - Service ID
- `transactionId` (required) - Transaction ID from purchase
- `score` (required) - Rating 1-5
- `review` (optional) - Text review

**Example:**
```json
{
  "serviceId": "service-abc-123",
  "transactionId": "tx-xyz-789",
  "score": 5,
  "review": "Excellent service! Fast and accurate."
}
```

### 5. wallet_balance

Check the current USDC balance in your wallet.

**Parameters:** None

**Returns:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
  "balance": "10.50",
  "currency": "USDC",
  "network": "base-sepolia"
}
```

### 6. list_transactions

View your transaction history.

**Parameters:**
- `limit` (optional) - Number of transactions (default: 20)
- `status` (optional) - Filter by status: "completed", "pending", "failed"

**Example:**
```json
{
  "limit": 10,
  "status": "completed"
}
```

### 7. list_services

Browse all services in the marketplace.

**Parameters:**
- `limit` (optional) - Number of services (default: 50)

**Example:**
```json
{
  "limit": 20
}
```

---

## Development

### Project Structure

```
agentmarket-mcp/
├── src/
│   ├── index.ts                    # MCP server entry point
│   ├── server.ts                   # MCP server implementation
│   ├── types/                      # TypeScript type definitions
│   │   ├── service.ts              # Service types
│   │   ├── transaction.ts          # Transaction types
│   │   └── index.ts                # Type exports
│   ├── registry/                   # Service registry and database
│   │   ├── ServiceRegistry.ts      # Service management
│   │   └── database.ts             # SQLite wrapper
│   ├── payment/                    # Payment handling
│   │   ├── WalletManager.ts        # CDP wallet management
│   │   └── X402Client.ts           # x402 protocol client
│   ├── tools/                      # MCP tool implementations
│   │   ├── discover.ts             # Service discovery
│   │   ├── details.ts              # Service details
│   │   ├── purchase.ts             # Service purchase
│   │   ├── rate.ts                 # Service ratings
│   │   ├── balance.ts              # Wallet balance
│   │   ├── transaction.ts          # Transaction history
│   │   ├── list.ts                 # List services
│   │   └── index.ts                # Tool exports
│   ├── api/                        # REST API server
│   │   └── apiServer.ts            # Express server
│   ├── auth/                       # Authentication
│   │   ├── siwe.ts                 # SIWE authentication
│   │   └── jwt.ts                  # JWT token management
│   ├── middleware/                 # Express middleware
│   │   ├── security.ts             # Security middleware
│   │   └── auth.ts                 # Auth middleware
│   ├── validation/                 # Input validation
│   │   └── schemas.ts              # Zod schemas
│   └── utils/                      # Utilities
│       ├── logger.ts               # Logging utility
│       └── wallet-validation.ts    # Wallet validation
├── tests/                          # Test suites
│   ├── unit/                       # Unit tests
│   │   ├── auth/                   # Auth tests
│   │   ├── payment/                # Payment tests
│   │   └── tools/                  # Tool tests
│   └── integration/                # Integration tests
│       └── api-server.test.ts      # API tests
├── examples/                       # Example services
│   └── sentiment-analyzer/         # Example x402 service
├── scripts/                        # Utility scripts
│   ├── seed-database.ts            # Seed test data
│   └── register-all-services.ts    # Bulk registration
├── data/                           # Database files (gitignored)
├── dist/                           # Compiled output (gitignored)
├── .env                            # Environment config (gitignored)
├── .env.example                    # Environment template
├── tsconfig.json                   # TypeScript config
├── jest.config.js                  # Jest config
└── package.json                    # NPM config
```

### Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Clean build artifacts
npm run clean

# Start MCP server
npm start

# Start MCP server with hot reload
npm run dev

# Start REST API server
npm run start:api

# Start API server with hot reload
npm run dev:api

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Seed database with example services
npm run seed

# Lint code (not configured yet)
npm run lint
```

### Adding a New MCP Tool

1. Create a new file in `src/tools/your-tool.ts`:

```typescript
import { WalletManager } from '../payment/WalletManager';
import { ServiceRegistry } from '../registry/ServiceRegistry';
import { logger } from '../utils/logger';

export async function yourNewTool(
  params: { param1: string },
  walletManager: WalletManager,
  registry: ServiceRegistry
) {
  try {
    // Your tool logic here
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ result: 'success' }, null, 2)
      }]
    };
  } catch (error: any) {
    logger.error('Error in yourNewTool:', error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: error.message })
      }]
    };
  }
}
```

2. Add tool definition to `src/server.ts`:

```typescript
{
  name: 'your_new_tool',
  description: 'Description of what your tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Description of param1'
      }
    },
    required: ['param1']
  }
}
```

3. Add tool handler to `src/server.ts`:

```typescript
case 'your_new_tool':
  return await yourNewTool(params, this.walletManager, this.registry);
```

4. Write tests in `tests/unit/tools/your-tool.test.ts`

---

## Testing

AgentMarket has comprehensive test coverage with 119+ tests.

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode for development
npm run test:watch

# Run specific test file
npm test -- siwe.test.ts
```

### Test Coverage

Current test coverage: **85%+**

```
File                      | % Stmts | % Branch | % Funcs | % Lines
--------------------------|---------|----------|---------|--------
src/auth/jwt.ts           |   92.85 |    83.33 |   85.71 |   92.85
src/auth/siwe.ts          |   88.46 |    75.00 |   83.33 |   88.46
src/registry/database.ts  |   95.65 |    88.89 |   90.00 |   95.65
src/registry/ServiceRegistry.ts | 93.33 | 85.00 | 87.50 | 93.33
```

### Writing Tests

Tests use Jest with TypeScript:

```typescript
import { generateToken, verifyToken } from '../../../src/auth/jwt';

describe('JWT Authentication', () => {
  const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5';
  const TEST_CHAIN_ID = 84532;

  it('should generate a valid JWT token', () => {
    const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('should verify a valid token', () => {
    const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
    const decoded = verifyToken(token);

    expect(decoded.address).toBe(TEST_ADDRESS.toLowerCase());
    expect(decoded.chainId).toBe(TEST_CHAIN_ID);
  });
});
```

---

## Troubleshooting

### Common Issues

#### Issue: "Missing required environment variables"

**Error Message:**
```
❌ Missing required environment variables:
   - CDP_API_KEY_NAME
   - CDP_API_KEY_PRIVATE_KEY
```

**Solution:**
1. Ensure you have a `.env` file in the project root
2. Copy from template: `cp .env.example .env`
3. Add your CDP API keys from https://portal.cdp.coinbase.com/
4. Restart the server

---

#### Issue: "Claude Desktop not detecting AgentMarket tools"

**Symptoms:**
- Tools don't appear in Claude Desktop
- "No MCP servers connected" message

**Solution:**
1. Verify config.json path is correct for your OS:
   - Windows: `%APPDATA%\Claude\config.json`
   - macOS: `~/Library/Application Support/Claude/config.json`
   - Linux: `~/.config/claude/config.json`

2. Ensure paths in config.json are **absolute** (not relative):
   ```json
   "args": ["C:/full/path/to/agentmarket-mcp/dist/index.js"]
   ```

3. Verify project is built:
   ```bash
   npm run build
   ```

4. Check that dist/index.js exists

5. Restart Claude Desktop completely (quit and reopen)

6. Check Claude Desktop logs for errors

---

#### Issue: "Database locked" or "SQLITE_BUSY"

**Symptoms:**
```
Error: SQLITE_BUSY: database is locked
```

**Solution:**
1. Close any other processes accessing the database
2. If using multiple servers, ensure they use different database files:
   ```bash
   DATABASE_PATH=./data/agentmarket-dev.db  # Development
   DATABASE_PATH=./data/agentmarket-api.db  # API server
   ```

3. Delete the database file to start fresh (loses all data):
   ```bash
   rm ./data/agentmarket.db
   ```

---

#### Issue: "Payment failed" or "Insufficient funds"

**Symptoms:**
- Service purchase fails with payment error
- "Insufficient USDC balance" message

**Solution:**
1. Check your wallet balance:
   ```
   "Check my wallet balance" (in Claude Desktop)
   ```

2. Get testnet USDC from faucet:
   - Visit [Base Sepolia Faucet](https://faucet.quicknode.com/base/sepolia)
   - Enter your wallet address (get it from balance check)
   - Request testnet ETH and USDC

3. Verify you're on the correct network:
   ```bash
   NETWORK=base-sepolia  # For testnet
   ```

4. Wait a few minutes for transactions to confirm

---

#### Issue: "Module not found" or TypeScript errors

**Symptoms:**
```
Error: Cannot find module '@modelcontextprotocol/sdk'
```

**Solution:**
1. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Rebuild the project:
   ```bash
   npm run clean
   npm run build
   ```

3. Ensure you're using Node.js 20+:
   ```bash
   node --version  # Should be v20.x.x or higher
   ```

---

#### Issue: "Port 3333 already in use"

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3333
```

**Solution:**
1. Find process using port 3333:
   ```bash
   # Windows
   netstat -ano | findstr :3333

   # macOS/Linux
   lsof -i :3333
   ```

2. Kill the process or change the port:
   ```bash
   API_PORT=3334  # Use different port
   ```

---

#### Issue: Tests failing

**Symptoms:**
- Jest tests fail with import errors
- "Cannot find name 'logger'" errors

**Solution:**
1. Ensure all dependencies are installed:
   ```bash
   npm install
   ```

2. Check Jest config is correct (should be):
   ```javascript
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'node'
   };
   ```

3. Run tests with verbose output:
   ```bash
   npm test -- --verbose
   ```

---

### Getting Help

If you're still experiencing issues:

1. **Check the logs:**
   ```bash
   # MCP server logs appear in Claude Desktop logs
   # API server logs appear in terminal
   LOG_LEVEL=debug npm start  # Enable debug logging
   ```

2. **Search existing issues:**
   - GitHub Issues: https://github.com/agentmarket/agentmarket-mcp/issues

3. **Create a new issue:**
   - Include your OS, Node.js version, and error messages
   - Attach relevant logs (redact sensitive info!)
   - Describe steps to reproduce

4. **Join the community:**
   - Discord: [coming soon]
   - Twitter: [@agentmarket](https://twitter.com/agentmarket)

---

## Documentation

- **[SETUP.md](./SETUP.md)** - Detailed setup instructions
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and design
- **[API.md](./API.md)** - Complete API reference
- **[CLAUDE.md](./CLAUDE.md)** - Instructions for Claude Code

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes with tests
4. Run tests: `npm test`
5. Commit with conventional commits: `git commit -m "feat: add new feature"`
6. Push to your fork: `git push origin feature/my-feature`
7. Create a Pull Request

### Development Workflow

```bash
# 1. Clone and setup
git clone https://github.com/agentmarket/agentmarket-mcp.git
cd agentmarket-mcp
npm install

# 2. Create feature branch
git checkout -b feature/my-feature

# 3. Make changes
npm run dev  # Start dev server with hot reload

# 4. Write tests
npm run test:watch

# 5. Verify everything works
npm run build
npm test

# 6. Commit and push
git add .
git commit -m "feat: describe your changes"
git push origin feature/my-feature
```

---

## License

**Source-Available License** - See [LICENSE](./LICENSE) file for details.

This code is available for viewing and evaluation, but may not be used, copied, modified, or distributed without permission. For commercial licensing, please contact us.

---

## Links

- **Project Homepage:** https://agentmarket.xyz
- **GitHub Repository:** https://github.com/agentmarket/agentmarket-mcp
- **Documentation:** https://docs.agentmarket.xyz
- **MCP Documentation:** https://modelcontextprotocol.io/
- **x402 Protocol:** https://github.com/coinbase/x402
- **Coinbase CDP:** https://docs.cdp.coinbase.com/
- **Base Blockchain:** https://base.org/

---

**Built with ❤️ by the AgentMarket team**

*Empowering AI agents with decentralized commerce*
