#!/usr/bin/env ts-node

/**
 * Solana Payment Script (Client-Side)
 *
 * This script runs on the CLIENT side (not the MCP server).
 * It reads the user's private key from environment, signs a transaction,
 * and broadcasts it to Solana.
 *
 * Usage:
 *   npx ts-node scripts/solana-pay.ts <recipient> <amount> [token-mint]
 *
 * Examples:
 *   # Send 0.01 SOL
 *   npx ts-node scripts/solana-pay.ts 7xKX...9YzB 10000000
 *
 *   # Send 0.01 USDC
 *   npx ts-node scripts/solana-pay.ts 7xKX...9YzB 10000 EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
 *
 * Environment Variables:
 *   SOLANA_PRIVATE_KEY - Base58-encoded private key (required)
 *   SOLANA_RPC_URL - RPC endpoint (default: devnet)
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import bs58 from 'bs58';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Main payment execution function
 */
async function executePayment() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);

    if (args.length < 2) {
      console.error('Usage: npx ts-node scripts/solana-pay.ts <recipient> <amount> [token-mint]');
      console.error('');
      console.error('Examples:');
      console.error('  SOL:  npx ts-node scripts/solana-pay.ts 7xKX...9YzB 10000000');
      console.error('  USDC: npx ts-node scripts/solana-pay.ts 7xKX...9YzB 10000 EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      process.exit(1);
    }

    const recipientAddress = args[0];
    const amount = args[1];
    const tokenMint = args[2]; // Optional, if not provided = SOL transfer

    // Validate private key from environment
    const privateKeyBase58 = process.env.SOLANA_PRIVATE_KEY;
    if (!privateKeyBase58) {
      console.error('❌ Error: SOLANA_PRIVATE_KEY not found in environment');
      console.error('');
      console.error('Please set your Solana private key:');
      console.error('  export SOLANA_PRIVATE_KEY="your-base58-private-key"');
      console.error('');
      console.error('Or add to .env file:');
      console.error('  SOLANA_PRIVATE_KEY=your-base58-private-key');
      process.exit(1);
    }

    // Initialize connection
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    console.log('🔗 Connected to:', rpcUrl);

    // Load wallet from private key
    const privateKey = bs58.decode(privateKeyBase58);
    const wallet = Keypair.fromSecretKey(privateKey);
    const walletAddress = wallet.publicKey.toBase58();

    console.log('💼 Wallet:', walletAddress);

    // Validate recipient
    let recipient: PublicKey;
    try {
      recipient = new PublicKey(recipientAddress);
    } catch (error) {
      console.error('❌ Invalid recipient address:', recipientAddress);
      process.exit(1);
    }

    // Execute payment
    let signature: string;

    if (tokenMint) {
      // SPL Token transfer (e.g., USDC)
      signature = await executeTokenTransfer(
        connection,
        wallet,
        recipient,
        amount,
        tokenMint
      );
    } else {
      // SOL transfer
      signature = await executeSolTransfer(
        connection,
        wallet,
        recipient,
        amount
      );
    }

    // Output signature for MCP tool to use
    console.log('');
    console.log('✅ Payment successful!');
    console.log('📝 Transaction signature:', signature);
    console.log('🔍 View on Solana Explorer:');
    console.log(`   https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log('');
    console.log('---SIGNATURE---');
    console.log(signature);
    console.log('---END---');

  } catch (error: any) {
    console.error('');
    console.error('❌ Payment failed:', error.message);
    console.error('');
    if (error.logs) {
      console.error('Transaction logs:');
      error.logs.forEach((log: string) => console.error('  ', log));
    }
    process.exit(1);
  }
}

/**
 * Execute SOL transfer
 */
async function executeSolTransfer(
  connection: Connection,
  wallet: Keypair,
  recipient: PublicKey,
  amountLamports: string
): Promise<string> {
  console.log('');
  console.log('💸 Sending SOL...');
  console.log('   To:', recipient.toBase58());
  console.log('   Amount:', Number(amountLamports) / LAMPORTS_PER_SOL, 'SOL');

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('   Your balance:', balance / LAMPORTS_PER_SOL, 'SOL');

  if (balance < Number(amountLamports)) {
    throw new Error('Insufficient SOL balance');
  }

  // Create transaction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: recipient,
      lamports: Number(amountLamports)
    })
  );

  // Send and confirm
  console.log('   Broadcasting transaction...');
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [wallet],
    {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed'
    }
  );

  return signature;
}

/**
 * Execute SPL token transfer (e.g., USDC)
 */
async function executeTokenTransfer(
  connection: Connection,
  wallet: Keypair,
  recipient: PublicKey,
  amount: string,
  tokenMintAddress: string
): Promise<string> {
  console.log('');
  console.log('💸 Sending SPL Token...');
  console.log('   To:', recipient.toBase58());
  console.log('   Amount:', amount, 'tokens (base units)');
  console.log('   Token:', tokenMintAddress);

  // Validate token mint
  let tokenMint: PublicKey;
  try {
    tokenMint = new PublicKey(tokenMintAddress);
  } catch (error) {
    throw new Error(`Invalid token mint address: ${tokenMintAddress}`);
  }

  // Get or create associated token accounts
  console.log('   Getting token accounts...');

  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    tokenMint,
    wallet.publicKey
  );

  const toTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    tokenMint,
    recipient
  );

  // Check balance
  const tokenBalance = Number(fromTokenAccount.amount);
  console.log('   Your token balance:', tokenBalance);

  if (tokenBalance < Number(amount)) {
    throw new Error(`Insufficient token balance. Have: ${tokenBalance}, need: ${amount}`);
  }

  // Create transfer instruction
  const transaction = new Transaction().add(
    createTransferInstruction(
      fromTokenAccount.address,
      toTokenAccount.address,
      wallet.publicKey,
      Number(amount),
      [],
      TOKEN_PROGRAM_ID
    )
  );

  // Send and confirm
  console.log('   Broadcasting transaction...');
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [wallet],
    {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed'
    }
  );

  return signature;
}

// Run the script
executePayment();
