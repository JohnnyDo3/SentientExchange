# AgentMarket MCP - Setup Guide

This guide will walk you through setting up AgentMarket MCP from scratch, step by step. By the end, you'll have a fully functional AI service marketplace integrated with Claude Desktop.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Install Required Software](#install-required-software)
3. [Get Coinbase CDP API Keys](#get-coinbase-cdp-api-keys)
4. [Clone and Install AgentMarket](#clone-and-install-agentmarket)
5. [Configure Environment Variables](#configure-environment-variables)
6. [Build the Project](#build-the-project)
7. [Verify Installation](#verify-installation)
8. [Integrate with Claude Desktop](#integrate-with-claude-desktop)
9. [Test the Integration](#test-the-integration)
10. [Optional: Setup API Server](#optional-setup-api-server)
11. [Troubleshooting](#troubleshooting)
12. [Next Steps](#next-steps)

---

## Prerequisites

Before you begin, you'll need:

- **Computer:** Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **Internet connection:** For downloading dependencies and blockchain interactions
- **Terminal/Command Line:** PowerShell (Windows), Terminal (macOS), or bash/zsh (Linux)
- **Text editor:** VS Code, Sublime Text, Notepad++, or any code editor
- **Claude Desktop:** Download from [claude.ai](https://claude.ai/download)

**Estimated time:** 30-45 minutes for first-time setup

---

## Install Required Software

### Step 1: Install Node.js

AgentMarket requires **Node.js 20 or higher**.

#### Check if Node.js is already installed:

```bash
node --version
```

If you see `v20.x.x` or higher, skip to [Step 2](#step-2-install-git).

#### Install Node.js:

**Windows:**
1. Download the Windows installer from [nodejs.org](https://nodejs.org/)
2. Choose the "LTS" version (should be 20.x or higher)
3. Run the installer and follow the prompts
4. Restart your terminal after installation

**macOS:**

Using Homebrew (recommended):
```bash
brew install node@20
```

Or download the macOS installer from [nodejs.org](https://nodejs.org/).

**Linux (Ubuntu/Debian):**
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**Linux (Fedora/RHEL/CentOS):**
```bash
# Using NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Verify installation
node --version
npm --version
```

#### Verify installation:

```bash
node --version  # Should show v20.x.x or higher
npm --version   # Should show 9.x.x or higher
```

### Step 2: Install Git

Git is required to clone the repository.

#### Check if Git is already installed:

```bash
git --version
```

If you see a version number, skip to [Step 3](#step-3-verify-system-requirements).

#### Install Git:

**Windows:**
1. Download Git for Windows from [git-scm.com](https://git-scm.com/download/win)
2. Run the installer
3. Use default options (or customize as needed)
4. Restart your terminal after installation

**macOS:**

Git comes pre-installed on macOS. If not available:
```bash
brew install git
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install git

# Fedora/RHEL/CentOS
sudo dnf install git
```

#### Verify installation:

```bash
git --version  # Should show git version 2.x.x or higher
```

### Step 3: Verify System Requirements

Run this checklist to ensure your system is ready:

```bash
# Check Node.js version (should be 20+)
node --version

# Check npm version (should be 9+)
npm --version

# Check Git version
git --version

# Check available disk space (need ~500MB)
# Windows
dir C:\

# macOS/Linux
df -h ~
```

All checks passed? Great! You're ready to proceed.

---

## Get Coinbase CDP API Keys

AgentMarket uses Coinbase Developer Platform (CDP) for secure wallet management and USDC payments.

### Step 1: Create a Coinbase Developer Account

1. Visit [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com/)
2. Click "Sign Up" in the top right
3. Create an account with your email
4. Verify your email address
5. Complete the onboarding flow

### Step 2: Create an API Key

1. Once logged in, click **"API Keys"** in the left sidebar
2. Click **"Create API Key"** button
3. Enter a name for your API key (e.g., "AgentMarket Development")
4. Select permissions:
   - ✅ **Wallets** - Read and Write
   - ✅ **Transactions** - Read and Write
5. Click **"Create"**

### Step 3: Save Your API Credentials

You'll see two important values:

**API Key Name** (example):
```
organizations/abc-123-def-456/apiKeys/xyz-789-hij-012
```

**Private Key** (example):
```
-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIBxYz...your key here...3kl9G4A==
-----END EC PRIVATE KEY-----
```

**CRITICAL: Save these immediately!**
- The private key is only shown once
- Store it securely (password manager recommended)
- Never commit it to Git or share it publicly

Copy both values to a temporary text file for now. You'll use them in [Configure Environment Variables](#configure-environment-variables).

### Step 4: Verify API Key

To verify your API key is working:

1. Click on your newly created API key in the list
2. Check that status shows "Active"
3. Note the creation date and permissions

---

## Clone and Install AgentMarket

### Step 1: Choose Installation Directory

Pick a location to install AgentMarket:

**Windows:**
```powershell
# Example: Install in Desktop
cd C:\Users\YourUsername\Desktop

# Or: Create a dedicated projects folder
mkdir C:\Projects
cd C:\Projects
```

**macOS/Linux:**
```bash
# Example: Install in home directory
cd ~

# Or: Create a dedicated projects folder
mkdir ~/projects
cd ~/projects
```

### Step 2: Clone the Repository

```bash
git clone https://github.com/agentmarket/agentmarket-mcp.git
cd agentmarket-mcp
```

You should see output like:
```
Cloning into 'agentmarket-mcp'...
remote: Enumerating objects: 1234, done.
remote: Counting objects: 100% (1234/1234), done.
remote: Compressing objects: 100% (567/567), done.
Receiving objects: 100% (1234/1234), 2.34 MiB | 5.67 MiB/s, done.
```

### Step 3: Install Dependencies

```bash
npm install
```

This will take 2-5 minutes. You'll see progress:
```
npm WARN deprecated some-package@1.0.0: ...
added 234 packages, and audited 235 packages in 2m
```

### Step 4: Verify Installation

Check that all files are present:

```bash
# Windows
dir

# macOS/Linux
ls -la
```

You should see these directories:
- `src/` - Source code
- `tests/` - Test files
- `examples/` - Example services
- `node_modules/` - Dependencies (created by npm install)
- `package.json` - Project configuration
- `.env.example` - Environment template

---

## Configure Environment Variables

### Step 1: Create .env File

Copy the example environment file:

**Windows (PowerShell):**
```powershell
copy .env.example .env
```

**Windows (Command Prompt):**
```cmd
copy .env.example .env
```

**macOS/Linux:**
```bash
cp .env.example .env
```

### Step 2: Edit .env File

Open `.env` in your text editor:

**Windows:**
```powershell
notepad .env
```

**macOS:**
```bash
nano .env
# Or use your preferred editor:
open -a "Visual Studio Code" .env
```

**Linux:**
```bash
nano .env
# Or:
gedit .env
```

### Step 3: Configure Required Variables

You'll see this template:

```bash
# CDP Wallet Configuration (Required for Coinbase CDP SDK)
CDP_API_KEY_NAME=your-api-key-id
CDP_API_KEY_PRIVATE_KEY=your-api-key-private-key

# Network Configuration
NETWORK=base-sepolia

# Database
DATABASE_PATH=./data/agentmarket.db

# Server Configuration
NODE_ENV=development
LOG_LEVEL=debug

# Optional: Analytics
ENABLE_ANALYTICS=false
```

#### Required: CDP API Keys

Replace these values with your CDP credentials from [Get Coinbase CDP API Keys](#get-coinbase-cdp-api-keys):

```bash
CDP_API_KEY_NAME=organizations/abc-123-def-456/apiKeys/xyz-789-hij-012
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEIBxYz...your key here...3kl9G4A==\n-----END EC PRIVATE KEY-----
```

**Important formatting notes:**
- Keep the entire private key on one line
- Replace newlines in the key with `\n`
- Keep quotes if your editor adds them

#### Network Selection

For development, use **base-sepolia** (testnet):
```bash
NETWORK=base-sepolia
```

For production, use **base** (mainnet):
```bash
NETWORK=base
```

Other supported networks:
- `ethereum` - Ethereum mainnet
- `polygon` - Polygon mainnet
- `arbitrum` - Arbitrum mainnet
- `optimism` - Optimism mainnet
- `solana` - Solana mainnet

#### Database Path

The default path works for most users:
```bash
DATABASE_PATH=./data/agentmarket.db
```

Or use an absolute path:
```bash
# Windows
DATABASE_PATH=C:/Users/YourUsername/Desktop/agentmarket-mcp/data/agentmarket.db

# macOS/Linux
DATABASE_PATH=/Users/YourUsername/agentmarket-mcp/data/agentmarket.db
```

#### Development Settings

For development:
```bash
NODE_ENV=development
LOG_LEVEL=debug
```

For production:
```bash
NODE_ENV=production
LOG_LEVEL=info
```

### Step 4: Save and Close

Save the file and close your editor:
- **nano:** Press `Ctrl+X`, then `Y`, then `Enter`
- **Notepad:** File → Save
- **VS Code:** File → Save or `Ctrl+S` (Windows/Linux) / `Cmd+S` (macOS)

### Step 5: Verify .env File

Check that your `.env` file is correctly formatted:

**Windows:**
```powershell
type .env
```

**macOS/Linux:**
```bash
cat .env
```

Verify:
- ✅ CDP_API_KEY_NAME is set (not "your-api-key-id")
- ✅ CDP_API_KEY_PRIVATE_KEY is set (not "your-api-key-private-key")
- ✅ NETWORK is set to "base-sepolia"
- ✅ No syntax errors

---

## Build the Project

### Step 1: Clean Previous Builds (if any)

```bash
npm run clean
```

### Step 2: Compile TypeScript

```bash
npm run build
```

You should see:
```
> agentmarket-mcp@1.0.0 build
> tsc

[No errors = success!]
```

### Step 3: Verify Build Output

Check that `dist/` directory was created:

**Windows:**
```powershell
dir dist
```

**macOS/Linux:**
```bash
ls dist/
```

You should see:
- `index.js` - MCP server entry point
- `server.js` - MCP server implementation
- `api/` - REST API files
- `auth/` - Authentication files
- `tools/` - MCP tool implementations
- Other compiled JavaScript files

If `dist/` is empty or missing, check for TypeScript errors in the build output.

---

## Verify Installation

### Step 1: Run Tests

Verify that everything is working correctly:

```bash
npm test
```

You should see:
```
PASS tests/unit/auth/jwt.test.ts
PASS tests/unit/auth/siwe.test.ts
PASS tests/unit/registry.test.ts
...

Test Suites: 15 passed, 15 total
Tests:       119 passed, 119 total
Snapshots:   0 total
Time:        12.345 s
```

If tests fail, see [Troubleshooting](#troubleshooting).

### Step 2: Start MCP Server (Test Run)

Try starting the MCP server:

```bash
npm start
```

You should see:
```
🚀 AgentMarket MCP Server starting...

═══════════════════════════════════════════════════════════
  AgentMarket MCP Server Running
═══════════════════════════════════════════════════════════

✓ Server Status: ONLINE
✓ Protocol: Model Context Protocol (MCP)
✓ Transport: stdio
✓ Tools Available: 7
✓ Network: base-sepolia

Ready to accept connections from Claude Desktop!
```

**Note:** The server is running, but nothing will happen yet because it uses stdio transport (waits for input from Claude Desktop).

Press `Ctrl+C` to stop the server.

---

## Integrate with Claude Desktop

Now that AgentMarket is installed and working, let's connect it to Claude Desktop.

### Step 1: Locate Claude Desktop Config File

Find your Claude Desktop configuration file:

**Windows:**
```
%APPDATA%\Claude\config.json
```

Full path example:
```
C:\Users\YourUsername\AppData\Roaming\Claude\config.json
```

**macOS:**
```
~/Library/Application Support/Claude/config.json
```

Full path example:
```
/Users/YourUsername/Library/Application Support/Claude/config.json
```

**Linux:**
```
~/.config/claude/config.json
```

Full path example:
```
/home/yourusername/.config/claude/config.json
```

### Step 2: Open or Create config.json

If the file doesn't exist, create it:

**Windows (PowerShell):**
```powershell
# Create directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "$env:APPDATA\Claude"

# Create empty config file
New-Item -ItemType File -Force -Path "$env:APPDATA\Claude\config.json"

# Open in Notepad
notepad "$env:APPDATA\Claude\config.json"
```

**macOS:**
```bash
# Create directory if it doesn't exist
mkdir -p ~/Library/Application\ Support/Claude

# Create empty config file
touch ~/Library/Application\ Support/Claude/config.json

# Open in default editor
open -a "TextEdit" ~/Library/Application\ Support/Claude/config.json
```

**Linux:**
```bash
# Create directory if it doesn't exist
mkdir -p ~/.config/claude

# Create empty config file
touch ~/.config/claude/config.json

# Open in nano
nano ~/.config/claude/config.json
```

### Step 3: Add AgentMarket Configuration

Copy this configuration into `config.json`:

**Windows:**
```json
{
  "mcpServers": {
    "agentmarket": {
      "command": "node",
      "args": ["C:/Users/YourUsername/Desktop/agentmarket-mcp/dist/index.js"],
      "env": {
        "CDP_API_KEY_NAME": "your-api-key-name-here",
        "CDP_API_KEY_PRIVATE_KEY": "your-api-key-private-key-here",
        "NETWORK": "base-sepolia",
        "DATABASE_PATH": "C:/Users/YourUsername/Desktop/agentmarket-mcp/data/agentmarket.db",
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**macOS:**
```json
{
  "mcpServers": {
    "agentmarket": {
      "command": "node",
      "args": ["/Users/YourUsername/agentmarket-mcp/dist/index.js"],
      "env": {
        "CDP_API_KEY_NAME": "your-api-key-name-here",
        "CDP_API_KEY_PRIVATE_KEY": "your-api-key-private-key-here",
        "NETWORK": "base-sepolia",
        "DATABASE_PATH": "/Users/YourUsername/agentmarket-mcp/data/agentmarket.db",
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Linux:**
```json
{
  "mcpServers": {
    "agentmarket": {
      "command": "node",
      "args": ["/home/yourusername/agentmarket-mcp/dist/index.js"],
      "env": {
        "CDP_API_KEY_NAME": "your-api-key-name-here",
        "CDP_API_KEY_PRIVATE_KEY": "your-api-key-private-key-here",
        "NETWORK": "base-sepolia",
        "DATABASE_PATH": "/home/yourusername/agentmarket-mcp/data/agentmarket.db",
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Step 4: Customize Paths

Replace these placeholders:

1. **`args` path:** Replace `YourUsername` with your actual username and verify the path to `dist/index.js`
2. **`DATABASE_PATH`:** Replace `YourUsername` with your actual username and verify the path
3. **`CDP_API_KEY_NAME`:** Copy from your `.env` file
4. **`CDP_API_KEY_PRIVATE_KEY`:** Copy from your `.env` file

**Important formatting:**
- Use **absolute paths** (full paths, not relative)
- Windows paths use **forward slashes** (/) in JSON
- No trailing slashes on directories

### Step 5: Get Your Absolute Paths

If you're unsure of your absolute paths:

**Windows (PowerShell):**
```powershell
# Get current directory
cd C:\Users\YourUsername\Desktop\agentmarket-mcp
pwd

# Show full path to dist/index.js
Resolve-Path dist\index.js
```

**macOS/Linux:**
```bash
# Get current directory
cd ~/agentmarket-mcp
pwd

# Show full path to dist/index.js
realpath dist/index.js
```

Copy the output and paste it into your `config.json`.

### Step 6: Validate JSON Syntax

Before saving, validate your JSON:

1. Copy your config.json content
2. Visit [jsonlint.com](https://jsonlint.com/)
3. Paste and click "Validate JSON"
4. Fix any errors

Common errors:
- Missing commas between properties
- Missing quotes around strings
- Extra comma after last property
- Incorrect path separators

### Step 7: Save config.json

Save the file:
- **nano:** `Ctrl+X`, then `Y`, then `Enter`
- **Notepad:** File → Save
- **TextEdit:** File → Save

### Step 8: Restart Claude Desktop

**Critical:** You MUST restart Claude Desktop for changes to take effect.

1. Completely quit Claude Desktop (not just close the window)
   - **Windows:** Right-click taskbar icon → Exit
   - **macOS:** Claude → Quit Claude
   - **Linux:** File → Quit
2. Wait 5 seconds
3. Launch Claude Desktop again

---

## Test the Integration

### Step 1: Open Claude Desktop

Launch Claude Desktop and start a new conversation.

### Step 2: Check MCP Server Status

In the Claude Desktop interface, look for an MCP indicator (usually in the bottom left or settings area). You should see "agentmarket" listed as a connected server.

If you don't see it, check Claude Desktop logs for errors (see [Troubleshooting](#troubleshooting)).

### Step 3: Test Service Discovery

Try this command in Claude Desktop:

```
Show me all available AI services in the marketplace
```

Claude should use the `list_services` tool and return a list of services.

### Step 4: Test Wallet Balance

Try this command:

```
Check my wallet balance
```

Claude should use the `wallet_balance` tool and return your USDC balance (likely $0.00 for a new wallet).

### Step 5: Test Service Details

Try this command:

```
Get details about the first service in the marketplace
```

Claude should use `discover_services` to find a service, then `get_service_details` to get information about it.

### Success Criteria

You've successfully integrated AgentMarket if:
- ✅ Claude Desktop recognizes AgentMarket MCP server
- ✅ Tools appear and execute successfully
- ✅ You can check wallet balance
- ✅ You can browse services
- ✅ No error messages appear

### If Tools Don't Work

See [Troubleshooting](#troubleshooting) section below.

---

## Optional: Setup API Server

AgentMarket also includes a REST API server for web/mobile integration.

### Step 1: Configure API Server

Add these variables to your `.env` file:

```bash
# API Server Configuration
API_PORT=3333
JWT_SECRET=your-random-secret-key-change-this-in-production
```

Generate a secure JWT secret:

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

**macOS/Linux:**
```bash
openssl rand -base64 32
```

Copy the output and use it as `JWT_SECRET`.

### Step 2: Start API Server

In a new terminal window:

```bash
cd agentmarket-mcp
npm run start:api
```

You should see:
```
🚀 AgentMarket API Server running on http://localhost:3333
🔌 WebSocket server running on ws://localhost:3333
🔒 Security: Helmet, CORS, Rate Limiting enabled
📝 Validation: Zod schemas active
```

### Step 3: Test API Server

In another terminal:

**Test health endpoint:**
```bash
curl http://localhost:3333/api/pulse
```

**Test services endpoint:**
```bash
curl http://localhost:3333/api/services
```

**Test stats endpoint:**
```bash
curl http://localhost:3333/api/stats
```

You should get JSON responses.

### Step 4: Keep API Server Running

To run both servers simultaneously:

**Terminal 1:**
```bash
npm start  # MCP server for Claude Desktop
```

**Terminal 2:**
```bash
npm run start:api  # REST API server for web/mobile
```

Or use a process manager like `pm2` to run both in the background.

---

## Troubleshooting

### Issue: "Missing required environment variables"

**Symptoms:**
```
❌ Missing required environment variables:
   - CDP_API_KEY_NAME
   - CDP_API_KEY_PRIVATE_KEY
```

**Solution:**
1. Verify `.env` file exists in project root
2. Check that CDP keys are correctly copied from Coinbase portal
3. Ensure no extra spaces or quotes around values
4. Try running with explicit env vars:
   ```bash
   CDP_API_KEY_NAME=your-key npm start
   ```

### Issue: "Claude Desktop not showing AgentMarket tools"

**Symptoms:**
- No MCP servers listed in Claude Desktop
- Tools don't appear when asking Claude

**Solution:**
1. Verify `config.json` path is correct for your OS
2. Check that paths in `config.json` are absolute (not relative)
3. Verify `dist/index.js` exists (run `npm run build` again)
4. Check JSON syntax with [jsonlint.com](https://jsonlint.com/)
5. Completely restart Claude Desktop (quit and relaunch)
6. Check Claude Desktop logs:
   - **Windows:** `%APPDATA%\Claude\logs`
   - **macOS:** `~/Library/Logs/Claude`
   - **Linux:** `~/.config/claude/logs`

### Issue: "ENOENT: no such file or directory"

**Symptoms:**
```
Error: ENOENT: no such file or directory, open '...'
```

**Solution:**
1. Verify all paths in `config.json` are absolute
2. Use forward slashes (/) even on Windows
3. Verify `dist/` directory exists (run `npm run build`)
4. Check that database directory exists:
   ```bash
   mkdir -p data
   ```

### Issue: "Tests failing"

**Symptoms:**
- Jest tests fail with import errors
- Module not found errors

**Solution:**
1. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. Rebuild project:
   ```bash
   npm run clean
   npm run build
   ```
3. Check Node.js version:
   ```bash
   node --version  # Should be v20+
   ```

### Issue: "Port 3333 already in use"

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3333
```

**Solution:**
1. Find process using port 3333:
   ```bash
   # Windows
   netstat -ano | findstr :3333

   # macOS/Linux
   lsof -i :3333
   ```
2. Kill the process or change the port in `.env`:
   ```bash
   API_PORT=3334
   ```

### Issue: "Permission denied"

**Symptoms:**
- Can't write to database
- Can't create files

**Solution:**
1. Check file permissions:
   ```bash
   # macOS/Linux
   chmod -R 755 agentmarket-mcp/
   ```
2. Run with elevated permissions (not recommended):
   ```bash
   # Windows (PowerShell as Admin)
   # macOS/Linux
   sudo npm start
   ```

### Still Having Issues?

1. **Enable debug logging:**
   ```bash
   LOG_LEVEL=debug npm start
   ```

2. **Check all logs:**
   - Terminal output
   - Claude Desktop logs
   - System logs

3. **Get help:**
   - GitHub Issues: https://github.com/agentmarket/agentmarket-mcp/issues
   - Discord: [coming soon]
   - Twitter: [@agentmarket](https://twitter.com/agentmarket)

---

## Next Steps

Congratulations! You've successfully set up AgentMarket MCP.

### What to do next:

1. **Get Testnet Funds**
   - Visit [Base Sepolia Faucet](https://faucet.quicknode.com/base/sepolia)
   - Request testnet ETH and USDC
   - Check your balance: "Check my wallet balance" in Claude Desktop

2. **Explore the Marketplace**
   - Browse services: "Show me all services"
   - Search by capability: "Find image analysis services"
   - Check service details: "Tell me about [service name]"

3. **Try a Service**
   - Purchase a service: "Use the sentiment analyzer to analyze this text: ..."
   - View transaction: "Show my transaction history"
   - Rate the service: "I want to rate the service I just used"

4. **Register Your Own Service**
   - Create an x402 service (see `examples/` directory)
   - Register it via API or web UI
   - Earn USDC when others use your service!

5. **Read Documentation**
   - [README.md](./README.md) - Overview and features
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
   - [API.md](./API.md) - Complete API reference
   - [CLAUDE.md](./CLAUDE.md) - Instructions for Claude Code

6. **Join the Community**
   - Star the repo on GitHub
   - Follow [@agentmarket](https://twitter.com/agentmarket) on Twitter
   - Join Discord [coming soon]

### Development Mode

To continue developing AgentMarket:

```bash
# Start MCP server with hot reload
npm run dev

# Start API server with hot reload
npm run dev:api

# Run tests in watch mode
npm run test:watch

# Seed database with example services
npm run seed
```

---

**Happy building!**

If you encounter any issues or have questions, please [open an issue](https://github.com/agentmarket/agentmarket-mcp/issues) on GitHub.
