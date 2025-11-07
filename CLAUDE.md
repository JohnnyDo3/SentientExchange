# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgentMarket is an AI-native service marketplace that enables autonomous AI agents to discover, purchase, and provide services using the x402 payment protocol and Model Context Protocol (MCP). The project serves as an MCP server that acts as a service registry, payment router, reputation system, and discovery engine for AI services.

## Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.0+
- **MCP SDK**: @modelcontextprotocol/sdk
- **Transport**: stdio (local) + SSE (remote via Railway)
- **Payment Protocol**: x402 (HTTP 402 Payment Required)
- **Blockchain**: Solana (devnet/mainnet)
- **Wallet**: Client-side signing with local Solana private keys
- **Currency**: USDC (SPL token on Solana)
- **Database**: SQLite (local) / PostgreSQL (production)
- **HTTP Client**: axios

## Development Commands

### Setup

```bash
npm install
# Or use the setup script
./scripts/setup.sh
```

### Build

```bash
npm run build        # Compile TypeScript to dist/
npm run clean        # Remove dist/ directory
```

### Development

```bash
npm run dev          # Run with nodemon and ts-node (hot reload)
npm start            # Run compiled version from dist/
```

### Testing

```bash
npm test             # Run Jest test suite
npm run test:watch   # Run tests in watch mode
# Or run comprehensive test suite
./scripts/test-all.sh
```

### Linting

```bash
npm run lint         # Run ESLint on src/**/*.ts
```

## Automation Tools

This project includes extensive automation to accelerate development during the 10-day hackathon sprint.

### Slash Commands (`.claude/commands/`)

User-invoked commands for common workflows:

1. **`/build-production`** - Complete production build pipeline (clean, compile, lint, test, security audit)
2. **`/test-comprehensive`** - Run all test suites with detailed reporting (unit, integration, e2e, x402 scenarios)
3. **`/docker-build-all`** - Build all Docker containers with security scanning and SBOM generation
4. **`/x402-flow-test`** - Test complete x402 payment workflow (happy path + 15 error scenarios)
5. **`/security-audit`** - Comprehensive security audit (secrets, vulnerabilities, Docker, dependencies)
6. **`/generate-docs`** - Auto-generate all project documentation (API, architecture, deployment)
7. **`/demo-prepare`** - Prepare environment for hackathon demo recording

### Skills (`~/.claude/skills/`)

AI-powered capabilities that Claude invokes autonomously:

1. **`x402-service-generator`** - Generate complete x402 service with Express, middleware, tests, Docker
2. **`mcp-tool-generator`** - Generate new MCP tool with schema, implementation, tests, docs
3. **`test-coverage-analyzer`** - Analyze coverage and suggest specific tests to write
4. **`payment-validator`** - Validate x402 implementations and verify transactions
5. **`secret-scanner`** - Scan for exposed secrets, API keys, and credentials
6. **`vulnerability-checker`** - Check for security vulnerabilities in code and dependencies
7. **`code-quality-checker`** - Analyze code quality, complexity, and maintainability
8. **`performance-profiler`** - Profile performance and identify bottlenecks
9. **`doc-generator`** - Auto-generate documentation from code
10. **`changelog-generator`** - Generate CHANGELOG.md from git commits

### Custom Agents (`.claude/agents/`)

Specialized agents for complex multi-step workflows:

1. **`x402-payment-specialist`** - Expert in x402 payment implementation, debugging, and testing
2. **`test-coverage-enforcer`** - Ensures 80%+ test coverage with comprehensive test generation
3. **`ci-cd-pipeline-builder`** - Creates and maintains GitHub Actions workflows
4. **`database-architect`** - Designs schema, migrations, and optimizes database performance

### GitHub Actions Workflows (`.github/workflows/`)

Enterprise-grade CI/CD pipelines with Railway deployment:

1. **`ci.yml`** - Continuous Integration (runs on every push/PR to master/develop)
   - ESLint with strict TypeScript rules (zero warnings tolerated)
   - TypeScript compilation check
   - Jest tests with 80% coverage requirement
   - Security scanning (npm audit, Snyk)
   - Build verification with artifact upload
   - Upload coverage to Codecov
   - **All checks must pass before merge**

2. **`deploy-staging.yml`** - Staging Deployment (automatic on develop branch)
   - Triggers after CI passes on develop branch
   - Deploys to Railway staging environment
   - Runs post-deployment smoke tests
   - Validates health endpoints
   - Automated - no approval required

3. **`deploy-production.yml`** - Production Deployment (manual approval required)
   - Triggers on merge to master branch
   - **Requires manual approval** via GitHub Environments
   - Deploys to Railway production environment
   - Comprehensive smoke tests
   - Creates GitHub deployment record
   - Detailed rollback instructions on failure
   - Production URL tracked in deployment

4. **`security-scan.yml`** - Daily Security Scans
   - Dependency scanning (npm audit, Snyk)
   - Secret scanning (Gitleaks, TruffleHog)
   - Code scanning (CodeQL)
   - Auto-creates GitHub issues for security findings

### Docker Configuration (`docker/`)

Production-ready containerization:

1. **`mcp-server.Dockerfile`** - Multi-stage build for MCP server
   - Alpine Linux base (minimal size)
   - Non-root user for security
   - Health checks included

2. **`docker-compose.yml`** - Complete local environment
   - MCP server
   - 3 example x402 services (image-analyzer, sentiment-analyzer, text-summarizer)
   - Shared network for service communication
   - Volume mounts for data persistence

3. **`.dockerignore`** - Optimized Docker context

### Helper Scripts (`scripts/`)

Bash scripts for common tasks:

1. **`setup.sh`** - Initial project setup and dependency installation
2. **`test-all.sh`** - Run comprehensive test suite with coverage
3. **`seed-database.sh`** - Seed database with example services
4. **`security-audit.sh`** - Run complete security audit
5. **`smoke-test.sh`** - Post-deployment health checks and validation

### How to Use the Automation

**During Development:**

```bash
# Start with setup
/build-production

# Generate a new x402 service
# Claude will invoke x402-service-generator skill automatically
"Create a new image analysis service"

# Test the payment flow
/x402-flow-test

# Check test coverage
# Claude will invoke test-coverage-analyzer skill
"What's our test coverage?"

# Generate tests
# Claude will invoke test-coverage-enforcer agent
"Write tests to get to 80% coverage"
```

**Before Submission:**

```bash
# Security audit
/security-audit

# Generate all docs
/generate-docs

# Prepare demo
/demo-prepare
```

**With Agents:**

```bash
# Invoke agents explicitly for complex tasks
"@x402-payment-specialist implement payment middleware"
"@test-coverage-enforcer write comprehensive tests"
"@ci-cd-pipeline-builder set up GitHub Actions"
"@database-architect design the schema"
```

## Project Architecture

### Core Components

1. **MCP Server** (`src/server.ts` + `src/api/apiServer.ts`)
   - Implements the Model Context Protocol server
   - Exposes tools for service discovery, purchasing, and rating
   - Supports two transport modes:
     - **stdio**: Local communication with Claude Desktop (stdio transport)
     - **SSE**: Remote communication via HTTPS/Railway (Server-Sent Events)

2. **Service Registry** (`src/registry/ServiceRegistry.ts`)
   - Manages service listings with in-memory cache + SQLite persistence
   - Handles service search, filtering, and reputation management
   - Tracks all registered services with metadata, pricing, and capabilities

3. **Payment System** (`src/payment/`)
   - **WalletManager**: Manages local Solana wallets for client-side transaction signing
   - **X402Client**: Handles HTTP 402 payment flow (request → 402 response → payment → retry with proof)
   - Executes USDC (SPL token) payments on Solana blockchain

4. **Database** (`src/registry/database.ts`)
   - SQLite database with three tables: services, transactions, ratings
   - Promisified API for async/await patterns
   - Automatic schema initialization on startup

### MCP Tools

The server exposes 13 MCP tools to AI clients:

**Standard Tools (7)**:
1. **discover_services**: Search services by capability, price, or rating
2. **get_service_details**: Get detailed information about a specific service
3. **list_all_services**: List all available services with pagination
4. **purchase_service**: Request service execution (returns payment instruction)
5. **execute_payment**: Execute payment with local Solana wallet (CLIENT-SIDE SIGNING)
6. **submit_payment**: Complete purchase by submitting payment proof
7. **rate_service**: Submit ratings for completed transactions

**Budget Management Tools (3)**:
8. **set_spending_limits**: Configure budget controls (per transaction, daily, monthly)
9. **check_spending**: View current spending stats and remaining budget
10. **reset_spending_limits**: Remove all budget limits

**Smart Workflow Tools (2)**:
11. **discover_and_prepare_service**: Combines discover + health check + prepare payment (3 calls → 1)
12. **complete_service_with_payment**: Combines verify + submit + retry with backup services

**Analytics Tools (1)**:
13. **get_transaction**: Retrieve transaction history and details

### Data Flow

**Local Mode (stdio)**:

```
Claude Desktop (MCP Client)
    ↓ (MCP over stdio)
AgentMarket MCP Server (local)
    ↓ (discover_services)
Service Registry (SQLite + cache)
    ↓ (purchase_service)
X402 Payment Client
    ↓ (HTTP 402 + payment)
External x402 Service
```

**Remote Mode (SSE)**:

```
Claude Desktop / API Client
    ↓ (HTTPS + SSE)
AgentMarket API Server (Railway)
    ↓ (MCP over SSE)
AgentMarket MCP Server
    ↓ (discover_services)
Service Registry (PostgreSQL + cache)
    ↓ (purchase_service)
X402 Payment Client
    ↓ (HTTP 402 + payment)
External x402 Service
```

### Payment Flow (x402)

1. Make initial HTTP request to service endpoint
2. Receive 402 Payment Required with payment details (recipient, amount, currency, transaction_id)
3. Verify price is acceptable against spending limits
4. Execute USDC (SPL token) payment with local Solana wallet (CLIENT-SIDE SIGNING)
5. Get transaction signature from Solana blockchain
6. Retry request with X-Payment header containing signature and transaction proof (JWT)
7. Service validates payment on-chain and returns result
8. Transaction logged to database with payment details

## Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
# Solana Wallet Configuration (required for payments)
SOLANA_PRIVATE_KEY=your-base58-encoded-private-key

# Network (devnet for testing, mainnet-beta for production)
SOLANA_NETWORK=devnet

# Database
DATABASE_PATH=./data/agentmarket.db

# Optional
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_ANALYTICS=false

# Optional: Helius RPC for better reliability
HELIUS_API_KEY=your-helius-api-key
```

**IMPORTANT**: Never commit `.env` files or expose Solana private keys. The private key is used CLIENT-SIDE ONLY in the MCP client environment (Claude Desktop config), NOT on the server.

## CI/CD Workflow

AgentMarket uses an enterprise-grade CI/CD pipeline powered by GitHub Actions and Railway.

### Development Workflow

```
┌──────────────┐
│  Developer   │
│  Local Work  │
└──────┬───────┘
       │ git push
       ▼
┌──────────────┐
│ GitHub: Push │
│  to develop  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│  CI Workflow (ci.yml)    │
│  ✓ ESLint (0 warnings)   │
│  ✓ TypeScript compile    │
│  ✓ Tests (80% coverage)  │
│  ✓ Security scan         │
│  ✓ Build artifacts       │
└──────┬───────────────────┘
       │ All checks pass
       ▼
┌──────────────────────────┐
│ Deploy Staging           │
│ (deploy-staging.yml)     │
│  → Railway Staging       │
│  → Smoke Tests           │
└──────────────────────────┘
```

### Production Deployment Workflow

```
┌──────────────┐
│ Pull Request │
│  develop →   │
│   master     │
└──────┬───────┘
       │ Merge
       ▼
┌──────────────────────────┐
│  CI Workflow (ci.yml)    │
│  ✓ All checks must pass  │
└──────┬───────────────────┘
       │ Success
       ▼
┌──────────────────────────┐
│ Production Deployment    │
│ (deploy-production.yml)  │
│                          │
│ ⚠️  MANUAL APPROVAL      │
│    REQUIRED              │
└──────┬───────────────────┘
       │ Approved
       ▼
┌──────────────────────────┐
│  Deploy to Railway       │
│  → Production Env        │
│  → Smoke Tests           │
│  → Health Checks         │
│  → Deployment Record     │
└──────────────────────────┘
```

### Quality Gates

Before any code reaches production, it must pass:

1. **Pre-commit Hooks** (via Husky)
   - Runs ESLint --fix on staged files
   - Runs Prettier formatting
   - Performs TypeScript compilation check
   - Fails commit if any checks fail

2. **Continuous Integration** (on every push/PR)
   - ESLint with `--max-warnings=0` (zero tolerance)
   - Full TypeScript compilation
   - Jest tests with 80% coverage requirement
   - npm audit + Snyk security scanning
   - All jobs must succeed (no continue-on-error)

3. **Branch Protection** (configured in GitHub)
   - Require PR approval (1+ reviewers)
   - Require status checks to pass
   - Require branches to be up to date
   - No force pushes to master/develop

4. **Deployment Gates**
   - Staging: Automatic after CI passes
   - Production: Manual approval required
   - Smoke tests must pass post-deployment

### Deployment Environments

| Environment    | Branch  | Trigger   | Approval   | URL Secret               |
| -------------- | ------- | --------- | ---------- | ------------------------ |
| **Staging**    | develop | Automatic | None       | `RAILWAY_STAGING_URL`    |
| **Production** | master  | Automatic | **Manual** | `RAILWAY_PRODUCTION_URL` |

### Required GitHub Secrets

Configure these in GitHub Settings → Secrets and variables → Actions:

1. **Railway Tokens**:
   - `RAILWAY_TOKEN_STAGING` - Railway API token for staging
   - `RAILWAY_TOKEN_PRODUCTION` - Railway API token for production

2. **Railway URLs** (for smoke tests):
   - `RAILWAY_STAGING_URL` - Full URL (e.g., `https://app-staging.up.railway.app`)
   - `RAILWAY_PRODUCTION_URL` - Full URL (e.g., `https://app.up.railway.app`)

3. **Code Quality & Security**:
   - `CODECOV_TOKEN` - For coverage reporting (value: `53bde5cf-9bd1-4097-a2c8-daf0cc916f9f`)
   - `SNYK_TOKEN` - For vulnerability scanning (free tier at snyk.io)

### Setting Up Manual Approval for Production

1. Go to **Settings** → **Environments**
2. Create environment: `production`
3. Configure:
   - **Required reviewers**: Add yourself or team members (1+ required)
   - **Wait timer**: Optional (e.g., 30 minutes before deployment can proceed)
   - **Deployment branches**: Select "Selected branches" → Add `master`
4. Save

Now every production deployment will pause and wait for manual approval.

### Rollback Procedures

If a deployment fails or causes issues:

**Via Railway Dashboard:**

1. Navigate to your project
2. Click on the service
3. Go to "Deployments" tab
4. Find the last working deployment
5. Click "Redeploy"

**Via Railway CLI:**

```bash
railway rollback
```

**Via GitHub:**

1. Revert the problematic commit
2. Push to master
3. Approve the new deployment

### Monitoring & Alerts

- **CI Status**: Visible in PR checks and GitHub Actions tab
- **Deployment Status**: GitHub Deployments page
- **Security Issues**: Auto-created as GitHub Issues by security-scan.yml
- **Coverage Trends**: Codecov dashboard

### Best Practices

1. **Always work on feature branches**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Test locally before pushing**

   ```bash
   npm run lint
   npm test
   npm run build
   ```

3. **Keep commits small and focused**
   - Pre-commit hooks will catch issues early
   - Easier to review and rollback if needed

4. **Write tests for new features**
   - 80% coverage is enforced
   - Tests block merges if they fail

5. **Review Dependabot PRs weekly**
   - Auto-created for dependency updates
   - Security patches are prioritized

6. **Monitor security scans**
   - Run daily at 2 AM UTC
   - Issues auto-created for critical findings

## Key Implementation Details

### Type Safety

All data models are strictly typed in `src/types/`:

- **Service**: Service metadata, pricing, reputation, capabilities
- **Transaction**: Payment records with request/response data
- **Rating**: User reviews with scores (1-5)

### In-Memory Caching

The ServiceRegistry maintains an in-memory Map cache of all services for fast lookups. The cache is loaded from SQLite on startup and kept in sync on updates.

### Database Schema

Three main tables with foreign key relationships:

- `services`: Service listings with JSON-serialized complex fields
- `transactions`: Payment history linked to services
- `ratings`: User reviews linked to transactions and services

Indexes on: `capabilities`, `service_id`, and rating queries for performance.

### Error Handling

- Payment failures are logged but don't crash the server
- Transaction status tracked as: `pending`, `completed`, `failed`
- All errors stored in transaction records for debugging

## Testing Strategy

### Unit Tests

Located in `tests/unit/`:

- `registry.test.ts`: ServiceRegistry CRUD operations
- `payment.test.ts`: X402Client payment flows
- `tools.test.ts`: MCP tool logic

### Integration Tests

Located in `tests/integration/`:

- `e2e.test.ts`: End-to-end workflows
- `api-server.test.ts`: SSE transport and API endpoint tests

### Manual Testing

MCP protocol testing requires manual testing with Claude Desktop:

1. Build the project
2. Configure Claude Desktop's MCP settings (see `~/.config/claude/config.json`)
3. Test each tool through natural language interactions

## Claude Desktop Integration

To use this MCP server with Claude Desktop, add to `~/.config/claude/config.json`:

```json
{
  "mcpServers": {
    "agentmarket": {
      "command": "node",
      "args": ["C:/Users/johnn/Desktop/agentMarket-mcp/dist/index.js"],
      "env": {
        "DATABASE_PATH": "C:/Users/johnn/Desktop/agentMarket-mcp/data/agentmarket.db",
        "SOLANA_PRIVATE_KEY": "your-base58-encoded-private-key",
        "SOLANA_NETWORK": "devnet",
        "HELIUS_API_KEY": "your-helius-api-key"
      }
    }
  }
}
```

**Security Note**: The `SOLANA_PRIVATE_KEY` is stored CLIENT-SIDE in Claude Desktop's configuration. This enables client-side signing where:
- User controls their own wallet and private keys
- MCP server NEVER has access to private keys
- Payments are signed locally and only signatures are sent to services
- Server only verifies payment signatures on-chain

After configuration, restart Claude Desktop to load the server.

## Security Considerations

1. **Wallet Security (Client-Side Signing)**
   - Private keys stored ONLY in MCP client environment (Claude Desktop), never on server
   - Users control their own Solana wallets and keys
   - Never log or expose private keys in server code
   - Server only verifies payment signatures on-chain, never signs transactions
   - Use Helius RPC for better reliability and security

2. **Payment Verification**
   - Verify x402 payment signatures on Solana blockchain before executing requests
   - Check payment amount matches service pricing
   - Validate payment recipient address
   - Ensure transaction is confirmed on-chain before proceeding
   - Generate JWT payment tokens after verification

3. **Spending Limits**
   - Implement per-transaction, daily, and monthly spending limits
   - Block payments that exceed configured budgets
   - Track spending in real-time with in-memory cache
   - Essential for autonomous agent safety

4. **Service Validation**
   - Verify service endpoints are accessible via health checks
   - Implement rate limiting to prevent spam
   - Manual review for initial service listings
   - Reputation system to track service quality

## Project Structure

```
agentmarket-mcp/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server implementation
│   ├── types/                # TypeScript type definitions
│   │   ├── service.ts
│   │   ├── transaction.ts
│   │   └── index.ts
│   ├── registry/             # Service registry and database
│   │   ├── ServiceRegistry.ts
│   │   └── database.ts
│   ├── payment/              # x402 payment handling
│   │   ├── X402Client.ts
│   │   └── WalletManager.ts
│   ├── tools/                # MCP tool implementations
│   │   ├── discover.ts
│   │   ├── details.ts
│   │   ├── purchase.ts
│   │   ├── rate.ts
│   │   └── index.ts
│   └── utils/                # Utilities
│       ├── logger.ts
│       └── validation.ts
├── examples/                 # Example x402 services
│   └── sample-services/
├── tests/                    # Test suites
│   ├── unit/
│   └── integration/
├── data/                     # SQLite database (gitignored)
├── dist/                     # Compiled output (gitignored)
└── docs/                     # Additional documentation
```

## Important Notes

### Current Project Status

AgentMarket is **production-ready** with the following achievements:
- ✅ **80%+ test coverage** across unit, integration, and e2e tests
- ✅ **13 MCP tools** fully implemented (7 standard + 3 budget + 2 smart + 1 analytics)
- ✅ **Enterprise documentation** at sentientexchange.com/docs (31 pages)
- ✅ **CI/CD pipeline** with GitHub Actions + Railway deployment
- ✅ **Client-side payment signing** with Solana blockchain
- ✅ **Spending limits** for autonomous agent safety
- ✅ **Master Orchestrator** for multi-service workflows
- ✅ **WebSocket API** for real-time marketplace updates
- ✅ **PostgreSQL support** for production scaling
- ✅ **Docker containerization** with health checks

**Deployment**:
- Staging: Automatic deployment on `develop` branch
- Production: Manual approval required on `master` branch
- Railway: Both environments deployed and tested

**Documentation**: Complete technical documentation available at `sentientexchange.com/docs` with:
- Quick Start guides (4 pages)
- Conceptual overviews (6 pages)
- Implementation guides (8 pages)
- API reference (4 pages)
- Architecture deep-dives (5 pages)
- Deployment guides (4 pages)

### Development Priorities

Current focus areas:
1. ✅ Testing: Achieved 80%+ coverage
2. ✅ Documentation: Enterprise-grade docs completed
3. 🔄 Demo preparation: Recording hackathon demo
4. 🔄 Final deployment: Production environment validation
5. 📋 Submission: Preparing hackathon submission materials

### x402 Protocol

The x402 protocol extends HTTP with a 402 Payment Required status code. Services return 402 with payment details, clients execute blockchain payments, then retry with payment proof. This enables automatic micropayments between AI agents.

### MCP Protocol

Model Context Protocol enables AI assistants to access tools and resources. This server exposes tools via two transport modes:

- **stdio**: Local communication with Claude Desktop
- **SSE (Server-Sent Events)**: Remote communication via HTTPS (deployed on Railway)

Both modes allow AI clients to discover services and make payments on behalf of users.

## References

- **Documentation Portal**: https://sentientexchange.com/docs (31 pages of enterprise-grade docs)
- **Project Plan**: `AgentMarket_Complete_Project_Plan.md`
- **MCP Documentation**: https://modelcontextprotocol.io/
- **x402 Protocol**: https://github.com/coinbase/x402
- **Solana Documentation**: https://docs.solana.com/
- **Helius RPC**: https://www.helius.dev/docs (recommended for production)
