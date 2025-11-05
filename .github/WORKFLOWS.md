# GitHub Actions Workflows Documentation

This document provides detailed information about all GitHub Actions workflows in the AgentMarket project.

## Table of Contents

1. [Overview](#overview)
2. [Workflows](#workflows)
   - [CI (ci.yml)](#ci-workflow-ciyml)
   - [Deploy Staging (deploy-staging.yml)](#deploy-staging-workflow-deploy-stagingyml)
   - [Deploy Production (deploy-production.yml)](#deploy-production-workflow-deploy-productionyml)
   - [Security Scan (security-scan.yml)](#security-scan-workflow-security-scanyml)
3. [Secrets Configuration](#secrets-configuration)
4. [Troubleshooting](#troubleshooting)

---

## Overview

AgentMarket uses an enterprise-grade CI/CD pipeline with the following goals:

- **Zero-defect deployments**: Strict quality gates prevent bad code from reaching production
- **Automated testing**: 80% code coverage enforced
- **Security-first**: Daily scans and automatic issue creation
- **Safe deployments**: Manual approval for production, automatic rollback instructions

### Workflow Triggers Summary

| Workflow          | Trigger                   | Frequency         |
| ----------------- | ------------------------- | ----------------- |
| CI                | Push/PR to master/develop | Every commit      |
| Deploy Staging    | CI success on develop     | Automatic         |
| Deploy Production | Push to master            | Requires approval |
| Security Scan     | Schedule + Manual         | Daily at 2 AM UTC |

---

## Workflows

### CI Workflow (`ci.yml`)

**Purpose**: Validates code quality, runs tests, and performs security scans on every push/PR.

**Triggers**:

- Push to `master` or `develop` branches
- Pull requests targeting `master` or `develop`

**Jobs**:

1. **Lint** (10 min timeout)
   - Installs dependencies
   - Runs ESLint with `--max-warnings=0`
   - **Blocks merge** if warnings or errors found

2. **Type Check** (10 min timeout)
   - Compiles TypeScript
   - Verifies no type errors
   - **Blocks merge** if compilation fails

3. **Test** (15 min timeout)
   - Runs Jest test suite with coverage
   - Requires 80% coverage (branches, functions, lines, statements)
   - Uploads coverage to Codecov
   - **Blocks merge** if tests fail or coverage < 80%

4. **Security Scan** (10 min timeout)
   - Runs `npm audit --audit-level=high`
   - Runs Snyk scan (if token configured)
   - Warnings only - doesn't block merge

5. **Build** (10 min timeout)
   - Depends on: lint, type-check, test
   - Compiles project including Next.js web frontend
   - Uploads build artifacts
   - **Blocks merge** if build fails

6. **Status** (Always runs)
   - Aggregates all job results
   - Fails if any required job fails
   - Success required for PR merge

**Concurrency**: Cancels in-progress runs when new commits pushed to same ref

**Required Secrets**:

- `CODECOV_TOKEN` - For coverage uploads

**Optional Secrets**:

- `SNYK_TOKEN` - For enhanced security scanning

---

### Deploy Staging Workflow (`deploy-staging.yml`)

**Purpose**: Automatically deploy to Railway staging environment after CI passes on develop branch.

**Triggers**:

- After CI workflow completes successfully on `develop` branch
- Manual dispatch via GitHub UI
- Push to `develop` branch (for workflow file changes)

**Jobs**:

1. **deploy-staging** (20 min timeout)
   - **Environment**: staging
   - **Condition**: Only runs if CI succeeded or manual dispatch

   **Steps**:
   1. Checkout code
   2. Install Railway CLI (via official install script)
   3. Deploy to Railway using `railway up`
   4. Wait 30 seconds for deployment to stabilize
   5. Run smoke tests (if `RAILWAY_STAGING_URL` configured)
   6. Notify success/failure

**Railway Deployment**:

- Uses Railway CLI via official install script
- Deploys to staging service
- Railway rebuilds from source on their platform

**Smoke Tests**:

- Validates health endpoint returns 200
- Checks API endpoint accessibility
- Tests database connectivity
- Measures response time
- Failures are warnings only (continue-on-error)

**Required Secrets**:

- `RAILWAY_TOKEN_STAGING` - Railway API token for staging environment

**Optional Secrets**:

- `RAILWAY_STAGING_URL` - Full URL for smoke tests (e.g., `https://app-staging.up.railway.app`)

---

### Deploy Production Workflow (`deploy-production.yml`)

**Purpose**: Deploy to Railway production environment with manual approval and comprehensive validation.

**Triggers**:

- Push to `master` branch
- Manual dispatch via GitHub UI

**Jobs**:

1. **deploy-production** (30 min timeout)
   - **Environment**: production (requires approval)
   - **URL**: Tracked via `RAILWAY_PRODUCTION_URL`

   **Steps**:
   1. Pre-deployment checks (log deployment info)
   2. Install Railway CLI
   3. Deploy to Railway production
   4. Wait 60 seconds for deployment to stabilize
   5. Run comprehensive smoke tests (REQUIRED)
   6. Create GitHub deployment record
   7. Notify success with full details
   8. On failure: Provide rollback instructions

**Manual Approval**:

- Uses GitHub Environments feature
- Requires at least 1 reviewer approval
- Optional wait timer (configurable)
- Only designated reviewers can approve

**Smoke Tests**:

- Same tests as staging but NOT optional
- Must pass for deployment to be considered successful
- Tests health endpoint, API, database, response time

**Deployment Tracking**:

- Creates GitHub deployment record via API
- Links to production URL
- Tracks deployment status
- Visible in Deployments tab

**Rollback**:

- On failure, provides detailed rollback instructions
- Three methods: Railway dashboard, CLI, or Git revert
- Instructions printed in workflow output

**Required Secrets**:

- `RAILWAY_TOKEN_PRODUCTION` - Railway API token for production
- `RAILWAY_PRODUCTION_URL` - Full URL for smoke tests (REQUIRED for smoke tests)

---

### Security Scan Workflow (`security-scan.yml`)

**Purpose**: Daily automated security scanning with multiple tools and automatic issue creation.

**Triggers**:

- Schedule: Daily at 2:00 AM UTC
- Manual dispatch via GitHub UI

**Jobs**:

1. **dependency-scan** (15 min timeout)
   - Runs `npm audit` with JSON output
   - Runs Snyk security scan (if token configured)
   - Uploads Snyk report as artifact
   - Continues on error

2. **secret-scan** (10 min timeout)
   - Runs Gitleaks to detect exposed secrets
   - Runs TruffleHog to find credentials
   - Scans entire git history
   - Fails if secrets found

3. **code-scan** (20 min timeout)
   - Runs CodeQL analysis
   - Analyzes JavaScript/TypeScript code
   - Uploads results to GitHub Security tab
   - Checks for common vulnerabilities

4. **create-issue** (Always runs if any scan fails)
   - Creates GitHub issue with scan results
   - Labels: `security`, `automated`
   - Mentions repository owner
   - Links to workflow run
   - Only runs if previous jobs failed

**Required Secrets**:

- None (uses `GITHUB_TOKEN` automatically)

**Optional Secrets**:

- `SNYK_TOKEN` - For enhanced dependency scanning

**Security Reports**:

- Available in GitHub Security tab (CodeQL)
- Artifacts retained for 30 days (Snyk)
- Issues created automatically for failures

---

## Secrets Configuration

### How to Add Secrets

1. Go to GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter name and value
5. Click **Add secret**

### Required Secrets

| Secret Name                | Description                      | Where to Get It                                  |
| -------------------------- | -------------------------------- | ------------------------------------------------ |
| `RAILWAY_TOKEN_STAGING`    | Railway API token for staging    | Railway Dashboard → Account Settings → Tokens    |
| `RAILWAY_TOKEN_PRODUCTION` | Railway API token for production | Railway Dashboard → Account Settings → Tokens    |
| `RAILWAY_STAGING_URL`      | Full staging URL                 | Railway Dashboard → Service → Settings → Domains |
| `RAILWAY_PRODUCTION_URL`   | Full production URL              | Railway Dashboard → Service → Settings → Domains |
| `CODECOV_TOKEN`            | Code coverage reporting          | codecov.io → Repository Settings                 |

### Optional Secrets

| Secret Name  | Description            | Where to Get It                                    |
| ------------ | ---------------------- | -------------------------------------------------- |
| `SNYK_TOKEN` | Vulnerability scanning | snyk.io → Account Settings → API Token (free tier) |

### Environment Configuration

For production deployment approval:

1. Go to **Settings** → **Environments**
2. Click **New environment**
3. Name: `production`
4. Configure:
   - ✓ **Required reviewers**: Add team members (at least 1)
   - ✓ **Deployment branches**: Select "Selected branches" → Add `master`
   - Optional: **Wait timer** (e.g., 30 minutes before deployment allowed)
5. Save

For staging (optional - no approval required):

1. Create environment: `staging`
2. Configure deployment branches: `develop`
3. No required reviewers needed

---

## Troubleshooting

### CI Workflow Issues

**Problem**: Lint job fails

- **Solution**: Run `npm run lint:fix` locally to auto-fix issues
- **Check**: `.eslintrc.js` configuration
- **Common**: Unused imports, missing return types

**Problem**: Tests fail

- **Solution**: Run `npm test` locally to see detailed errors
- **Check**: Test coverage with `npm test -- --coverage`
- **Common**: Coverage below 80% threshold

**Problem**: Build fails

- **Solution**: Run `npm run build` locally
- **Check**: TypeScript compilation errors
- **Common**: Missing dependencies in package.json

### Deployment Issues

**Problem**: Staging deployment fails

- **Check**: Railway dashboard for deployment logs
- **Check**: `RAILWAY_TOKEN_STAGING` secret is correct
- **Solution**: Verify Railway service name matches workflow

**Problem**: Production deployment hangs

- **Reason**: Waiting for manual approval
- **Solution**: Go to Actions → Workflow run → Review deployments → Approve
- **Note**: Only designated reviewers can approve

**Problem**: Smoke tests fail

- **Check**: URL secrets are correct (include https://)
- **Check**: Service is actually running in Railway
- **Solution**: Increase wait time in workflow if service is slow to start

### Security Scan Issues

**Problem**: Secret scan fails

- **Reason**: Exposed secrets or API keys in code
- **Solution**: Review Gitleaks/TruffleHog output, remove secrets, use environment variables
- **Important**: Rotate any exposed credentials immediately

**Problem**: Snyk scan doesn't run

- **Reason**: `SNYK_TOKEN` not configured
- **Solution**: Add token from snyk.io (free tier available)
- **Note**: Optional - npm audit still runs

### Common Errors

**Error**: "Resource not accessible by integration"

- **Cause**: Missing permissions on GITHUB_TOKEN
- **Solution**: Check workflow permissions in repository settings

**Error**: "Railway CLI not found"

- **Cause**: Railway CLI installation failed
- **Solution**: Check install script URL, check network issues

**Error**: "Coverage threshold not met"

- **Cause**: Test coverage below 80%
- **Solution**: Write more tests or adjust threshold in jest.config.js (not recommended)

---

## Maintenance

### Updating Workflows

When modifying workflows:

1. Test changes on a feature branch first
2. Verify all secrets are still valid
3. Update this documentation
4. Get approval from CODEOWNERS

### Adding New Secrets

1. Add secret to GitHub (Settings → Secrets)
2. Update this documentation
3. Update `.env.example` if applicable
4. Notify team members

### Monitoring

- **CI Status**: Check PR status checks
- **Deployment Status**: GitHub Deployments page
- **Security Issues**: GitHub Issues with `security` label
- **Coverage**: Codecov dashboard

---

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Railway Documentation](https://docs.railway.app/)
- [Codecov Documentation](https://docs.codecov.com/)
- [Snyk Documentation](https://docs.snyk.io/)
- [Project CI/CD Guide](../CLAUDE.md#cicd-workflow)

---

**Last Updated**: 2025-01-05
**Maintained By**: AgentMarket Team
