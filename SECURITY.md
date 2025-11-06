# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in AgentMarket, please report it by emailing the maintainers. **Do not create a public GitHub issue.**

We take all security reports seriously and will respond within 48 hours.

---

## Known Security Issues

This section documents known vulnerabilities in our dependencies that we are **accepting with mitigation strategies** until patches become available.

### 🔴 HIGH: @solana/spl-token (bigint-buffer Buffer Overflow)

**Status**: ⚠️ **ACCEPTED - NO PATCH AVAILABLE**

**Details**:

- **CVE**: CVE-2025-3194
- **GHSA**: GHSA-3gc7-fjrx-p6mg
- **Severity**: 7.5/10 (HIGH)
- **Vulnerability**: Buffer overflow in `bigint-buffer` package's `toBigIntLE()` function
- **Affected**: @solana/spl-token >=0.2.0 (we use v0.4.14)
- **Impact**: Denial of Service (application crash)
- **Data at Risk**: None (DoS only, not data breach)
- **Published**: April 4, 2025

**Why We're Accepting This Risk**:

1. **No patch exists** - Vulnerability was just published, upstream has not released a fix
2. **Downgrade breaks functionality** - The suggested fix (v0.1.8) uses a class-based API incompatible with our functional implementation
3. **Critical dependency** - Required for Solana blockchain payments (core functionality)
4. **Risk is contained** - DoS impact only, no data exfiltration or unauthorized access
5. **Production safeguards** - Rate limiting, error handling, and monitoring in place

**Mitigation Strategies**:

- ✅ Rate limiting on payment endpoints (15 min windows, max 20 write operations)
- ✅ Input validation on all payment amounts and addresses
- ✅ Comprehensive error handling with graceful degradation
- ✅ Monitoring and alerting for service crashes
- ✅ Test coverage: 98% on payment execution code
- 📅 **Monitoring**: Checking weekly for upstream patches

**Monitoring Plan**:

- Weekly check of https://github.com/advisories/GHSA-3gc7-fjrx-p6mg
- Automated Dependabot alerts enabled
- Will upgrade immediately when patch is available

---

### 🟡 LOW: mcpay (Multiple Dependency Issues)

**Status**: ⚠️ **ACCEPTED - LOW SEVERITY**

**Details**:

- **Severity**: LOW
- **Vulnerabilities**:
  - @reown/appkit transitive dependencies (WalletConnect ecosystem)
  - fast-redact prototype pollution (GHSA-ffrw-9mx8-89p8)
- **Affected**: mcpay v0.1.12 and dependencies
- **Impact**: Prototype pollution in logging dependencies

**Why We're Accepting This Risk**:

1. **Low severity** - Not critical or high impact
2. **Transitive dependencies** - Not in our direct control
3. **Suggested fix questionable** - npm suggests downgrade to v0.0.20 (older, potentially more vulnerable)
4. **Production safeguards** - Middleware security layers in place

**Mitigation Strategies**:

- ✅ Input sanitization on all user inputs
- ✅ Security headers via Helmet middleware
- ✅ CSRF protection with tokens
- ✅ Rate limiting on all endpoints
- 📅 **Monitoring**: Checking monthly for upstream patches

---

## Security Best Practices Implemented

### Authentication & Authorization

- JWT-based authentication with secure signing
- SIWE (Sign-In with Ethereum) for wallet authentication
- Session management with secure cookies
- Role-based access control (RBAC)

### Network Security

- **Rate Limiting**: Multiple tiers for different endpoints
  - API: 100 requests / 15 min per IP
  - Write operations: 20 / 15 min
  - Service registration: 5 / hour
  - MCP connections: 10 / 15 min
  - MCP messages: 60 / min
- **CORS**: Configured for production origins only
- **Helmet**: Security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CSRF Protection**: Token-based validation on state-changing operations

### Input Validation

- Joi schema validation on all API inputs
- Solana address validation (Base58 format)
- Amount validation (positive, within limits)
- Request size limits (body-parser)

### Payment Security

- Blockchain transaction verification
- Payment proof validation via X-Payment headers
- Spending limits per user (per-transaction, daily, monthly)
- Transaction logging with immutable records

### Code Quality

- ESLint with security rules enabled
- TypeScript strict mode
- Zero ESLint warnings enforced in CI
- 40%+ test coverage (critical paths 98%+)

### Infrastructure Security

- Environment variable management (.env files gitignored)
- Secret scanning in CI/CD
- npm audit in CI pipeline
- Automated Dependabot security updates

---

## Vulnerability Management Process

### 1. Detection

- Automated: npm audit, Dependabot, Snyk (when configured)
- Manual: Security reviews, penetration testing
- Community: GitHub Security Advisories

### 2. Assessment

- Evaluate severity (CVSS score)
- Determine exploitability in our context
- Assess impact on users and data

### 3. Response

- **CRITICAL/HIGH**: Immediate patch or mitigation within 24-48 hours
- **MEDIUM**: Patch within 1 week
- **LOW**: Patch in next regular release cycle
- **Accepted Risk**: Document in this file with monitoring plan

### 4. Communication

- Security advisories for critical issues
- Release notes for all security patches
- This file updated for accepted risks

---

## Security Roadmap

### Short-term (Next Sprint)

- [ ] Configure Snyk for advanced vulnerability scanning
- [ ] Add security test suite (injection, XSS, etc.)
- [ ] Implement security event logging
- [ ] Set up vulnerability monitoring dashboard

### Medium-term (Next Month)

- [ ] Third-party security audit
- [ ] Penetration testing
- [ ] Bug bounty program
- [ ] Security documentation for service providers

### Long-term (Next Quarter)

- [ ] SOC 2 compliance preparation
- [ ] Advanced threat detection
- [ ] Security training program
- [ ] Incident response playbook

---

## Secure Development Practices

### For Contributors

1. **Never commit secrets** - Use .env files (gitignored)
2. **Validate all inputs** - Use Joi schemas
3. **Handle errors gracefully** - Don't expose stack traces
4. **Write security tests** - Cover authentication, authorization, injection
5. **Review dependencies** - Check npm audit before adding packages
6. **Follow least privilege** - Minimize permissions and access

### Code Review Checklist

- [ ] Input validation present?
- [ ] Authentication/authorization checked?
- [ ] Secrets properly managed?
- [ ] Error handling secure?
- [ ] Rate limiting applied?
- [ ] Tests include security scenarios?

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [Solana Security Best Practices](https://docs.solana.com/developing/programming-model/security)

---

**Last Updated**: 2025-11-06
**Next Review**: 2025-11-13 (Weekly review of known issues)
