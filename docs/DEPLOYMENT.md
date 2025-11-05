# Deployment Guide

> **Generated:** 2025-11-04
> **Version:** 1.0.0

## Overview

AgentMarket can be deployed in several configurations:

1. **Local Development** - MCP server + API server + Web dashboard on localhost
2. **Railway (Current)** - API server + Web dashboard on Railway cloud
3. **Docker** - Containerized deployment
4. **Custom VPS** - Self-hosted on any server

**Important:** The MCP server is designed for local use with Claude Desktop only (stdio transport). Railway deployment serves only the API server and web dashboard.

---

## Railway Deployment (Production)

### Current Configuration

**Live URL:** https://www.sentientexchange.com
**API URL:** Internal port 8081
**Database:** SQLite on persistent volume

### Initial Setup

1. **Connect Repository**
   - Go to https://railway.app
   - Create new project from GitHub repo
   - Select `agentMarket-mcp` repository

2. **Configure Build**

Railway automatically detects the Dockerfile. Configuration is in `railway.json`:

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node start-railway.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30
  }
}
```

3. **Environment Variables**

Set in Railway dashboard (Settings → Variables):

```bash
# Network configuration
NETWORK=mainnet-beta          # or devnet for testing
NODE_ENV=production

# Solana wallet for payments
SOLANA_PRIVATE_KEY=your-base58-private-key-here

# JWT authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Database path (Railway provides persistent volume)
DATABASE_PATH=/app/data/agentmarket.db

# Payment configuration
PAYMENT_MODE=hybrid
FACILITATOR_URL=https://facilitator.payai.network

# Ports (Railway sets PORT automatically)
API_PORT=8081

# Optional: Custom RPC
SOLANA_RPC_URL=https://your-rpc-endpoint.com
```

4. **Deploy**

Railway deploys automatically on every push to `master` branch.

### Manual Deployment

```bash
# Commit and push changes
git add .
git commit -m "Deploy update"
git push origin master

# Railway deploys automatically via GitHub webhook
```

### Post-Deployment

1. **Verify Health**
```bash
curl https://www.sentientexchange.com/health
```

2. **Seed Database**
```bash
curl -X POST https://www.sentientexchange.com/api/admin/seed
```

3. **Test API**
```bash
curl https://www.sentientexchange.com/api/services
```

### Monitoring

**Railway Dashboard:**
- View logs in real-time
- Monitor CPU/Memory usage
- Check deployment history
- View metrics

**Health Checks:**
Railway automatically pings `/health` endpoint. If unhealthy, it restarts the service.

### Troubleshooting

#### Build Failures

1. **Check build logs** in Railway dashboard
2. **Clear build cache:** Settings → Reset cache
3. **Verify Dockerfile** works locally:
```bash
docker build -t agentmarket .
docker run -p 8080:8080 agentmarket
```

#### Runtime Errors

1. **Check logs:** Railway dashboard → Logs tab
2. **Verify environment variables** are set correctly
3. **Check database:** Ensure persistent volume is mounted

#### Health Check Failures

The healthcheck expects a 200 response from `/health`:

```bash
curl -I https://www.sentientexchange.com/health
```

If failing:
- Check Next.js is starting properly
- Verify `web/app/health/route.ts` exists
- Check port configuration (should be 8080 for Railway)

---

## Docker Deployment

### Building Images

```bash
# Build production image
docker build -t agentmarket:latest .

# Or use docker-compose
docker-compose build
```

### Running Containers

#### Single Container

```bash
docker run -d \
  --name agentmarket \
  -p 8080:8080 \
  -p 8081:8081 \
  -v $(pwd)/data:/app/data \
  -e NETWORK=mainnet-beta \
  -e SOLANA_PRIVATE_KEY=your-key \
  -e JWT_SECRET=your-secret \
  agentmarket:latest
```

#### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  agentmarket:
    build: .
    ports:
      - "8080:8080"  # Web dashboard
      - "8081:8081"  # API server
    environment:
      - NETWORK=mainnet-beta
      - SOLANA_PRIVATE_KEY=${SOLANA_PRIVATE_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_PATH=/app/data/agentmarket.db
      - PAYMENT_MODE=hybrid
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Run with:

```bash
docker-compose up -d
```

### Docker Production Best Practices

1. **Use multi-stage builds** (already in Dockerfile)
2. **Run as non-root user**
3. **Limit resources:**
```bash
docker run \
  --memory="512m" \
  --cpus="1.0" \
  agentmarket:latest
```

4. **Enable logging:**
```bash
docker run \
  --log-driver=json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  agentmarket:latest
```

---

## Custom VPS Deployment

### Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 1 core | 2 cores |
| **RAM** | 512 MB | 2 GB |
| **Storage** | 10 GB | 20 GB SSD |
| **OS** | Ubuntu 22.04+ | Ubuntu 22.04+ |

### Setup Steps

#### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

#### 2. Clone and Build

```bash
# Clone repository
git clone https://github.com/your-org/agentMarket-mcp.git
cd agentMarket-mcp

# Install dependencies
npm install
cd web && npm install && cd ..

# Build application
npm run build
```

#### 3. Configure Environment

```bash
cp .env.example .env
nano .env
```

Set production values:
- `NETWORK=mainnet-beta`
- `NODE_ENV=production`
- Set `SOLANA_PRIVATE_KEY`, `JWT_SECRET`

#### 4. Start with PM2

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'agentmarket',
    script: 'start-railway.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

Start application:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 5. Configure Nginx

Create `/etc/nginx/sites-available/agentmarket`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }

    location /socket.io {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/agentmarket /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. Enable SSL

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot automatically configures SSL and redirects.

#### 7. Configure Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### Monitoring

```bash
# View logs
pm2 logs agentmarket

# Monitor resources
pm2 monit

# Restart application
pm2 restart agentmarket
```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SOLANA_PRIVATE_KEY` | Base58-encoded Solana wallet private key | `5Ke8m...` |
| `JWT_SECRET` | Secret for JWT token signing (64+ chars) | `8f7a9b2c...` |
| `NETWORK` | Solana network | `devnet` or `mainnet-beta` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_PATH` | SQLite database file path | `./data/agentmarket.db` |
| `PAYMENT_MODE` | Payment strategy | `hybrid` |
| `FACILITATOR_URL` | x402 facilitator endpoint | `https://facilitator.payai.network` |
| `SOLANA_RPC_URL` | Custom Solana RPC endpoint | Public RPC |
| `NODE_ENV` | Environment mode | `development` |
| `LOG_LEVEL` | Logging level | `info` |
| `API_PORT` | API server port | `8081` |
| `PORT` | Web dashboard port (Railway sets this) | `8080` |

### Security Best Practices

1. **Never commit secrets to git**
2. **Use strong JWT secrets** (generate with crypto.randomBytes)
3. **Rotate secrets regularly** (every 90 days)
4. **Use environment-specific secrets**
5. **Limit access** to production environment variables

---

## Database Migrations

### Current Schema Version: 1.0

If schema changes are needed:

1. **Backup database:**
```bash
cp data/agentmarket.db data/agentmarket.db.backup
```

2. **Create migration script:**
```typescript
// migrations/001-add-field.ts
export async function up(db: Database) {
  await db.run(`ALTER TABLE services ADD COLUMN new_field TEXT`);
}

export async function down(db: Database) {
  // Rollback logic
}
```

3. **Run migration:**
```bash
npm run migrate
```

### Backup Strategy

**Automated Daily Backups:**

```bash
# Add to crontab
0 2 * * * /app/scripts/backup-db.sh

# backup-db.sh
#!/bin/bash
DATE=$(date +%Y%m%d)
cp /app/data/agentmarket.db /app/backups/agentmarket-$DATE.db
find /app/backups -name "*.db" -mtime +30 -delete
```

---

## Scaling Considerations

### Vertical Scaling (Current)

Increase Railway resources:
- Memory: 512MB → 2GB
- CPU: 0.5 vCPU → 2 vCPU

### Horizontal Scaling (Future)

To scale beyond single instance:

1. **Replace SQLite with PostgreSQL**
```bash
# Add to Railway
railway add postgresql
```

2. **Add Redis for caching**
```bash
railway add redis
```

3. **Enable load balancing**
- Deploy multiple instances
- Use Railway's built-in load balancer

4. **Separate services**
- API server on one instance
- Web dashboard on another
- MCP server remains local only

---

## Monitoring and Logging

### Health Monitoring

Endpoint: `/health`

Returns:
```json
{
  "status": "healthy",
  "service": "agentmarket-web",
  "timestamp": "2024-11-04T10:30:00Z"
}
```

Set up monitoring with:
- **UptimeRobot** - Free uptime monitoring
- **Datadog** - Full observability
- **Railway built-in** - Basic metrics

### Application Logs

**Railway:** View in dashboard → Logs tab

**PM2:**
```bash
pm2 logs agentmarket
pm2 logs agentmarket --lines 100
pm2 logs agentmarket --err
```

**Docker:**
```bash
docker logs agentmarket
docker logs -f agentmarket  # Follow
```

### Log Levels

- `error` - Critical errors requiring immediate attention
- `warn` - Warning conditions
- `info` - General informational messages
- `debug` - Detailed diagnostic information

Set log level:
```bash
LOG_LEVEL=debug
```

---

## Security Checklist

Before deploying to production:

- [ ] Environment variables set and secured
- [ ] JWT secret is strong and unique
- [ ] Private keys never committed to git
- [ ] HTTPS enabled with valid certificate
- [ ] Firewall configured (only 80, 443, 22 open)
- [ ] Rate limiting enabled
- [ ] CORS configured for production domain
- [ ] Database backups automated
- [ ] Health monitoring configured
- [ ] Logs reviewed for security issues
- [ ] Dependencies updated (npm audit)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized outputs)

---

## Rollback Procedure

If deployment fails:

### Railway

1. Go to Deployments tab
2. Find last working deployment
3. Click "Redeploy"

### PM2

```bash
# Checkout previous version
git checkout <previous-commit>
npm run build
pm2 restart agentmarket
```

### Docker

```bash
# Use previous image
docker run agentmarket:v1.0.0
```

### Database Rollback

```bash
# Restore backup
cp data/agentmarket.db.backup data/agentmarket.db
pm2 restart agentmarket
```

---

## Cost Estimation

### Railway (Current Setup)

| Resource | Usage | Cost/Month |
|----------|-------|------------|
| **Compute** | ~100 hours | $5 |
| **Bandwidth** | ~10 GB | Included |
| **Storage** | 1 GB | Included |
| **Total** | | **~$5/month** |

Railway offers $5/month free tier for hobby projects.

### Custom VPS

| Provider | Specs | Cost/Month |
|----------|-------|------------|
| **DigitalOcean** | 1GB RAM, 1 vCPU | $6 |
| **Linode** | 2GB RAM, 1 vCPU | $12 |
| **AWS Lightsail** | 1GB RAM | $5 |

### Additional Costs

- **Domain name:** $10-15/year
- **Solana transactions:** Variable (devnet is free)
- **Monitoring:** Free tier available

---

## Next Steps

- [Architecture Overview](./ARCHITECTURE.md) - System design
- [API Documentation](./API.md) - API reference
- [Development Guide](./DEVELOPMENT.md) - Local development

## Support

For deployment issues:
- Check [GitHub Issues](https://github.com/your-org/agentMarket-mcp/issues)
- Railway Support: https://railway.app/help
- Solana Discord: https://discord.gg/solana
