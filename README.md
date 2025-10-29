# AgentMarket MCP

AI-native service marketplace enabling autonomous AI agents to discover, purchase, and provide services using the x402 payment protocol and Model Context Protocol (MCP).

## Overview

AgentMarket is an MCP server that acts as:
- **Service Registry** - Yellow pages for AI services
- **Payment Router** - Automatic x402 payment handling
- **Reputation System** - Trust scores for services
- **Discovery Engine** - Search and match services to needs

## Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.0+
- **MCP SDK**: @modelcontextprotocol/sdk
- **Payment Protocol**: x402 (HTTP 402 Payment Required)
- **Blockchain**: Base Sepolia (testnet) / Base (mainnet)
- **Wallet**: Coinbase CDP Wallet Smart Accounts
- **Currency**: USDC stablecoin
- **Database**: SQLite

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Coinbase Developer Platform API keys

### Installation

```bash
# Clone repository
git clone <repository-url>
cd agentmarket-mcp

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your CDP API keys
nano .env

# Build
npm run build

# Run
npm start
```

### Development

```bash
# Run with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Project Structure

```
agentmarket-mcp/
├── src/
│   ├── types/          # TypeScript type definitions
│   ├── registry/       # Service registry and database
│   ├── payment/        # x402 payment handling
│   ├── tools/          # MCP tool implementations
│   └── utils/          # Utilities
├── tests/              # Test suites
├── examples/           # Example x402 services
└── docs/               # Documentation
```

## MCP Tools

- `discover_services` - Search services by capability, price, or rating
- `get_service_details` - Get detailed information about a service
- `purchase_service` - Execute service request with automatic payment
- `rate_service` - Submit ratings for completed transactions

## Development Status

🚧 **Day 1: Foundation Setup** - In Progress

See `AgentMarket_Complete_Project_Plan.md` for full development roadmap.

## License

MIT - See LICENSE file

## Links

- [MCP Documentation](https://modelcontextprotocol.io/)
- [x402 Protocol](https://github.com/coinbase/x402)
- [Coinbase CDP](https://docs.cdp.coinbase.com/)
