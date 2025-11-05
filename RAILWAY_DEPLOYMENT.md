# Railway Deployment Guide

Complete guide for deploying SentientExchange MCP Server to Railway with PostgreSQL.

---

## 🚀 Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app/)
2. **GitHub Repository**: Push your code to GitHub
3. **Railway CLI** (optional): `npm install -g @railway/cli`

---

## 📋 Deployment Steps

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app/)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `agentMarket-mcp` repository
5. Railway will auto-detect Node.js and create the project

### Step 2: Add PostgreSQL Database

1. In your Railway project dashboard, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will provision a Postgres instance
4. **DATABASE_URL** is automatically set as an environment variable

### Step 3: Configure Environment Variables

In Railway dashboard, go to your service → "Variables" tab:

```bash
# Auto-provided by Railway
PORT=3000
DATABASE_URL=postgresql://... (auto-set by Postgres addon)

# Required - Set these manually
NODE_ENV=production
API_PORT=8081
LOG_LEVEL=info

# Required - Generate a strong secret
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">

# Required - Your production domains
ALLOWED_ORIGINS=https://sentientexchange.com,https://www.sentientexchange.com

# Solana Configuration
NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Payment Configuration
PAYMENT_MODE=hybrid
FACILITATOR_URL=https://facilitator.payai.network

# Optional
MAX_PAYMENT_VALUE=100000000
```

### Step 4: Generate JWT_SECRET

**Important**: Generate a cryptographically secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and paste it as `JWT_SECRET` in Railway environment variables.

**Example output** (do not use this!):
```
a3f9d8e7b6c5a4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1
```

### Step 5: Configure Custom Domain (Optional)

1. In Railway dashboard, go to "Settings" → "Domains"
2. Add custom domain: `sentientexchange.com`
3. Follow DNS configuration instructions
4. Update `ALLOWED_ORIGINS` to include your domain

### Step 6: Deploy

Railway auto-deploys on every push to `main` branch.

To manually trigger a deployment:
```bash
# Via Railway CLI
railway up

# Or via Git
git push origin main
```

### Step 7: Verify Deployment

Check deployment health:

```bash
# Health check
curl https://sentientexchange.com/api/pulse

# Expected response:
{
  "status": "ok",
  "uptime": "1h 23m 45s",
  "timestamp": "2025-11-05T19:30:00.000Z",
  "version": "1.0.0",
  "message": "🤖 SentientExchange is alive and thriving",
  "mcp": {
    "sseEndpoint": "/mcp/sse",
    "activeSessions": 0
  }
}
```

Check database connection:
```bash
# Stats endpoint (should show 0 services initially)
curl https://sentientexchange.com/api/stats

# Expected response:
{
  "success": true,
  "stats": {
    "services": 0,
    "transactions": 0,
    "volume": 0,
    "agents": 47
  }
}
```

### Step 8: Seed Production Database

Connect to Railway and run the seed script:

```bash
# Option 1: Via Railway CLI
railway run npm run seed

# Option 2: Via Railway shell
railway shell
node dist/scripts/seed-registry.js

# Option 3: Via API endpoint (if enabled)
curl -X POST https://sentientexchange.com/api/admin/seed \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Verify services were seeded:
```bash
curl https://sentientexchange.com/api/services

# Should return 15 services
```

### Step 9: Test MCP SSE Endpoint

Test SSE connection:
```bash
# Should establish SSE stream
curl -N https://sentientexchange.com/mcp/sse
```

You should see an SSE stream open (connection stays alive).

### Step 10: Connect Claude Desktop

Update your Claude Desktop config:

```json
{
  "mcpServers": {
    "sentientexchange": {
      "url": "https://sentientexchange.com/mcp/sse",
      "transport": "sse"
    }
  }
}
```

Restart Claude Desktop and verify:
- 🔌 MCP icon appears in toolbar
- "sentientexchange" server is listed
- Try: "Show me all available services on SentientExchange"

---

## 🔍 Monitoring & Debugging

### View Logs

```bash
# Via Railway CLI
railway logs

# Follow logs in real-time
railway logs --follow

# Filter by service
railway logs --service agentmarket-mcp
```

### Common Log Patterns to Monitor

**Successful SSE Connection**:
```
[INFO] SSE connection request { ip: '123.45.67.89', userAgent: 'Claude Desktop' }
[INFO] SSE stream established { sessionId: 'abc123...', activeSessions: 1 }
```

**MCP Tool Call**:
```
[INFO] MCP Tool Call: discover_services { tool: 'discover_services', argsPreview: '{"capabilities":["sentiment-analysis"]}' }
[INFO] MCP Tool Success: discover_services { duration: '145ms', success: true }
```

**Database Connection**:
```
[INFO] 🐘 Using PostgreSQL database (production)
[INFO] ✓ PostgreSQL adapter initialized
```

**Rate Limiting**:
```
[INFO] Rate limit hit { endpoint: '/mcp/message', ip: '123.45.67.89' }
```

### Health Monitoring

Set up monitoring alerts in Railway:
1. Go to "Observability" tab
2. Add alerts for:
   - HTTP 5xx errors
   - High memory usage (>80%)
   - High CPU usage (>80%)
   - Database connection errors

### Performance Metrics

Monitor via Railway dashboard:
- **Response Time**: Should be <500ms for API calls, <2s for MCP tools
- **Memory Usage**: Should stay under 512MB
- **CPU Usage**: Should stay under 50% average
- **Database Connections**: Should not exceed pool size (20)

---

## 🔒 Security Checklist

Before going to production:

- [ ] JWT_SECRET is strong (64+ characters, random hex)
- [ ] ALLOWED_ORIGINS is properly configured (no wildcards in production)
- [ ] NETWORK is set to `mainnet-beta` for production
- [ ] SOLANA_RPC_URL uses a reliable RPC provider (Helius, QuickNode, Triton)
- [ ] Rate limiters are enabled (check logs)
- [ ] HTTPS is enforced (Railway provides this automatically)
- [ ] Database backups are enabled in Railway
- [ ] Monitoring alerts are configured

---

## 🛠️ Troubleshooting

### Deployment Failed

**Check build logs**:
```bash
railway logs --deployment
```

Common issues:
- Missing dependencies: Run `npm install` locally
- TypeScript errors: Run `npm run build` locally
- Port conflicts: Railway sets `PORT` automatically

### Database Connection Errors

**Symptoms**: `Error: Connection refused` or `ECONNREFUSED`

**Solutions**:
1. Verify `DATABASE_URL` is set in Railway variables
2. Check Postgres addon is running
3. Restart the service

### SSE Connection Issues

**Symptoms**: Claude Desktop can't connect, "Failed to establish SSE stream"

**Solutions**:
1. Check CORS configuration in `src/middleware/security.ts`
2. Verify `/mcp/sse` endpoint is accessible: `curl -N https://your-domain.com/mcp/sse`
3. Check rate limiting hasn't blocked your IP
4. Check Railway logs for errors

### High Memory Usage

**Symptoms**: Service crashes with OOM (Out of Memory)

**Solutions**:
1. Upgrade Railway plan (more RAM)
2. Add memory limits to SSE transport (close stale connections)
3. Check for memory leaks in logs

### Slow Response Times

**Symptoms**: API calls take >2 seconds

**Solutions**:
1. Check database indexes (JSONB GIN indexes should be present)
2. Use connection pooling (already configured in PostgresAdapter)
3. Add Redis caching for frequently accessed services
4. Upgrade Railway plan (more CPU)

---

## 📊 Scaling Considerations

### Horizontal Scaling

Railway supports horizontal scaling:
1. Go to service settings
2. Enable "Replicas"
3. Set min/max replicas

**Note**: SSE sessions are in-memory, so use sticky sessions or Redis for session storage.

### Database Scaling

PostgreSQL can be scaled in Railway:
1. Upgrade Postgres plan for more connections
2. Enable read replicas for read-heavy workloads
3. Use connection pooling (already configured)

### CDN for Static Assets

If serving web UI:
1. Use Railway's built-in CDN
2. Or use Cloudflare for additional DDoS protection

---

## 🔄 CI/CD Pipeline

Railway auto-deploys on every push to `main`. To customize:

1. **Create `.railway.json`**:
```json
{
  "build": {
    "command": "npm run build"
  },
  "deploy": {
    "command": "npm run start:railway",
    "healthcheckPath": "/api/pulse"
  }
}
```

2. **Add GitHub Actions** (optional):
   - Run tests before deployment
   - Notify on successful deployment
   - Run database migrations

---

## 📈 Cost Estimation

**Railway Pricing** (as of 2024):

- **Hobby Plan**: $5/month
  - 512MB RAM, 1 vCPU
  - Good for testing

- **Pro Plan**: $20/month + usage
  - 8GB RAM, 8 vCPU
  - Good for production

- **PostgreSQL**: Included in Pro plan
  - 1GB storage included
  - Additional storage: $0.10/GB/month

**Estimated monthly cost for SentientExchange**:
- Pro Plan: $20
- PostgreSQL (10GB): $1
- Traffic (100GB): $2
- **Total**: ~$23/month

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Railway CLI Reference](https://docs.railway.app/develop/cli)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [PostgreSQL on Railway](https://docs.railway.app/databases/postgresql)

---

**🎉 Deployment Complete!**

Your SentientExchange MCP server is now live and accessible to Claude Desktop users worldwide.
