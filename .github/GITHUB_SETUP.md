# GitHub Repository Setup Guide

Complete guide to configure your GitHub repository for enterprise-grade CI/CD with Railway deployment.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Secrets Configuration](#secrets-configuration)
3. [Environment Setup](#environment-setup)
4. [Branch Protection Rules](#branch-protection-rules)
5. [Code Owners](#code-owners)
6. [Dependabot](#dependabot)
7. [Verification](#verification)

---

## Initial Setup

### Prerequisites

Before starting, ensure you have:

- ✅ Repository created on GitHub
- ✅ Admin access to the repository
- ✅ Railway account with project created
- ✅ Codecov account configured
- ✅ (Optional) Snyk account for security scanning

---

## Secrets Configuration

### Step 1: Navigate to Secrets

1. Go to your GitHub repository
2. Click **Settings** (top menu)
3. In left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add Required Secrets

Click **New repository secret** for each of the following:

#### Railway Tokens

**`RAILWAY_TOKEN_STAGING`**

```
Value: <your-railway-staging-token>
```

**Where to get it:**

1. Go to Railway Dashboard (railway.app)
2. Click your profile (bottom left)
3. Go to **Account Settings**
4. Click **Tokens** tab
5. Click **Create New Token**
6. Name it "GitHub Actions Staging"
7. Copy the token value
8. **Save it immediately** (you won't see it again)

**`RAILWAY_TOKEN_PRODUCTION`**

```
Value: <your-railway-production-token>
```

**Important**: Create a separate token for production for security isolation.

#### Railway URLs

**`RAILWAY_STAGING_URL`**

```
Value: https://your-app-staging.up.railway.app
```

**Where to get it:**

1. Railway Dashboard → Your Project
2. Click staging service
3. Go to **Settings** tab
4. Find **Domains** section
5. Copy the generated Railway domain (or custom domain if configured)

**`RAILWAY_PRODUCTION_URL`**

```
Value: https://your-app.up.railway.app
```

Follow same steps but for production service.

#### Code Quality & Security

**`CODECOV_TOKEN`**

```
Value: 53bde5cf-9bd1-4097-a2c8-daf0cc916f9f
```

**Already provided** - this is your project's token.

**`SNYK_TOKEN`** (Optional but recommended)

```
Value: <your-snyk-token>
```

**Where to get it:**

1. Go to snyk.io
2. Sign up for free account
3. Go to Account Settings
4. Click **Auth Token** (or API Tokens)
5. Copy or generate new token

### Step 3: Verify Secrets

After adding all secrets, you should see:

- ✅ RAILWAY_TOKEN_STAGING
- ✅ RAILWAY_TOKEN_PRODUCTION
- ✅ RAILWAY_STAGING_URL
- ✅ RAILWAY_PRODUCTION_URL
- ✅ CODECOV_TOKEN
- ✅ SNYK_TOKEN (if using)

**Security Note**: Never commit secrets to git or expose them in logs.

---

## Environment Setup

### Create Production Environment

1. In repository **Settings**, click **Environments** (left sidebar)
2. Click **New environment**
3. Name: `production`
4. Click **Configure environment**

### Configure Production Protection

#### Required Reviewers

1. Check **✓ Required reviewers**
2. Add yourself and/or team members
3. **Minimum**: 1 reviewer required
4. **Recommended**: 2+ reviewers for critical production

#### Wait Timer (Optional)

1. Check **✓ Wait timer** if you want enforced delay
2. Set minutes (e.g., 30 minutes)
3. Useful to prevent rushed deployments

#### Deployment Branches

1. Under **Deployment branches**, click dropdown
2. Select **Selected branches**
3. Click **Add deployment branch rule**
4. Add branch: `master`
5. Save

#### Environment URL

1. Add **Environment URL**: `${{ secrets.RAILWAY_PRODUCTION_URL }}`
2. This will link deployments to production URL

### Create Staging Environment (Optional)

1. Click **New environment**
2. Name: `staging`
3. **No required reviewers needed** (automatic deployments)
4. Deployment branches: `develop`
5. Environment URL: `${{ secrets.RAILWAY_STAGING_URL }}`

---

## Branch Protection Rules

### Protect Master Branch

1. Go to **Settings** → **Branches** (left sidebar)
2. Click **Add branch protection rule**
3. Branch name pattern: `master`

#### Configure Protection:

**Require Pull Request Reviews**

- ✅ Require a pull request before merging
- ✅ Require approvals: **1** (or more for team)
- ✅ Dismiss stale pull request approvals when new commits are pushed

**Require Status Checks**

- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- Search and add these required checks:
  - `CI Status` (from ci.yml workflow)
  - `Lint`
  - `Type Check`
  - `Test`
  - `Build`

**Additional Restrictions**

- ✅ Require conversation resolution before merging
- ✅ Require signed commits (recommended)
- ✅ Include administrators (enforce rules on admins too)
- ✅ Restrict pushes (prevent force pushes)
- ✅ Allow force pushes: **Disabled**
- ✅ Allow deletions: **Disabled**

Click **Create** to save.

### Protect Develop Branch

1. Click **Add branch protection rule**
2. Branch name pattern: `develop`
3. Configure same settings as master
4. Required checks:

- `CI Status`
- `Lint`
- `Type Check`
- `Test`
- `Build`

Click **Create** to save.

---

## Code Owners

CODEOWNERS file is already configured at `.github/CODEOWNERS`.

### Verify CODEOWNERS

1. Open `.github/CODEOWNERS` file
2. Replace `@johnn` with your GitHub username
3. Commit the change

### How CODEOWNERS Works

- Automatically requests reviews from specified users
- Applies to files matching patterns
- Critical paths (workflows, package.json) require your review
- Can add multiple owners per path

**Example**:

```
# Workflows require your review
/.github/workflows/ @your-username

# Payment code requires review
/src/payment/ @your-username @security-team
```

---

## Dependabot

Dependabot is already configured via `.github/dependabot.yml`.

### What Dependabot Does

- Checks for dependency updates weekly (Mondays at 9 AM)
- Checks GitHub Actions updates
- Creates PRs automatically
- Groups minor/patch updates to reduce noise
- Prioritizes security updates

### Configuring Dependabot Alerts

1. Go to **Settings** → **Code security and analysis**
2. Enable:
   - ✅ Dependabot alerts
   - ✅ Dependabot security updates
   - ✅ Grouped security updates

### Managing Dependabot PRs

- Review PRs weekly
- Security updates are critical - review ASAP
- Can auto-merge minor/patch updates if tests pass
- Major version updates require manual review

---

## Verification

### Test Your Setup

#### 1. Test Pre-commit Hooks

```bash
# Make a change to a TypeScript file
echo "// test" >> src/index.ts

# Try to commit
git add src/index.ts
git commit -m "test: verify pre-commit hooks"
```

**Expected**: Husky runs lint-staged, ESLint checks file

#### 2. Test CI Workflow

```bash
# Push to develop branch
git checkout develop
git push origin develop
```

**Expected**:

- CI workflow triggers
- All jobs run (lint, type-check, test, security-scan, build)
- Status visible in Actions tab

#### 3. Test Staging Deployment

1. Merge PR to `develop`
2. Wait for CI to complete
3. Deploy staging workflow should trigger automatically
4. Check Railway dashboard for deployment

#### 4. Test Production Deployment (Manual Approval)

1. Create PR from `develop` to `master`
2. Get approval from reviewer
3. Merge PR
4. CI runs on master
5. Production deployment workflow starts
6. **Pauses for approval** - check Actions tab
7. Click "Review deployments" → "Approve"
8. Deployment proceeds to Railway

#### 5. Test Smoke Tests

After deployment completes:

```bash
# Manually run smoke test
bash scripts/smoke-test.sh <your-railway-url>
```

**Expected**: All tests pass (health check, API, database, etc.)

### Verify GitHub Configuration

✅ **Secrets**:

- [ ] All 5-6 secrets added
- [ ] Values are correct (test by triggering workflow)

✅ **Environments**:

- [ ] Production environment created
- [ ] Required reviewers configured
- [ ] Staging environment created (optional)

✅ **Branch Protection**:

- [ ] Master branch protected
- [ ] Develop branch protected
- [ ] Status checks required
- [ ] PR reviews required

✅ **CODEOWNERS**:

- [ ] File updated with your username
- [ ] Auto-requests reviews on critical files

✅ **Dependabot**:

- [ ] Alerts enabled
- [ ] Security updates enabled
- [ ] Receives weekly update PRs

---

## Troubleshooting

### Secrets Not Working

**Problem**: Workflow can't access secrets

- **Check**: Secret names match exactly (case-sensitive)
- **Check**: Secrets are in "Actions" section, not "Dependabot"
- **Solution**: Re-add secret with correct name

### Branch Protection Not Working

**Problem**: Can push directly to master

- **Check**: Rule is active (not in draft mode)
- **Check**: "Include administrators" is enabled if you're admin
- **Solution**: Refresh page, check rule pattern matches branch name

### Production Approval Not Showing

**Problem**: Production deployment runs without approval

- **Check**: Environment named exactly `production`
- **Check**: Required reviewers are configured
- **Check**: Deployment branches include `master`
- **Solution**: Verify environment configuration matches workflow

### CODEOWNERS Not Requesting Review

**Problem**: PRs don't auto-request reviews

- **Check**: File is at `.github/CODEOWNERS` (correct path)
- **Check**: Username is correct with `@` prefix
- **Check**: File paths use forward slashes
- **Solution**: Verify file syntax, test with small PR

---

## Next Steps

After completing this setup:

1. ✅ **Test the workflow** - Create a test PR
2. ✅ **Configure Railway** - Set up environment variables in Railway dashboard
3. ✅ **Update team** - Share this guide with collaborators
4. ✅ **Monitor** - Check Actions tab regularly for CI status
5. ✅ **Iterate** - Adjust thresholds and rules as needed

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [CODEOWNERS Syntax](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [Railway Documentation](https://docs.railway.app/)

---

**Setup Checklist**:

- [ ] All secrets added
- [ ] Production environment configured
- [ ] Branch protection rules applied
- [ ] CODEOWNERS updated
- [ ] Dependabot configured
- [ ] Test workflow executed successfully
- [ ] Team members added as reviewers

**Questions?** Check [.github/WORKFLOWS.md](./WORKFLOWS.md) for detailed workflow documentation.

---

**Last Updated**: 2025-01-05
**Maintained By**: AgentMarket Team
