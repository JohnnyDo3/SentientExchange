# Security Policy

## 🔒 Security Overview

AI-Permit-Tampa implements multiple layers of security to protect user data, prevent attacks, and ensure safe payment processing.

---

## 🛡️ Security Features

### 1. Payment Security (x402)

**Replay Attack Prevention**
- Transaction hash tracking to prevent reuse
- In-memory Set storage with periodic cleanup
- Each payment can only be used once

**Payment Validation**
```typescript
✅ Network verification (base-sepolia / base)
✅ Recipient address verification
✅ Amount verification (with 0.1% tolerance)
✅ Asset verification (USDC only)
✅ Transaction structure validation
```

**Security Considerations**
- Wallet private keys NEVER logged or exposed
- All payments verified before service delivery
- Overpayments logged but accepted
- Underpayments rejected immediately

### 2. Input Validation

**Zod Schema Validation**
- All user inputs validated with Zod schemas
- Type-safe request handling
- Detailed error messages (without exposing internals)

**SQL Injection Prevention**
- No direct SQL queries (using ORMs/query builders)
- Parameterized queries only
- Input sanitization helper functions

**XSS Prevention**
- HTML tag removal in user inputs
- Script injection characters stripped
- Content-Type headers enforced

### 3. Infrastructure Security

**Express.js Middleware Stack**
```
1. Helmet.js → Security headers
2. CORS → Cross-origin protection
3. Rate Limiting → 100 req/15 min per IP
4. Body Parser → JSON limits (10MB max)
5. Morgan/Winston → Request logging
6. x402 Middleware → Payment verification
```

**Docker Security**
- Multi-stage builds (minimal image size)
- Non-root user (nodejs:1001)
- Read-only filesystem where possible
- No unnecessary privileges
- Health checks configured
- Resource limits enforced

**Environment Variables**
- All secrets in .env (never committed)
- .env files in .gitignore
- Production secrets injected at runtime
- No hardcoded credentials

### 4. API Security

**Rate Limiting**
- Global: 100 requests / 15 minutes / IP
- Configurable via `RATE_LIMIT_*` env vars
- Returns 429 Too Many Requests when exceeded
- Standard headers included

**Error Handling**
- Generic error messages in production
- Detailed errors only in development
- No stack traces exposed
- All errors logged server-side

**HTTPS/TLS**
- Required in production
- Enforced via reverse proxy (nginx/Cloudflare)
- Certificate management automated

---

## 🚨 Vulnerability Reporting

### Responsible Disclosure

If you discover a security vulnerability, please email:

**security@agentmarket.ai**

**Please include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Please DO NOT:**
- Disclose publicly before we've addressed it
- Test on production systems
- Access/modify other users' data

**Our Commitment:**
- Acknowledge within 24 hours
- Provide status updates every 72 hours
- Credit reporters (with permission)
- Fix critical issues within 7 days

---

## 🔍 Security Audit Checklist

### Pre-Deployment Checklist

**Environment & Configuration**
- [ ] All `.env` files in `.gitignore`
- [ ] Production secrets rotated
- [ ] `NODE_ENV=production` set
- [ ] Debug logging disabled
- [ ] HTTPS/TLS enabled
- [ ] CORS origins restricted
- [ ] Rate limits configured

**Dependencies**
- [ ] `npm audit` passing (no high/critical)
- [ ] All dependencies up-to-date
- [ ] No unused dependencies
- [ ] Lockfile committed (`package-lock.json`)

**Code Security**
- [ ] No hardcoded secrets
- [ ] No console.log in production
- [ ] Input validation on all endpoints
- [ ] Output encoding for user data
- [ ] Error handling complete
- [ ] Logging comprehensive

**Infrastructure**
- [ ] Docker image scanned (Trivy/Snyk)
- [ ] Container runs as non-root
- [ ] Health checks configured
- [ ] Resource limits set
- [ ] Graceful shutdown implemented
- [ ] Monitoring/alerting configured

**Payment Security**
- [ ] Wallet address verified
- [ ] Network configuration correct
- [ ] Replay attack prevention active
- [ ] Payment validation comprehensive
- [ ] Transaction logging enabled

**Testing**
- [ ] Unit tests passing (70%+ coverage)
- [ ] Integration tests passing
- [ ] Security tests passing
- [ ] Load testing complete
- [ ] Penetration testing complete

---

## 🔐 Accela API Security

**OAuth 2.0**
- Client credentials flow
- Token caching with automatic refresh
- Tokens expire after 1 hour
- Refresh tokens used when available

**API Key Management**
- Keys stored in environment variables only
- Keys rotated quarterly
- Access logs monitored
- API usage tracked

**Data Handling**
- PII encrypted in transit (HTTPS)
- Minimal data retention
- No sensitive data in logs
- County data cached (max 1 hour)

---

## 📊 Monitoring & Logging

**Security Monitoring**
- Failed payment attempts logged
- Rate limit violations logged
- Authentication failures logged
- Unusual patterns alerted

**Logging Best Practices**
- Winston structured logging
- Log levels: error, warn, info, debug
- No sensitive data in logs
- Logs rotated daily
- Logs retained 30 days

**Metrics (Prometheus)**
- Request counts by endpoint
- Payment success/failure rates
- Response times
- Error rates
- Rate limit hits

---

## 🚀 Production Hardening

### Recommended Production Setup

**Reverse Proxy (nginx)**
```nginx
server {
    listen 443 ssl http2;
    server_name permits.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
    }
}
```

**Firewall Rules**
- Only ports 80/443 exposed
- SSH restricted to known IPs
- Database ports not exposed
- Internal services isolated

**Monitoring & Alerting**
- Uptime monitoring (UptimeRobot, Pingdom)
- Error rate alerts
- Performance degradation alerts
- SSL certificate expiry alerts
- Disk space alerts

---

## 🧪 Security Testing

### Automated Security Scanning

**npm audit**
```bash
npm audit --production
# Fix high/critical vulnerabilities
npm audit fix
```

**Snyk**
```bash
snyk test
snyk monitor
```

**Trivy (Docker)**
```bash
trivy image ai-permit-tampa:latest
```

**OWASP ZAP**
```bash
# Run ZAP proxy against staging
zap-cli quick-scan http://staging.yourdomain.com
```

### Manual Security Testing

**x402 Payment Testing**
- [ ] Test replay attack prevention
- [ ] Test wrong network
- [ ] Test wrong recipient
- [ ] Test insufficient amount
- [ ] Test wrong asset
- [ ] Test malformed payment proof

**Input Validation Testing**
- [ ] Test SQL injection
- [ ] Test XSS attacks
- [ ] Test command injection
- [ ] Test path traversal
- [ ] Test buffer overflow
- [ ] Test SSRF

**Authentication Testing**
- [ ] Test rate limiting
- [ ] Test concurrent requests
- [ ] Test invalid tokens
- [ ] Test expired tokens

---

## 📚 Security Resources

**OWASP Top 10**
- https://owasp.org/www-project-top-ten/

**Node.js Security Best Practices**
- https://nodejs.org/en/docs/guides/security/

**Express.js Security**
- https://expressjs.com/en/advanced/best-practice-security.html

**Docker Security**
- https://docs.docker.com/engine/security/

**x402 Protocol Security**
- https://github.com/coinbase/x402

---

## 🔄 Security Update Policy

**Critical Vulnerabilities**
- Patched within 24 hours
- Hotfix deployed immediately
- Users notified via email

**High Vulnerabilities**
- Patched within 7 days
- Deployed in next release
- Security advisory published

**Medium/Low Vulnerabilities**
- Patched within 30 days
- Bundled in regular releases
- Mentioned in changelog

---

## 📝 Security Changelog

### 2025-01-30
- Initial security implementation
- x402 payment validation
- Rate limiting enabled
- Input sanitization added
- Docker security hardened
- Logging & monitoring configured

---

**Last Updated**: 2025-01-30
**Next Review**: 2025-02-28
