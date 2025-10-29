---
name: security-audit
description: Comprehensive security audit and vulnerability scan
---

Run complete security audit to ensure production-ready code:

## 1. Secret Detection
**Scan for hardcoded secrets:**
- API keys (patterns: `api_key`, `apikey`, etc.)
- Private keys (regex: `/0x[a-fA-F0-9]{64}/`)
- Passwords and tokens
- AWS/GCP credentials
- Database connection strings
- JWT secrets

**Check git history:**
- Scan last 100 commits for secrets
- Look for committed .env files
- Check for removed-but-tracked sensitive files

**Tools to use:**
- gitleaks
- trufflehog
- Custom regex patterns

## 2. Dependency Vulnerabilities
**Run npm audit:**
```bash
npm audit --audit-level=high
```
- Report all HIGH and CRITICAL vulnerabilities
- Show affected packages and versions
- Suggest fixes (npm audit fix)

**Run Snyk scan:**
```bash
npx snyk test
```
- Deeper vulnerability analysis
- Check for license issues
- Database of known CVEs

## 3. Docker Security
**Scan all images with Trivy:**
```bash
trivy image agentmarket-mcp:latest --severity HIGH,CRITICAL
```

**Check for:**
- Outdated base images
- Vulnerable system packages
- Running as root user
- Exposed sensitive files
- Excessive permissions

## 4. Code Vulnerabilities

**SQL Injection:**
- Verify all queries use parameterized statements
- Check no string concatenation in SQL
- Review database.ts thoroughly

**Input Validation:**
- All MCP tool inputs validated
- Type checking on all parameters
- Sanitization of user input
- Max length constraints

**Authentication & Authorization:**
- Check payment verification logic
- Ensure wallet signatures validated
- Verify transaction ownership
- Rate limiting implemented

**XSS Prevention:**
- MCP tool responses properly escaped
- No innerHTML or dangerous HTML
- Content-Type headers set correctly

## 5. Configuration Security

**Environment Variables:**
- No secrets in .env committed to git
- .env.example has placeholder values only
- Verify .gitignore includes .env files

**CORS Configuration:**
- Appropriate CORS headers
- Not set to `*` in production
- Origin validation

**Error Handling:**
- Errors don't expose sensitive info
- Stack traces not sent to client in prod
- Proper error logging without secrets

## 6. Payment Security

**CDP Wallet:**
- Private keys stored in env vars only
- Never logged or displayed
- Proper key rotation strategy

**x402 Implementation:**
- Payment amounts validated
- Replay attack prevention
- Transaction verification on-chain
- Timeout handling
- Max payment limits enforced

## 7. Network Security

**Rate Limiting:**
- Implement on all endpoints
- 100 requests/min per IP
- DDoS protection

**Headers:**
- Security headers set (Helmet.js)
- HSTS enabled
- X-Frame-Options set
- CSP configured

## 8. Database Security

**SQLite:**
- Database file permissions (600)
- No sensitive data in plaintext
- Prepared statements only
- Connection limits set

## 9. Logging Security

**Verify:**
- No passwords in logs
- No private keys in logs
- No credit card numbers
- PII properly masked
- Audit trail for payments

## 10. Generate Security Report

Create comprehensive report:
```json
{
  "timestamp": "2025-10-28T...",
  "scanners": ["gitleaks", "npm-audit", "snyk", "trivy", "custom"],
  "results": {
    "secrets": { "found": 0, "severity": "NONE" },
    "dependencies": { "high": 0, "critical": 0 },
    "codeVulnerabilities": { "issues": [] },
    "docker": { "vulnerabilities": 0 },
    "configuration": { "issues": [] }
  },
  "passFail": "PASS",
  "recommendations": []
}
```

Save to: `security-reports/audit-TIMESTAMP.json`

## Success Criteria
- Zero secrets in code or git history
- Zero HIGH or CRITICAL npm vulnerabilities
- Zero HIGH or CRITICAL Docker vulnerabilities
- All payment logic secured
- All inputs validated
- Proper error handling
- Security headers configured

**Fail the audit if any critical issues found.**

Display summary with total issues found by severity and specific actions to fix each issue.
