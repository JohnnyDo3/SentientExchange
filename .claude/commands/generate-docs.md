---
name: generate-docs
description: Auto-generate all project documentation
---

Generate comprehensive documentation for hackathon submission:

## 1. API Documentation (API.md)
**Extract from MCP server:**
- List all MCP tools with names and descriptions
- Document input schemas with parameter types
- Document output formats
- Include example requests and responses
- Document error codes and meanings

**Format:**
```markdown
# AgentMarket API Documentation

## Tools

### discover_services
**Description:** Search for AI services by capability, price, or rating

**Input Schema:**
- capability (string, optional): Service capability to search for
- maxPrice (string, optional): Maximum price per request
- minRating (number, optional): Minimum rating (1-5)
- limit (number, optional): Max results to return

**Output:**
{ count: number, services: Service[] }

**Example:**
...
```

## 2. Type Documentation (TYPES.md)
**Extract from src/types/:**
- Document all TypeScript interfaces
- Include JSDoc comments
- Show relationships between types
- Document enums and constants

Generate from:
- Service interface
- Transaction interface
- Rating interface
- ServiceSearchQuery interface

## 3. Architecture Documentation (ARCHITECTURE.md)
**Create diagrams:**
- System architecture diagram (Mermaid or ASCII art)
- Data flow diagrams
- Payment flow sequence diagram
- Database schema diagram

**Sections:**
- Component overview
- Technology stack
- Design decisions
- Scalability considerations
- Security architecture

## 4. Development Guide (DEVELOPMENT.md)
**Extract from code and comments:**
- Setup instructions (detailed)
- Development workflow
- Running tests
- Debugging tips
- Common issues and solutions
- Code organization
- Contributing guidelines

## 5. Deployment Guide (DEPLOYMENT.md)
**Document deployment process:**
- Prerequisites (GCP account, gcloud CLI)
- Environment setup
- Docker build process
- GCP deployment steps
- Configuration management
- Monitoring setup
- Rollback procedures
- Cost optimization tips

## 6. Troubleshooting Guide (TROUBLESHOOTING.md)
**Common issues and fixes:**
- MCP server won't start
- Payment failures
- Database connection errors
- CDP wallet issues
- Network errors
- Performance problems
- Docker issues

**Format:**
```markdown
### Issue: "Insufficient USDC balance"
**Symptoms:** Payment fails with balance error
**Cause:** Wallet doesn't have enough testnet USDC
**Solution:**
1. Check balance: [command]
2. Get testnet USDC from faucet
3. Verify transaction confirmed
```

## 7. CHANGELOG.md
**Generate from git history:**
- Group commits by type (feat, fix, docs, etc.)
- Use conventional commits format
- Include version numbers
- Add dates for each release
- Highlight breaking changes

**Use commitizen or conventional-changelog**

## 8. Update README.md
**Ensure README contains:**
- Project description and value proposition
- Hackathon track information
- Quick start guide
- Installation instructions
- Configuration guide
- Usage examples
- Links to all other documentation
- Demo video link (when available)
- Live deployment URL
- License and credits
- Badges (build status, coverage, etc.)

## 9. OpenAPI Specification (openapi.yml)
**For x402 services:**
- Document all endpoints
- Request/response schemas
- Authentication (x402 payment)
- Examples for each endpoint
- Error responses

Can be used to generate interactive API docs with Swagger UI

## 10. Example Code
**Create examples/ directory:**
- Claude Desktop configuration example
- MCP client usage example
- Creating a new x402 service example
- Testing payment flow example
- Adding a new MCP tool example

## Automation
Use tools where possible:
- TypeDoc for TypeScript documentation
- JSDoc comments → Markdown
- Mermaid for diagrams
- conventional-changelog for CHANGELOG
- OpenAPI generator for API specs

## Validation
**Check all docs:**
- No broken links
- Code examples actually work
- Diagrams render correctly
- Markdown formatted properly
- No TODOs or placeholders
- Version numbers consistent
- Screenshots up-to-date

## Output
Generate all documentation files in `docs/` directory:
```
docs/
├── API.md
├── TYPES.md
├── ARCHITECTURE.md
├── DEVELOPMENT.md
├── DEPLOYMENT.md
├── TROUBLESHOOTING.md
├── CHANGELOG.md
├── images/
│   ├── architecture.png
│   ├── payment-flow.png
│   └── screenshots/
└── examples/
    ├── claude-config.json
    ├── client-usage.ts
    └── create-service.ts
```

Update root README.md with links to all documentation.

Display summary with documentation coverage, word count, and links to each file.
