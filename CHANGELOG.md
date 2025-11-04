# Changelog

All notable changes to AgentMarket MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Comprehensive documentation suite (README, SETUP, ARCHITECTURE, API)
- WebSocket real-time marketplace updates
- Audit logging for all service changes
- Multi-chain payment address support (7 blockchains)
- Service ownership verification for updates/deletes
- Advanced service search with multiple filters
- JWT authentication with SIWE wallet signing
- Rate limiting with tiered limits
- Frontend service registration UI with tag suggestions
- Test coverage (119+ tests, 85%+ coverage)

### Changed
- Replaced all console.log with structured logger
- Enhanced security with production JWT_SECRET validation
- Improved database schema with created_by/updated_by/deleted_at columns

### Fixed
- Chain removal button in service registration form
- Tag removal triggering form validation popup
- Gradient text clipping on service registration heading
- Test failures in registry tests (schema mismatch)
- TypeScript build errors with logger imports

---

## [0.2.0] - 2025-10-28

### Added
- REST API Server with Express
  - 18 endpoints for complete marketplace functionality
  - Authentication endpoints (SIWE + JWT)
  - Service CRUD operations
  - Advanced search and filtering
  - Ratings and reviews system
  - Analytics and stats endpoints
- WebSocket server with Socket.IO
  - Real-time service updates
  - New transaction broadcasts
  - Live marketplace events
- Security middleware
  - Helmet security headers
  - CORS configuration
  - Rate limiting (3 tiers)
  - Input sanitization
  - Request size limits
- Authentication system
  - SIWE (Sign-In with Ethereum) implementation
  - JWT token generation and validation
  - Nonce-based authentication flow
  - Wallet-based user identification
- Input validation
  - Zod schemas for all endpoints
  - Request body validation
  - Query parameter validation
- Service Registry enhancements
  - Multi-chain support (Ethereum, Base, Polygon, Arbitrum, Optimism, Solana)
  - Payment address mapping by chain ID
  - Service ownership tracking
  - Soft delete functionality
- Database enhancements
  - Audit log table for change tracking
  - Foreign key constraints
  - Additional indexes for performance
  - Schema versioning
- Frontend web interface
  - Service marketplace browser
  - Service registration form
  - Multi-chain payment configuration
  - Tag/capability suggestions
  - Real-time updates via WebSocket

### Changed
- Service schema expanded to 14 columns
- Database initialization with comprehensive indexes
- Payment flow to support multiple blockchains
- Service metadata to include payment addresses per chain

### Fixed
- Jest configuration typo (coverageThresholds → coverageThreshold)
- Test database schema mismatches

---

## [0.1.0] - 2025-10-28

### Added
- **MCP Server Implementation**
  - Model Context Protocol server with stdio transport
  - 7 MCP tools for AI agent integration:
    1. `discover_services` - Search marketplace
    2. `get_service_details` - Get service information
    3. `purchase_service` - Buy and execute services
    4. `rate_service` - Submit ratings
    5. `wallet_balance` - Check USDC balance
    6. `list_transactions` - View payment history
    7. `list_services` - Browse all services
  - Claude Desktop integration support
  - Graceful error handling
  - Transaction logging

- **Service Registry**
  - In-memory caching with Map for fast lookups
  - SQLite persistence layer
  - Service CRUD operations
  - Advanced search with filters (capabilities, price, rating)
  - Reputation system (ratings, reviews, success metrics)
  - Service metadata management

- **Payment System**
  - WalletManager for CDP Smart Account management
  - X402Client for HTTP 402 payment protocol
  - Automatic USDC payments on Base blockchain
  - Transaction tracking and logging
  - Payment verification
  - Multi-network support (base-sepolia, base mainnet)

- **Database**
  - SQLite database with 4 tables:
    - `services` - Service listings
    - `transactions` - Payment history
    - `ratings` - User reviews
    - `audit_log` - Change tracking
  - Foreign key relationships
  - Indexes for query performance
  - Promisified API for async/await
  - Automatic schema initialization

- **Development Infrastructure**
  - TypeScript configuration
  - Jest test framework setup
  - ESLint configuration (pending)
  - npm scripts for build, test, dev
  - Environment configuration with dotenv
  - Hot reload with nodemon
  - Git repository initialization

- **Documentation**
  - README.md with project overview
  - CLAUDE.md with AI agent instructions
  - .env.example with configuration template
  - Code comments and JSDoc annotations

- **Example Services**
  - Sentiment Analyzer (x402 service)
  - Service registration scripts
  - Database seeding utilities

### Infrastructure
- Node.js 20+ runtime
- TypeScript 5.0+ for type safety
- Express 5.1.0 for API server
- Socket.IO 4.8.1 for WebSocket
- SQLite 5.1.7 for database
- Coinbase CDP SDK 0.25.0 for payments
- @modelcontextprotocol/sdk 1.20.2 for MCP
- ethers 6.15.0 for Ethereum utilities

---

## Version History

### Version Numbering

AgentMarket follows [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH

MAJOR: Incompatible API changes
MINOR: New functionality (backwards-compatible)
PATCH: Bug fixes (backwards-compatible)
```

### Release Timeline

- **v0.1.0** (2025-10-28) - Initial foundation (Day 1)
  - MCP server
  - Service registry
  - Payment system
  - Database

- **v0.2.0** (2025-10-28) - Core infrastructure (Day 2-7)
  - REST API
  - Authentication
  - Frontend UI
  - Testing
  - Security

- **v1.0.0** (TBD) - Production release
  - Complete documentation
  - 80%+ test coverage
  - Production deployment
  - Security audit

---

## Feature Roadmap

### v0.3.0 (Planned - Day 8-9)
- [ ] Complete documentation suite
- [ ] Inline JSDoc comments
- [ ] API documentation with examples
- [ ] Architecture diagrams
- [ ] Setup guides

### v0.4.0 (Planned - Day 9-10)
- [ ] Production deployment to GCP
- [ ] Docker containerization
- [ ] CI/CD pipeline with GitHub Actions
- [ ] Monitoring and logging
- [ ] Performance optimization

### v1.0.0 (Planned - Week 2)
- [ ] Security audit
- [ ] Load testing
- [ ] Production hardening
- [ ] User documentation
- [ ] Video tutorials
- [ ] Hackathon submission

### v1.1.0 (Future)
- [ ] Service categories and tags
- [ ] Full-text search
- [ ] Service analytics dashboard
- [ ] Batch payments
- [ ] Subscription plans
- [ ] GraphQL API

### v2.0.0 (Future)
- [ ] Decentralized registry (smart contracts)
- [ ] NFT-based reputation
- [ ] On-chain dispute resolution
- [ ] Service composition (chaining)
- [ ] Multi-currency support (ETH, BTC)

---

## Migration Guides

### Upgrading from v0.1.0 to v0.2.0

**Breaking Changes:**
- Service schema changed from 11 to 14 columns
- Added `created_by`, `updated_by`, `deleted_at` columns

**Migration Steps:**

1. **Backup your database:**
   ```bash
   cp data/agentmarket.db data/agentmarket.db.backup
   ```

2. **Update dependencies:**
   ```bash
   npm install
   ```

3. **Rebuild project:**
   ```bash
   npm run clean
   npm run build
   ```

4. **Database migration:**
   ```bash
   # The database will auto-migrate on startup
   npm start
   ```

5. **Update environment variables:**
   ```bash
   # Add new optional variables to .env
   API_PORT=3333
   JWT_SECRET=your-secret-key
   ```

6. **Test the migration:**
   ```bash
   npm test
   ```

**New Features:**
- REST API now available at `http://localhost:3333`
- WebSocket events for real-time updates
- SIWE authentication for wallet-based login
- Multi-chain payment support

---

## Deprecation Notices

### v0.2.0
- **Deprecated:** `console.log` usage - Use `logger` utility instead
- **Removed in:** v1.0.0

---

## Security Updates

### v0.2.0 (2025-10-28)
- **[SECURITY]** Added JWT_SECRET production validation
- **[SECURITY]** Implemented rate limiting (3 tiers)
- **[SECURITY]** Added Helmet security headers
- **[SECURITY]** Implemented input sanitization
- **[SECURITY]** Added CORS protection

### v0.1.0 (2025-10-28)
- **[SECURITY]** CDP Smart Accounts (no private key management)
- **[SECURITY]** SQL injection prevention (prepared statements)
- **[SECURITY]** Environment variable validation

---

## Contributors

### Core Team
- **AgentMarket Team** - Initial development

### Special Thanks
- Anthropic - Claude AI assistance
- Coinbase - CDP SDK and infrastructure
- Model Context Protocol - MCP specification

---

## License

This project is licensed under the **AgentMarket Source-Available License** - see the [LICENSE](LICENSE) file for details.

The code is available for viewing and evaluation only. Use, modification, or distribution requires explicit permission.

---

## Support

- **Documentation:** https://docs.agentmarket.xyz
- **GitHub Issues:** https://github.com/agentmarket/agentmarket-mcp/issues
- **Discord:** [coming soon]
- **Twitter:** [@agentmarket](https://twitter.com/agentmarket)

---

**Note:** This changelog is automatically updated with each release. For the latest changes, see the [commit history](https://github.com/agentmarket/agentmarket-mcp/commits).
