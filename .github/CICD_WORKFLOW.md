# CI/CD Workflow Documentation

## Overview

AgentMarket uses a professional enterprise CI/CD pipeline with separate development and production environments.

## Branch Strategy

```
develop (staging) ──PR──> main (production)
     ↓                        ↓
  Railway Staging       Railway Production
```

### Branches

- **`develop`** - Development/staging branch
  - All new features developed here
  - Auto-deploys to Railway staging environment
  - CI runs on every push

- **`main`** - Production branch
  - Stable, production-ready code only
  - Auto-deploys to Railway production
  - Requires PR approval from `develop`
  - Protected branch (requires reviews)

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:** Push or PR to `main` or `develop`

**Jobs:**
- **Lint** - ESLint code quality checks
- **Type Check** - TypeScript compilation
- **Test** - Run test suite with coverage
- **Security Scan** - npm audit + Snyk
- **Build** - Compile and verify build

**Purpose:** Ensure code quality before deployment

---

### 2. Deploy to Staging (`.github/workflows/deploy-staging.yml`)

**Triggers:** Push to `develop` branch

**Steps:**
1. Install dependencies
2. Run tests
3. Build project
4. Deploy to Railway staging environment
5. Run smoke tests
6. Comment deployment URL on PR (if applicable)

**Environment:** `staging`

**Required Secrets:**
- `RAILWAY_TOKEN` - Railway API token
- `RAILWAY_PROJECT_ID` - Railway project ID

---

### 3. Deploy to Production (`.github/workflows/deploy-railway-production.yml`)

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch

**Steps:**
1. Install dependencies
2. Run tests
3. Build project
4. Deploy to Railway production environment
5. Run smoke tests
6. Create git tag for deployment tracking

**Environment:** `production`

**Required Secrets:**
- `RAILWAY_TOKEN` - Railway API token for production
- `RAILWAY_PROJECT_ID` - Railway project ID for production

---

### 4. Security Scan (`.github/workflows/security-scan.yml`)

**Triggers:** Daily schedule + manual dispatch

**Jobs:**
- Dependency scanning
- Secret scanning
- Code scanning (CodeQL)
- Docker image scanning

---

## Development Workflow

### Making Changes

1. **Create feature branch from `develop`:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request:**
   - Base: `develop`
   - Compare: `feature/your-feature-name`
   - Wait for CI to pass
   - Request review (if team has >1 person)
   - Merge when approved

5. **Auto-deployment to staging:**
   - Merging to `develop` triggers automatic deployment to Railway staging
   - Check GitHub Actions for deployment status
   - Test on staging URL

### Releasing to Production

1. **Create PR from `develop` to `main`:**
   ```bash
   git checkout develop
   git pull origin develop
   # Create PR on GitHub: develop → main
   ```

2. **PR Requirements:**
   - All CI checks must pass
   - At least 1 approving review required (configure in GitHub settings)
   - No merge conflicts

3. **Merge to main:**
   - Merge the PR
   - Triggers automatic production deployment to Railway
   - Creates deployment tag (v{timestamp})

4. **Verify production:**
   - Check GitHub Actions for deployment status
   - Test on production URL
   - Monitor Railway logs

---

## Setting Up GitHub Branch Protection

### For `main` branch:

1. Go to GitHub repo → Settings → Branches
2. Add rule for `main`:
   - ✅ Require pull request before merging
   - ✅ Require approvals (1+)
   - ✅ Require status checks to pass before merging
     - Select: `lint`, `type-check`, `test`, `build`
   - ✅ Require conversation resolution before merging
   - ✅ Do not allow bypassing the above settings

### For `develop` branch (optional):

1. Add rule for `develop`:
   - ✅ Require status checks to pass before merging
     - Select: `lint`, `type-check`, `test`
   - ✅ Require conversation resolution before merging

---

## Setting Up Railway Environments

### Create Staging Environment

1. Go to your Railway project
2. Click **Environments** (top right)
3. Click **Duplicate Environment** (from production)
4. Name it "staging"
5. All environment variables are copied automatically
6. Deploy `develop` branch to this environment

### Get Railway Credentials

```bash
# Login to Railway
railway login

# Get your API token
railway whoami --token

# Link to your project and get project ID
railway link
railway status
```

### Add to GitHub Secrets

Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions**

Add these 2 secrets:
- `RAILWAY_TOKEN` - Your Railway API token (from `whoami --token`)
- `RAILWAY_PROJECT_ID` - Your Railway project ID (from `railway status`)

---

## Commit Message Convention

Use conventional commits for clear history:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding/updating tests
- `chore:` - Maintenance tasks

**Examples:**
```
feat: add payment verification endpoint
fix: resolve race condition in service discovery
docs: update API documentation
test: add integration tests for ratings
```

---

## Rollback Procedure

### If production deployment fails:

1. **Quick rollback:**
   ```bash
   # Find previous working tag
   git tag -l

   # Reset main to previous tag
   git checkout main
   git reset --hard v20250104-120000
   git push origin main --force

   # This triggers new production deployment
   ```

2. **Via Railway:**
   - Go to Railway dashboard
   - Find previous successful deployment
   - Click "Redeploy"

### If staging is broken:

1. **Fix forward on develop:**
   ```bash
   git checkout develop
   # Make fixes
   git commit -m "fix: resolve staging issue"
   git push origin develop
   ```

---

## Monitoring

### Check Deployment Status

**GitHub Actions:**
- Go to Actions tab
- View workflow runs
- Check logs for errors

**Railway:**
- Open Railway dashboard
- View deployment logs
- Check service health

### Key Metrics to Monitor

- Deployment success rate
- CI test pass rate
- Build time
- Deployment frequency
- Time to production

---

## Troubleshooting

### CI fails on `develop`:
1. Check test failures in GitHub Actions
2. Run tests locally: `npm test`
3. Fix issues and push again

### Staging deployment fails:
1. Check Railway logs
2. Verify environment variables
3. Check Railway token permissions

### Production deployment fails:
1. **DO NOT PANIC** - staging is still working
2. Check GitHub Actions logs
3. Verify Railway production environment
4. Consider rollback if critical

### Branch protection prevents merge:
1. Ensure all CI checks pass
2. Get required approvals
3. Resolve any conflicts
4. Re-request review if needed

---

## Best Practices

1. **Always work on feature branches** - Never commit directly to `develop` or `main`
2. **Keep commits small** - Easier to review and revert
3. **Write good commit messages** - Follow conventional commits
4. **Test locally first** - Run `npm test` before pushing
5. **Review your own PR** - Catch obvious issues before review
6. **Monitor deployments** - Check that staging/production work after deploy
7. **Update docs** - Keep this file updated as workflow evolves

---

## Quick Reference

### Common Commands

```bash
# Switch to develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/my-feature

# Push changes
git push origin feature/my-feature

# Update develop
git checkout develop
git pull origin develop

# Merge main into develop (after hotfix)
git checkout develop
git merge main
git push origin develop
```

### Deployment Flow

```
Feature branch → develop → staging deployment → test → PR to main → production deployment
```

### Getting Help

- **CI Issues:** Check GitHub Actions logs
- **Deployment Issues:** Check Railway dashboard
- **Code Issues:** Run `npm test` locally
- **Git Issues:** `git status`, `git log --oneline`
