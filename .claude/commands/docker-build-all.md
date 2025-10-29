---
name: docker-build-all
description: Build all Docker containers for the project
---

Build complete containerized environment for AgentMarket MCP:

## 1. Build MCP Server Container
**File**: `docker/mcp-server.Dockerfile`

Multi-stage build:
- Stage 1 (builder): Install dependencies, compile TypeScript
- Stage 2 (runtime): Copy dist/, install production deps only
- Use Node 20 Alpine for minimal size
- Run as non-root user (node:node)
- Expose necessary ports
- Add HEALTHCHECK command
- Tag with version from package.json

## 2. Build Example Services
Create containers for:
- **image-analyzer**: Image analysis with x402 payment (port 3001)
- **sentiment-analyzer**: Sentiment analysis service (port 3002)
- **text-summarizer**: Text summarization service (port 3003)

Each service:
- Express.js server with x402 middleware
- Payment verification logic
- Rate limiting (100 req/min)
- Winston logging
- Prometheus metrics endpoint
- Health check endpoint

## 3. Security Scanning
Run Trivy scan on all images:
```bash
trivy image agentmarket-mcp:latest --severity HIGH,CRITICAL
trivy image image-analyzer:latest --severity HIGH,CRITICAL
trivy image sentiment-analyzer:latest --severity HIGH,CRITICAL
trivy image text-summarizer:latest --severity HIGH,CRITICAL
```

Fail build if any HIGH or CRITICAL vulnerabilities found.

## 4. Generate SBOM
Create Software Bill of Materials for each image:
```bash
syft agentmarket-mcp:latest -o json > sbom-mcp-server.json
```

## 5. Local Testing with Docker Compose
**File**: `docker/docker-compose.yml`

Start all containers and verify:
- All containers start successfully
- Health checks pass within 30 seconds
- Services can communicate
- MCP server can call example services

## 6. Resource Analysis
Check resource usage:
- Memory consumption per container
- CPU usage under idle and load
- Image sizes (should be <500MB each)
- Network bandwidth usage

## 7. Push to Registry
If all tests pass, push to Google Container Registry:
```bash
docker tag agentmarket-mcp:latest gcr.io/PROJECT_ID/agentmarket-mcp:latest
docker push gcr.io/PROJECT_ID/agentmarket-mcp:latest
```

## 8. Reporting
Generate build report with image sizes, security scan results, SBOM locations, container registry URLs, and deployment instructions.

Display summary with next steps for deployment.
