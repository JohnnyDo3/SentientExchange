#!/bin/bash
# Comprehensive security audit script

set -e

echo "🔒 Running security audit..."
echo ""

# 1. Check for secrets in code
echo "=== 1. Scanning for secrets ==="
if command -v gitleaks &> /dev/null; then
    gitleaks detect --no-git --verbose
else
    echo "⚠️  gitleaks not installed, skipping secret scan"
    echo "Install: brew install gitleaks (or download from GitHub)"
fi
echo ""

# 2. NPM audit
echo "=== 2. Running npm audit ==="
npm audit --audit-level=moderate
echo ""

# 3. Dependency vulnerabilities with Snyk
echo "=== 3. Checking dependencies with Snyk ==="
if command -v snyk &> /dev/null; then
    snyk test --severity-threshold=high
else
    echo "⚠️  Snyk not installed, skipping"
    echo "Install: npm install -g snyk"
fi
echo ""

# 4. Check .env files not in git
echo "=== 4. Checking .env files ==="
if git ls-files | grep -q "\.env$"; then
    echo "❌ .env file is tracked in git!"
    echo "Run: git rm --cached .env"
    exit 1
else
    echo "✅ No .env files in git"
fi
echo ""

# 5. Check for hardcoded secrets
echo "=== 5. Scanning for hardcoded secrets ==="
echo "Searching for common patterns..."

# Private keys
if grep -r "0x[a-fA-F0-9]\{64\}" src/ 2>/dev/null; then
    echo "❌ Possible private keys found!"
    exit 1
fi

# API keys
if grep -r -i "api[_-]key.*=.*['\"][a-zA-Z0-9]\{20,\}" src/ 2>/dev/null; then
    echo "❌ Possible API keys found!"
    exit 1
fi

echo "✅ No obvious hardcoded secrets"
echo ""

# 6. Docker image scan (if images exist)
echo "=== 6. Scanning Docker images ==="
if command -v trivy &> /dev/null; then
    if docker images | grep -q agentmarket-mcp; then
        trivy image --severity HIGH,CRITICAL agentmarket-mcp:latest
    else
        echo "⚠️  No Docker images found to scan"
    fi
else
    echo "⚠️  Trivy not installed, skipping Docker scan"
    echo "Install: brew install aquasecurity/trivy/trivy"
fi
echo ""

# 7. Check file permissions
echo "=== 7. Checking file permissions ==="
if [ -f .env ]; then
    PERMS=$(stat -c %a .env 2>/dev/null || stat -f %A .env 2>/dev/null)
    if [ "$PERMS" != "600" ] && [ "$PERMS" != "0600" ]; then
        echo "⚠️  .env file has insecure permissions: $PERMS"
        echo "Run: chmod 600 .env"
    else
        echo "✅ .env file has secure permissions"
    fi
fi
echo ""

echo "✅ Security audit complete!"
echo ""
echo "Summary:"
echo "- Check the output above for any ❌ errors"
echo "- Address HIGH and CRITICAL vulnerabilities"
echo "- Rotate any exposed secrets immediately"
echo ""
