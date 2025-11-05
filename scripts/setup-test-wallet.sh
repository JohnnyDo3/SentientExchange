#!/bin/bash

# Setup Test Wallet for E2E Tests
# This script guides you through setting up a Solana devnet wallet for testing

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     AgentMarket E2E Test Wallet Setup                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found!"
    echo ""
    echo "Please install Solana CLI:"
    echo "  sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    echo ""
    exit 1
fi

echo "✅ Solana CLI found"
echo ""

# Check if spl-token CLI is installed
if ! command -v spl-token &> /dev/null; then
    echo "⚠️  SPL Token CLI not found. Installing..."
    cargo install spl-token-cli
    echo "✅ SPL Token CLI installed"
    echo ""
fi

# Step 1: Generate keypair
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Generate Test Keypair"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

WALLET_FILE="test-wallet.json"

if [ -f "$WALLET_FILE" ]; then
    echo "⚠️  $WALLET_FILE already exists!"
    read -p "Do you want to use the existing wallet? (y/n): " use_existing

    if [ "$use_existing" != "y" ]; then
        echo "Generating new keypair..."
        solana-keygen new --outfile "$WALLET_FILE" --force
        echo "✅ New keypair generated"
    else
        echo "✅ Using existing keypair"
    fi
else
    echo "Generating new keypair..."
    solana-keygen new --outfile "$WALLET_FILE"
    echo "✅ Keypair generated"
fi

echo ""

# Get public key
PUBLIC_KEY=$(solana-keygen pubkey "$WALLET_FILE")
echo "📋 Your public key: $PUBLIC_KEY"
echo ""

# Step 2: Get devnet SOL
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Request Devnet SOL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Requesting 1 SOL from devnet faucet..."
solana airdrop 1 "$PUBLIC_KEY" --url devnet

echo "✅ SOL received"
echo ""

# Check balance
SOL_BALANCE=$(solana balance "$PUBLIC_KEY" --url devnet)
echo "💰 SOL Balance: $SOL_BALANCE"
echo ""

# Step 3: Create USDC token account
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Create USDC Token Account"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

USDC_MINT="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

echo "Creating token account for USDC..."
spl-token create-account "$USDC_MINT" --url devnet --owner "$WALLET_FILE" || echo "Token account may already exist"

echo "✅ USDC token account ready"
echo ""

# Step 4: Get USDC from faucet
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Get Devnet USDC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🌐 Please visit one of these faucets to get devnet USDC:"
echo ""
echo "  1. Circle Faucet: https://faucet.circle.com/"
echo "  2. SPL Token Faucet: https://spl-token-faucet.com/"
echo ""
echo "Send USDC to your address: $PUBLIC_KEY"
echo ""
read -p "Press Enter after you've received USDC..."

# Check USDC balance
USDC_BALANCE=$(spl-token balance "$USDC_MINT" --url devnet --owner "$WALLET_FILE" 2>/dev/null || echo "0")
echo "💰 USDC Balance: $USDC_BALANCE USDC"
echo ""

# Step 5: Export private key
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Set Environment Variable"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "To use this wallet in E2E tests, you need to set SOLANA_PRIVATE_KEY."
echo ""
echo "⚠️  WARNING: Keep your private key secure! Never commit it to git!"
echo ""
echo "Add this to your .env file:"
echo ""
echo "SOLANA_PRIVATE_KEY=<base58-encoded-key>"
echo ""
echo "To get the base58-encoded key:"
echo "1. Read your keypair:"
echo "   cat $WALLET_FILE"
echo ""
echo "2. Convert the JSON array to base58:"
echo "   You can use online tools or:"
echo "   node -e \"console.log(require('bs58').encode(Buffer.from(JSON.parse(require('fs').readFileSync('$WALLET_FILE')))))\""
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Wallet Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Summary:"
echo "  Public Key: $PUBLIC_KEY"
echo "  SOL Balance: $SOL_BALANCE"
echo "  USDC Balance: $USDC_BALANCE USDC"
echo "  Keypair File: $WALLET_FILE"
echo ""
echo "🎯 Next Steps:"
echo "  1. Set SOLANA_PRIVATE_KEY in .env"
echo "  2. Run: npm test tests/e2e/true-e2e-payment-flow.test.ts"
echo ""
