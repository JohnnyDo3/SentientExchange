# Development Guide

> **Generated:** 2025-11-04
> **Version:** 1.0.0

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Node.js** | 22+ | Runtime environment |
| **npm** | 10+ | Package manager |
| **Git** | Any | Version control |
| **Claude Desktop** | Latest | MCP client for testing |

### Optional Tools

- **Solana CLI** - For blockchain testing
- **VSCode** - Recommended IDE with TypeScript support
- **Postman** - API testing
- **Docker** - Container testing

### Required Accounts

1. **Solana Wallet** - Get a devnet wallet with test USDC
   - Install Phantom wallet extension
   - Export private key (Settings → Show Private Key)
   - Get devnet SOL: https://faucet.solana.com
   - Get devnet USDC: https://spl-token-faucet.com

2. **Railway Account** (optional) - For deployment testing
   - Sign up at https://railway.app

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-org/agentMarket-mcp.git
cd agentMarket-mcp
```

### 2. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd web
npm install
cd ..
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Network (devnet for testing, mainnet-beta for production)
NETWORK=devnet

# Your Solana wallet private key (base58-encoded)
SOLANA_PRIVATE_KEY=your-private-key-here

# Database path
DATABASE_PATH=./data/agentmarket.db

# Payment mode (hybrid recommended)
PAYMENT_MODE=hybrid

# JWT secret (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=your-jwt-secret-here
```

**Security Warning:** Never commit `.env` to git. It's already in `.gitignore`.

### 4. Initialize Database

```bash
npm run build
node dist/server/index.js
```

The database will be created automatically at `./data/agentmarket.db`.

### 5. Seed Test Data (Optional)

```bash
curl -X POST http://localhost:8081/api/admin/seed
```

This creates 5 example services for testing.

---

## Project Structure

```
agentmarket-mcp/
├── src/                        # Backend TypeScript source
│   ├── index.ts                # MCP server entry point
│   ├── server.ts               # AgentMarketServer class
│   ├── server/                 # API server and WebSocket
│   │   ├── index.ts            # API server entry
│   │   ├── api.ts              # Express app with routes
│   │   ├── websocket.ts        # Socket.IO server
│   │   └── seed-endpoint.ts    # Database seeding
│   ├── registry/               # Service registry
│   │   ├── ServiceRegistry.ts  # In-memory + SQLite registry
│   │   └── database.ts         # SQLite wrapper
│   ├── payment/                # Payment providers
│   │   ├── PaymentRouter.ts    # Payment routing logic
│   │   ├── PaymentFactory.ts   # Provider factory
│   │   ├── X402Provider.ts     # x402 protocol implementation
│   │   └── DirectSolanaProvider.ts  # Direct blockchain transfers
│   ├── orchestrator/           # Multi-service orchestration
│   │   └── MasterOrchestrator.ts
│   ├── tools/                  # MCP tool implementations
│   │   ├── discover.ts         # Service discovery
│   │   ├── details.ts          # Service details
│   │   ├── purchase.ts         # Service purchase
│   │   ├── submit-payment.ts   # Payment completion
│   │   ├── rate.ts             # Service rating
│   │   ├── list.ts             # List services
│   │   └── transaction.ts      # Get transaction
│   ├── types/                  # TypeScript type definitions
│   │   ├── service.ts          # Service interface
│   │   ├── transaction.ts      # Transaction interface
│   │   └── index.ts            # Exports
│   ├── auth/                   # Authentication
│   │   ├── jwt.ts              # JWT utilities
│   │   └── siwe.ts             # Sign-In with Ethereum
│   ├── middleware/             # Express middleware
│   │   ├── auth.ts             # JWT verification
│   │   └── security.ts         # Security headers
│   ├── validation/             # Input validation
│   │   └── schemas.ts          # Zod schemas
│   └── utils/                  # Utilities
│       ├── logger.ts           # Winston logger
│       └── validation.ts       # Validation helpers
├── web/                        # Next.js frontend
│   ├── app/                    # App router pages
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── marketplace/        # Marketplace pages
│   │   ├── dashboard/          # Dashboard pages
│   │   ├── providers/          # Provider pages
│   │   └── swarm/              # Swarm visualization
│   ├── components/             # React components
│   │   ├── ui/                 # UI components
│   │   ├── 3d/                 # Three.js components
│   │   └── sections/           # Page sections
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities
│   └── public/                 # Static assets
├── tests/                      # Test suites
│   ├── unit/                   # Unit tests
│   └── integration/            # Integration tests
├── data/                       # SQLite database (gitignored)
├── dist/                       # Compiled output (gitignored)
├── docs/                       # Documentation
├── docker/                     # Docker configuration
├── .github/workflows/          # GitHub Actions CI/CD
├── package.json                # Backend dependencies
├── tsconfig.json               # TypeScript config
├── Dockerfile                  # Production Docker image
└── start-railway.js            # Railway start script
```

---

## Development Workflow

### Running Locally

#### Option 1: All Services (Recommended)

Start MCP server, API server, and web dashboard:

```bash
npm run start:all
```

This runs:
- MCP Server on stdio (for Claude Desktop)
- API Server on http://localhost:8081
- Web Dashboard on http://localhost:3000

#### Option 2: Individual Services

**MCP Server Only:**
```bash
npm run dev
# or
npm run start:mcp
```

**API Server Only:**
```bash
npm run dev:api
# or
npm run start:api
```

**Web Dashboard Only:**
```bash
cd web
npm run dev
```

### Building

```bash
# Build backend
npm run build

# Build frontend
cd web && npm run build
```

Compiled output:
- Backend: `dist/` directory
- Frontend: `web/.next/` directory

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # End-to-end tests

# Watch mode (auto-rerun on file changes)
npm run test:watch
```

### Linting

```bash
npm run lint
```

---

## Code Standards

### TypeScript

- **Strict mode enabled** - All types must be explicitly defined
- **No `any` types** - Use proper types or `unknown`
- **Interfaces over types** - Prefer `interface` for object shapes
- **Async/await** - Use async/await instead of .then() chains

**Example:**
```typescript
// ❌ Bad
function getData(id: any) {
  return fetch('/api/data/' + id).then(res => res.json());
}

// ✅ Good
async function getData(id: string): Promise<Data> {
  const response = await fetch(`/api/data/${id}`);
  return response.json();
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Files** | kebab-case | `service-registry.ts` |
| **Classes** | PascalCase | `ServiceRegistry` |
| **Interfaces** | PascalCase | `Service`, `Transaction` |
| **Functions** | camelCase | `discoverServices()` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_PRICE` |
| **Private fields** | _camelCase | `_cache` |

### File Organization

1. **Imports** - Group by: stdlib, external, internal
2. **Constants** - Define at top of file
3. **Types** - Before implementation
4. **Main code** - Implement classes/functions
5. **Exports** - At bottom

**Example:**
```typescript
// 1. Imports
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ServiceRegistry } from './registry/ServiceRegistry.js';
import { logger } from './utils/logger.js';

// 2. Constants
const MAX_RETRIES = 3;

// 3. Types
interface Config {
  dbPath: string;
}

// 4. Implementation
export class AgentMarketServer {
  // ...
}

// 5. Exports
export { AgentMarketServer };
```

### Error Handling

Always handle errors gracefully:

```typescript
// ❌ Bad
async function getService(id: string) {
  return await db.get(`SELECT * FROM services WHERE id = ?`, id);
}

// ✅ Good
async function getService(id: string): Promise<Service | null> {
  try {
    const row = await db.get(`SELECT * FROM services WHERE id = ?`, id);
    if (!row) {
      return null;
    }
    return parseService(row);
  } catch (error) {
    logger.error(`Failed to get service ${id}:`, error);
    throw new Error(`Service retrieval failed: ${error.message}`);
  }
}
```

### Logging

Use the logger utility:

```typescript
import { logger } from './utils/logger.js';

logger.info('Service registered', { serviceId: service.id });
logger.error('Payment failed', { error, serviceId });
logger.debug('Cache hit', { key });
```

Log levels:
- `error` - Errors and exceptions
- `warn` - Warnings and degraded states
- `info` - Important events
- `debug` - Detailed diagnostic info

---

## Testing Guide

### Unit Tests

Test individual functions and classes in isolation.

**Location:** `tests/unit/`

**Example:**
```typescript
import { ServiceRegistry } from '../../src/registry/ServiceRegistry';
import { Database } from '../../src/registry/database';

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;
  let db: Database;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.initialize();
    registry = new ServiceRegistry(db);
    await registry.initialize();
  });

  afterEach(async () => {
    await db.close();
  });

  test('should register a new service', async () => {
    const service = await registry.registerService({
      name: 'Test Service',
      description: 'A test service',
      // ...
    });

    expect(service.id).toBeDefined();
    expect(service.name).toBe('Test Service');
  });

  test('should search services by capability', async () => {
    // Test implementation
  });
});
```

### Integration Tests

Test multiple components working together.

**Location:** `tests/integration/`

**Example:**
```typescript
import { AgentMarketServer } from '../../src/server';

describe('Service Purchase Flow', () => {
  let server: AgentMarketServer;

  beforeAll(async () => {
    server = new AgentMarketServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.shutdown();
  });

  test('full purchase flow with payment', async () => {
    // 1. Discover services
    // 2. Purchase service (get payment instruction)
    // 3. Execute payment
    // 4. Submit payment signature
    // 5. Receive service result
    // 6. Rate service
  });
});
```

### Writing Good Tests

**Characteristics of good tests:**
- ✅ **Fast** - Run in milliseconds
- ✅ **Isolated** - Don't depend on other tests
- ✅ **Repeatable** - Same result every time
- ✅ **Self-validating** - Pass or fail, no manual checking
- ✅ **Timely** - Written before or with the code

**Use descriptive test names:**
```typescript
// ❌ Bad
test('test1', () => { ... });

// ✅ Good
test('should return 404 when service does not exist', () => { ... });
```

---

## Debugging

### MCP Server

1. Enable debug logging in `.env`:
```bash
LOG_LEVEL=debug
```

2. Check Claude Desktop logs:
- **macOS:** `~/Library/Logs/Claude/mcp*.log`
- **Windows:** `%APPDATA%\Claude\logs\mcp*.log`

3. Test MCP tools directly:
```bash
# Use inspector mode
npx @modelcontextprotocol/inspector dist/index.js
```

### API Server

1. Use VSCode debugger:

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API Server",
      "program": "${workspaceFolder}/src/server/index.ts",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "envFile": "${workspaceFolder}/.env"
    }
  ]
}
```

2. Use Postman/curl for API testing:
```bash
curl http://localhost:8081/api/services
```

### Web Dashboard

```bash
cd web
npm run dev
```

Open http://localhost:3000 and use browser DevTools.

---

## Common Tasks

### Add a New MCP Tool

1. Create tool implementation in `src/tools/my-tool.ts`:
```typescript
export async function myTool(args: MyToolArgs, registry: ServiceRegistry) {
  // Implementation
}
```

2. Register in `src/server.ts`:
```typescript
{
  name: 'my_tool',
  description: 'What the tool does',
  inputSchema: {
    type: 'object',
    properties: {
      // Define parameters
    }
  }
}
```

3. Add handler:
```typescript
case 'my_tool':
  return await myTool(args, this.registry);
```

4. Write tests in `tests/unit/tools/my-tool.test.ts`

### Add a New API Endpoint

1. Add route in `src/server/api.ts`:
```typescript
app.post('/api/my-endpoint', async (req, res) => {
  try {
    const result = await myFunction(req.body);
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

2. Add to documentation in `docs/API.md`

3. Test with curl:
```bash
curl -X POST http://localhost:8081/api/my-endpoint \
  -H "Content-Type: application/json" \
  -d '{"param": "value"}'
```

### Update Database Schema

1. Modify schema in `src/registry/database.ts`
2. Create migration script (if needed)
3. Test with clean database:
```bash
rm data/agentmarket.db
npm run start:api
```

---

## Troubleshooting

### "Module not found" errors

```bash
npm run clean
npm run build
```

### Database locked errors

Close other connections:
```bash
rm data/agentmarket.db.lock
```

### Port already in use

Kill existing processes:
```bash
# Linux/macOS
lsof -ti:8081 | xargs kill -9

# Windows
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

### MCP server not connecting in Claude Desktop

1. Check MCP config path is correct
2. Rebuild: `npm run build`
3. Restart Claude Desktop
4. Check logs in Claude Desktop settings

---

## Next Steps

- [Architecture Overview](./ARCHITECTURE.md) - Understand the system design
- [API Documentation](./API.md) - Complete API reference
- [Deployment Guide](./DEPLOYMENT.md) - Deploy to production
