#!/usr/bin/env ts-node

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import bs58 from 'bs58';

/**
 * Get or mint devnet USDC tokens
 *
 * This script will:
 * 1. Create a USDC token account for your wallet (if needed)
 * 2. Request devnet USDC from the faucet
 */

const DEVNET_RPC = 'https://api.devnet.solana.com';
const USDC_DEVNET_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

async function getDevnetUSDC() {
  try {
    // Read private key from environment
    const privateKeyString = process.env.SOLANA_PRIVATE_KEY;

    if (!privateKeyString) {
      console.error('❌ Error: SOLANA_PRIVATE_KEY not set in environment');
      console.log('\nSet it first:');
      console.log('$env:SOLANA_PRIVATE_KEY="your-private-key-here"  # PowerShell');
      console.log('OR');
      console.log('set SOLANA_PRIVATE_KEY=your-private-key-here  # CMD');
      process.exit(1);
    }

    console.log('🔗 Connecting to Solana devnet...');
    const connection = new Connection(DEVNET_RPC, 'confirmed');

    // Load wallet
    const wallet = Keypair.fromSecretKey(bs58.decode(privateKeyString));
    console.log('✅ Wallet loaded:', wallet.publicKey.toBase58());

    // Check SOL balance
    const solBalance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 SOL Balance: ${solBalance / 1e9} SOL`);

    if (solBalance < 0.01 * 1e9) {
      console.log('\n⚠️  Low SOL balance! You need SOL to pay for transactions.');
      console.log('Get free devnet SOL here:');
      console.log(`https://faucet.solana.com/?address=${wallet.publicKey.toBase58()}`);
      return;
    }

    // Create or get USDC token account
    console.log('\n🪙 Setting up USDC token account...');
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      USDC_DEVNET_MINT,
      wallet.publicKey
    );

    console.log('✅ USDC Token Account:', tokenAccount.address.toBase58());

    // Check USDC balance
    const balance = await connection.getTokenAccountBalance(tokenAccount.address);
    console.log(`💵 Current USDC Balance: ${balance.value.uiAmount || 0} USDC`);

    console.log('\n=== HOW TO GET DEVNET USDC ===\n');
    console.log('Option 1: SPL Token Faucet (Recommended)');
    console.log('  → https://spl-token-faucet.com/?token-name=USDC');
    console.log('  → Paste your wallet address');
    console.log('  → Select USDC');
    console.log('  → Click "Request Tokens"\n');

    console.log('Option 2: QuickNode Faucet');
    console.log('  → https://faucet.quicknode.com/solana/devnet');
    console.log('  → Select USDC token');
    console.log('  → Enter your address\n');

    console.log('Option 3: Circle USDC Faucet');
    console.log('  → https://faucet.circle.com/');
    console.log('  → Select "Solana Devnet"');
    console.log('  → Request USDC\n');

    console.log('Your Wallet Address:');
    console.log(`  ${wallet.publicKey.toBase58()}`);
    console.log('\nYour USDC Token Account:');
    console.log(`  ${tokenAccount.address.toBase58()}`);

    console.log('\n✅ Setup complete! Use the faucets above to get devnet USDC.');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.logs) {
      console.error('Logs:', error.logs);
    }
  }
}

// Run if executed directly
if (require.main === module) {
  getDevnetUSDC();
}

export { getDevnetUSDC };
