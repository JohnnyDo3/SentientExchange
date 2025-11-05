# Migration Plan: stdio → SSE Transport + SQLite → Postgres

**Status**: 🟡 Planning Complete - Ready for Implementation
**Started**: 2025-11-05
**Goal**: Enable remote Claude Desktop connections to Railway-deployed MCP server via SSE transport with persistent Postgres database

---

## 🎯 Executive Summary

**Current State**:
- ❌ MCP Server uses stdio transport (local only, NOT on Railway)
- ❌ SQLite database on ephemeral filesystem (data lost on restart)
- ✅ HTTP API deployed on Railway at sentientexchange.com
- ✅ 0 services in production database (needs seeding)

**Target State**:
- ✅ MCP Server uses SSE transport (remote access via HTTPS)
- ✅ Postgres database (persistent, production-ready)
- ✅ Users connect Claude Desktop to sentientexchange.com/mcp/sse
- ✅ 15 production services seeded and accessible
- ✅ No local installation required

---

## 📋 Phase 1: Add Postgres Database Support

**Status**: ✅ COMPLETED (2025-11-05)

### Tasks:
- [x] Install pg and @types/pg npm packages
- [x] Create src/registry/DatabaseAdapter.ts (abstraction layer)
- [x] Create src/registry/adapters/SQLiteAdapter.ts (existing logic)
- [x] Create src/registry/adapters/PostgresAdapter.ts (new implementation)
- [x] Update src/registry/database.ts to auto-detect DATABASE_URL
- [x] Create Postgres schema with JSONB optimization (in PostgresAdapter)
- [x] Update package.json dependencies
- [x] Convert INSERT OR REPLACE → INSERT ... ON CONFLICT (in migrate method)
- [x] Update start-railway.js to detect DATABASE_URL
- [x] Update .env.example with DATABASE_URL documentation

### Files Modified:
- `package.json` - Add pg dependencies
- `src/registry/database.ts` - Add Postgres adapter detection
- `src/registry/DatabaseAdapter.ts` (NEW)
- `src/registry/adapters/SQLiteAdapter.ts` (NEW - extract existing code)
- `src/registry/adapters/PostgresAdapter.ts` (NEW)
- `src/registry/postgres-schema.sql` (NEW)

### SQL Conversions Needed:
```sql
-- SQLite
INSERT OR REPLACE INTO services (id, name, ...) VALUES (?, ?, ...)

-- Postgres
INSERT INTO services (id, name, ...)
VALUES ($1, $2, ...)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, ...
```

### Testing:
- [ ] Test SQLite still works locally
- [ ] Test Postgres adapter with local Postgres container
- [ ] Verify all CRUD operations work
- [ ] Run existing unit tests against both adapters

---

## 📋 Phase 2: Add SSE Transport for MCP

**Status**: ✅ COMPLETED (2025-11-05)

### Tasks:
- [x] Create src/mcp/SSETransport.ts (MCP server with SSE)
- [x] Add GET /mcp/sse endpoint to src/api/apiServer.ts
- [x] Add POST /mcp/message endpoint for SSE bidirectional
- [x] Share ServiceRegistry, Database, SolanaVerifier instances
- [x] Initialize SolanaVerifier and SpendingLimitManager in apiServer.ts
- [x] Fix tool handler signatures (purchaseService, spending limits)
- [x] Configure CORS (uses existing corsOptions)
- [x] Build successful with zero TypeScript errors

### Files Modified:
- `src/mcp/SSETransport.ts` (NEW)
- `src/api/apiServer.ts` - Add SSE endpoints
- `src/server.ts` - Remove stdio, export shared instances
- `src/index.ts` - Update entry point
- `src/middleware/security.ts` - Add MCP CORS rules

### SSE Implementation:
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

export class MCPSSEServer {
  private mcpServer: Server;

  constructor(
    private registry: ServiceRegistry,
    private db: Database,
    private solanaVerifier: SolanaVerifier,
    private spendingLimitManager: SpendingLimitManager
  ) {
    this.mcpServer = new Server({
      name: 'agentmarket-mcp',
      version: '1.0.0'
    }, {
      capabilities: { tools: {} }
    });

    this.setupToolHandlers();
  }

  async handleSSEConnection(req: Request, res: Response) {
    const transport = new SSEServerTransport('/mcp/message', res);
    await this.mcpServer.connect(transport);
  }
}
```

### Testing:
- [ ] Test SSE connection with curl: `curl -N http://localhost:8081/mcp/sse`
- [ ] Test all 13 MCP tools via SSE
- [ ] Test smart tools (discover_and_prepare, complete_service_with_payment)
- [ ] Test CORS allows Claude Desktop connections

---

## 📋 Phase 3: Security & TypeScript

**Status**: ⬜ NOT STARTED

### Tasks:
- [ ] Generate strong JWT_SECRET (64-byte random hex)
- [ ] Update CORS whitelist for production domains
- [ ] Add rate limiting for SSE endpoint (100 req/15min)
- [ ] Verify Helmet headers work with SSE
- [ ] Add TypeScript strict types for Postgres adapter
- [ ] Security audit for SSE endpoint (no auth, public access)
- [ ] Add request logging for MCP tool calls
- [ ] Validate all user inputs in MCP tools

### Security Configuration:
```typescript
// CORS for MCP SSE
const mcpCorsOptions = {
  origin: [
    'https://sentientexchange.com',
    'https://www.sentientexchange.com',
    'http://localhost:3000', // Local dev
  ],
  credentials: false, // No cookies needed for MCP
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
};

// Rate limiting for MCP
const mcpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many MCP requests, please try again later',
});
```

### Testing:
- [ ] Test CORS blocks unauthorized origins
- [ ] Test rate limiting triggers after 100 requests
- [ ] Verify JWT_SECRET is strong (64+ chars)
- [ ] Run security scan (npm audit)

---

## 📋 Phase 4: Update All Tests

**Status**: ⬜ NOT STARTED

### Tasks:
- [ ] Update unit tests for Database class (support both adapters)
- [ ] Add tests for PostgresAdapter
- [ ] Add tests for SSETransport
- [ ] Update integration tests for SSE transport
- [ ] Mock SSE connections in tests
- [ ] Test smart tools with SSE transport
- [ ] Add E2E tests for Railway deployment
- [ ] Ensure 100% test coverage maintained (325/325 passing)

### Test Files to Update:
- `tests/unit/registry/database.test.ts` - Add Postgres adapter tests
- `tests/unit/mcp/sse-transport.test.ts` (NEW)
- `tests/integration/mcp-sse.test.ts` (NEW)
- `tests/unit/tools/smart-discover-prepare.test.ts` - Update for SSE
- `tests/unit/tools/smart-execute-complete.test.ts` - Update for SSE

### Testing Strategy:
```typescript
// Mock SSE transport
jest.mock('@modelcontextprotocol/sdk/server/sse.js');

describe('MCPSSEServer', () => {
  it('should handle SSE connections', async () => {
    const mockTransport = new SSEServerTransport('/mcp/message', mockRes);
    await mcpServer.handleSSEConnection(mockReq, mockRes);
    expect(mockTransport.connect).toHaveBeenCalled();
  });
});
```

### Testing Checklist:
- [ ] All existing tests still pass (325/325)
- [ ] New Postgres tests pass
- [ ] New SSE tests pass
- [ ] Coverage remains 100%
- [ ] No TypeScript errors

---

## 📋 Phase 5: Seed Production Database

**Status**: ⬜ NOT STARTED

### Tasks:
- [ ] Deploy Railway with Postgres addon
- [ ] Run scripts/seed-registry.ts (15 services)
- [ ] Verify services appear at sentientexchange.com/api/services
- [ ] Test MCP discover_services tool finds all 15 services
- [ ] Add health check for database connection
- [ ] Document seeding process in README

### Services to Seed (15 total):

**Data Services (4)**:
1. sentiment-analyzer-001 ($0.01 USDC)
2. web-scraper-002 ($0.05 USDC)
3. company-data-api-003 ($0.10 USDC)
4. news-aggregator-004 ($0.08 USDC)

**Analysis Services (4)**:
5. market-research-005 ($0.15 USDC)
6. feature-extractor-006 ($0.12 USDC)
7. trend-forecaster-007 ($0.20 USDC)
8. pricing-optimizer-008 ($0.18 USDC)

**Creative Services (3)**:
9. chart-generator-009 ($0.10 USDC)
10. copywriter-010 ($0.25 USDC)
11. pdf-generator-011 ($0.15 USDC)

**Agent Services (4)** - Can autonomously hire other services:
12. data-aggregator-agent-012 ($0.50 USDC)
13. report-writer-agent-013 ($0.75 USDC)
14. channel-specialist-agent-014 ($0.60 USDC)
15. presentation-builder-agent-015 ($1.00 USDC)

### Seeding Command:
```bash
# Via API endpoint
curl -X POST https://sentientexchange.com/api/admin/seed

# Or via Railway CLI
railway run npm run seed
```

### Testing:
- [ ] GET /api/services returns 15 services
- [ ] MCP discover_services finds all services
- [ ] All service endpoints are reachable
- [ ] Payment addresses are valid Solana addresses

---

## 📋 Phase 6: Railway Deployment Configuration

**Status**: ⬜ NOT STARTED

### Tasks:
- [ ] Add Railway Postgres addon
- [ ] Configure environment variables
- [ ] Update start-railway.js to detect DATABASE_URL
- [ ] Add health check monitoring
- [ ] Configure persistent volume (if needed)
- [ ] Set up Railway secrets (JWT_SECRET)
- [ ] Deploy to Railway production
- [ ] Verify deployment health

### Railway Environment Variables:
```bash
# Auto-provided by Railway
PORT=3000
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Manual configuration required
API_PORT=8081
NODE_ENV=production
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
ALLOWED_ORIGINS=https://sentientexchange.com,https://www.sentientexchange.com
LOG_LEVEL=info
NETWORK=mainnet-beta
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=919c0481-a122-4e96-b8af-100bd6d5cc45
```

### Deployment Steps:
```bash
# 1. Add Postgres addon
railway add postgresql

# 2. Set environment variables via Railway dashboard

# 3. Deploy
git push origin master

# 4. Verify health
curl https://sentientexchange.com/api/pulse

# 5. Test SSE endpoint
curl -N https://sentientexchange.com/mcp/sse

# 6. Seed database
curl -X POST https://sentientexchange.com/api/admin/seed
```

### Testing:
- [ ] Health check returns 200
- [ ] Database connection successful
- [ ] SSE endpoint accessible
- [ ] Services seeded correctly
- [ ] MCP tools work via SSE

---

## 📋 Phase 7: User Configuration Guide

**Status**: ⬜ NOT STARTED

### Tasks:
- [ ] Create user documentation for Claude Desktop setup
- [ ] Add example configuration to README
- [ ] Document Solana wallet setup
- [ ] Create troubleshooting guide
- [ ] Add video tutorial (optional)

### Claude Desktop Configuration:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Mac/Linux**: `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sentientexchange": {
      "url": "https://sentientexchange.com/mcp/sse",
      "transport": {
        "type": "sse"
      },
      "env": {
        "SOLANA_PRIVATE_KEY": "your-base58-private-key-here",
        "SOLANA_RPC_URL": "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
      }
    }
  },
  "networkAllowlist": [
    "sentientexchange.com",
    "www.sentientexchange.com",
    "api.mainnet-beta.solana.com",
    "mainnet.helius-rpc.com"
  ]
}
```

### User Guide Topics:
1. Installing Claude Desktop
2. Configuring MCP server connection
3. Setting up Solana wallet
4. Funding wallet with USDC
5. Using smart tools workflow (3-call pattern)
6. Troubleshooting connection issues

---

## 📋 Phase 8: End-to-End Testing

**Status**: ⬜ NOT STARTED

### Test Scenarios:

#### 1. Service Discovery
- [ ] User connects Claude Desktop to sentientexchange.com
- [ ] User asks: "Find me an image analysis service"
- [ ] MCP discover_services returns results
- [ ] Results include pricing and capabilities

#### 2. Smart Workflow (3 calls)
- [ ] Call 1: discover_and_prepare_service
  - Discovers services
  - Health checks top candidates
  - Returns payment instructions
  - Creates session
- [ ] Call 2: execute_payment (client-side)
  - Claude Desktop signs transaction with user's wallet
  - Returns transaction signature
- [ ] Call 3: complete_service_with_payment
  - Verifies payment on-chain
  - Submits request to service
  - Auto-retries with backups if primary fails
  - Returns service result

#### 3. Payment Flow
- [ ] USDC balance sufficient
- [ ] Transaction signature valid base58
- [ ] Payment verified on Solana blockchain
- [ ] Service receives payment
- [ ] Transaction logged to database
- [ ] Receipt returned to user

#### 4. Error Handling
- [ ] Insufficient USDC balance
- [ ] Invalid transaction signature
- [ ] Service down (auto-retry with backup)
- [ ] Network timeout
- [ ] Payment failed (refund options shown)

#### 5. Load Testing
- [ ] 100 concurrent SSE connections
- [ ] Rate limiting triggers correctly
- [ ] Database handles concurrent writes
- [ ] No memory leaks

---

## 🔍 Known Issues & Risks

### Issues:
1. ⚠️ **SQLite data already lost** - User confirmed ephemeral storage, no data to migrate
2. ⚠️ **No existing services** - Need to seed from scratch
3. ⚠️ **SSE transport not yet implemented** - Core migration work
4. ⚠️ **Postgres adapter needed** - Database abstraction required

### Risks:
1. 🔴 **Breaking changes** - Removing stdio may break local dev workflows
2. 🟡 **Test failures** - 325 tests may need updates for SSE/Postgres
3. 🟡 **Railway deployment** - First time deploying MCP via SSE
4. 🟢 **Database migration** - Fresh start, no data to lose

### Mitigation:
- Extensive testing before Railway deployment
- Keep SQLite working for local development
- Rollback plan: revert to stdio if SSE fails
- Comprehensive error logging

---

## ✅ Completed Tasks

### Phase 1: Postgres Database Support ✅
- Installed pg and @types/pg npm packages
- Created DatabaseAdapter abstraction interface
- Extracted SQLiteAdapter from existing database.ts
- Created PostgresAdapter with JSONB optimization
- Updated Database class to auto-detect DATABASE_URL
- Converted UPSERT syntax (INSERT OR REPLACE → ON CONFLICT)
- Added database type detection to start-railway.js
- Updated .env.example with DATABASE_URL documentation
- Build successful (no TypeScript errors)

### Phase 2: SSE Transport for MCP ✅
- Created SSETransportManager class (src/mcp/SSETransport.ts)
- Integrated all 13 MCP tools (discover, purchase, smart tools, etc.)
- Added GET /mcp/sse endpoint for establishing SSE streams
- Added POST /mcp/message endpoint for bidirectional communication
- Shared ServiceRegistry, Database, SolanaVerifier, SpendingLimitManager
- Fixed tool handler signatures for purchaseService and spending limits
- Health check now shows active MCP session count
- Build successful with zero TypeScript errors

---

## 📊 Progress Tracking

**Overall Progress**: 25% (2/8 phases complete)

- [x] Phase 1: Postgres Support (10/10 tasks) ✅ COMPLETE
- [x] Phase 2: SSE Transport (8/8 tasks) ✅ COMPLETE
- [ ] Phase 3: Security (0/8 tasks)
- [ ] Phase 4: Tests (0/8 tasks)
- [ ] Phase 5: Seed Database (0/7 tasks)
- [ ] Phase 6: Railway Deployment (0/8 tasks)
- [ ] Phase 7: User Guide (0/5 tasks)
- [ ] Phase 8: E2E Testing (0/5 tasks)

**Total Tasks**: 59
**Completed**: 18
**Remaining**: 41

---

## 📝 Implementation Notes

### Database Architecture Decision: SHARED DATABASE ✅

**Rationale**:
- Single source of truth for services, transactions, ratings
- Real-time sync between web app and MCP server
- Simpler architecture (no sync logic needed)
- Already configured this way in apiServer.ts

**Implementation**:
```typescript
// Shared Database instance
const db = new Database(process.env.DATABASE_URL || './data/agentmarket.db');
const registry = new ServiceRegistry(db);

// Used by:
// 1. HTTP API Server (REST endpoints)
// 2. MCP SSE Server (MCP tools)
// 3. WebSocket Server (real-time updates)
```

### Transport Architecture: SSE ONLY ✅

**Rationale** (per user requirement):
- Production app deployed on Railway
- Users want access to ALL services from other providers
- No local testing needed (Railway is production)
- Simpler codebase with single transport

**Implementation**:
- Remove stdio transport completely
- Only SSE endpoint at /mcp/sse
- Claude Desktop connects remotely

### Authentication: PUBLIC ACCESS ✅

**Rationale** (per user requirement):
- x402 payment protocol provides access control
- Users pay per service request
- No need for API keys or pre-authentication
- Simpler UX for hackathon demo

**Implementation**:
- No auth required for MCP SSE endpoint
- Public CORS policy
- Rate limiting for abuse prevention

---

## 🚀 Next Steps

1. **Get user approval** for complete migration plan
2. **Start Phase 1**: Postgres database support
3. **Track progress** by updating this file after each task
4. **Test continuously** to catch issues early
5. **Deploy to Railway** after all tests pass

---

**Last Updated**: 2025-11-05 (Phase 1 & 2 Complete - 25% Progress)
**Next Update**: After Phase 3 completion
