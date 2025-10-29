---
name: deploy-gcp
description: Deploy to Google Cloud Platform production environment
---

Deploy AgentMarket MCP to Google Cloud Platform using $300 free credits:

## Prerequisites
1. Verify GCP account set up with billing enabled
2. Install and authenticate gcloud CLI
3. Set project ID: `gcloud config set project PROJECT_ID`
4. Enable required APIs:
   - Cloud Run
   - Container Registry
   - Cloud SQL (or Firestore)
   - Cloud Load Balancing
   - Cloud Monitoring
   - Cloud Logging

## Step 1: Build & Push Docker Images
- Build all containers locally with `/docker-build-all`
- Tag with version and `latest`
- Push to Google Container Registry (gcr.io/PROJECT_ID/)
- Verify images uploaded successfully

## Step 2: Deploy Database
**Option A: Cloud SQL (PostgreSQL)**
- Create Cloud SQL instance (db-f1-micro for free tier)
- Initialize schema from src/registry/database.ts
- Set up automatic backups

**Option B: Firestore (Recommended for free tier)**
- Enable Firestore in Native mode
- Adapt code to use Firestore instead of SQLite
- Set up indexes for queries

## Step 3: Deploy MCP Server to Cloud Run
```bash
gcloud run deploy agentmarket-mcp \
  --image gcr.io/PROJECT_ID/agentmarket-mcp:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_PATH=/data/db,NETWORK=base-sepolia \
  --set-secrets CDP_API_KEY_NAME=cdp-key-name:latest \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10
```

## Step 4: Deploy Example Services
Deploy each service (image-analyzer, sentiment-analyzer, text-summarizer) to Cloud Run with:
- x402 payment endpoints
- Health check routes
- Appropriate memory/CPU limits
- Environment variables for wallets

## Step 5: Configure Networking
- Set up Cloud Load Balancer (optional, for custom domain)
- Configure Cloud Armor for DDoS protection
- Set up Cloud CDN (if serving static content)
- Configure SSL certificates

## Step 6: Set Up Monitoring
- Enable Cloud Monitoring dashboards
- Create uptime checks for all services
- Set up alerting policies:
  - Service downtime
  - High error rates
  - High latency (>2s)
  - Low wallet balance
- Configure Cloud Logging with structured logs

## Step 7: Configure Secrets
Store sensitive data in Secret Manager:
- CDP API keys
- Wallet private keys
- Database credentials
- Any API tokens

## Step 8: Smoke Tests
Run automated tests on production URLs:
- Test MCP server health endpoint
- Test service discovery
- Execute test payment on Base Sepolia
- Verify database connectivity
- Check logging and monitoring

## Step 9: DNS Configuration (if using custom domain)
- Point domain to Cloud Run service URL
- Configure SSL/TLS
- Verify HTTPS working

## Step 10: Generate Deployment Report
Create comprehensive report with:
- All service URLs
- MCP server endpoint for Claude Desktop
- Example service endpoints
- Monitoring dashboard links
- Cost estimate (should be near $0 with free tier)
- Deployment timestamp
- Version deployed
- Configuration summary

Save deployment info for hackathon submission.

## Rollback Plan
If deployment fails:
1. Check Cloud Logging for errors
2. Verify environment variables set correctly
3. Check secrets accessible
4. Test database connectivity
5. Roll back to previous version if needed

Display deployment summary with all URLs and next steps for connecting Claude Desktop.
