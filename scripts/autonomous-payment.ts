#!/usr/bin/env ts-node
/**
 * Autonomous Solana Payment Script
 *
 * Executes USDC payments on Solana devnet/mainnet
 * Uses SOLANA_PRIVATE_KEY from environment (passed by Claude Desktop)
 * Returns transaction signature for verification
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getAccount
} from '@solana/spl-token';
import bs58 from 'bs58';

async function main() {
  const recipient = process.argv[2];
  const amount = process.argv[3];
  const tokenMint = process.argv[4];

  if (!recipient || !amount || !tokenMint) {
    console.error('Usage: autonomous-payment.ts <recipient> <amount> <tokenMint>');
    process.exit(1);
  }

  // Get private key from environment (set by Claude Desktop MCP config)
  const privateKeyBase58 = process.env.SOLANA_PRIVATE_KEY;
  if (!privateKeyBase58) {
    console.error('❌ SOLANA_PRIVATE_KEY not found in environment');
    console.error('Make sure it is set in Claude Desktop MCP config');
    process.exit(1);
  }

  // Connect to Solana (use Helius RPC to bypass Claude Desktop restrictions)
  const network = process.env.NETWORK || 'devnet';
  const rpcUrl = process.env.SOLANA_RPC_URL ||
    (network === 'mainnet-beta'
      ? 'https://mainnet.helius-rpc.com'
      : 'https://devnet.helius-rpc.com');

  const connection = new Connection(rpcUrl, 'confirmed');

  try {
    // Load payer wallet from private key
    const secretKey = bs58.decode(privateKeyBase58);
    const payer = Keypair.fromSecretKey(secretKey);

    console.error('💰 Payer:', payer.publicKey.toBase58());
    console.error('🎯 Recipient:', recipient);
    console.error('💵 Amount:', amount, 'base units');
    console.error('🪙 Token:', tokenMint);
    console.error('🌐 Network:', network);

    const recipientPubkey = new PublicKey(recipient);
    const mintPubkey = new PublicKey(tokenMint);

    // Get token accounts
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mintPubkey,
      payer.publicKey
    );

    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mintPubkey,
      recipientPubkey
    );

    console.error('📤 From token account:', fromTokenAccount.address.toBase58());
    console.error('📥 To token account:', toTokenAccount.address.toBase58());

    // Check balance
    const balance = await connection.getTokenAccountBalance(fromTokenAccount.address);
    console.error('💼 Current balance:', balance.value.uiAmount, balance.value.uiAmountString);

    if (parseInt(balance.value.amount) < parseInt(amount)) {
      console.error('❌ Insufficient balance');
      console.error(`   Required: ${amount} base units`);
      console.error(`   Available: ${balance.value.amount} base units`);
      process.exit(1);
    }

    // Create and send transfer
    console.error('🔄 Creating transaction...');
    const transaction = new Transaction().add(
      createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        payer.publicKey,
        parseInt(amount),
        [],
        TOKEN_PROGRAM_ID
      )
    );

    console.error('📡 Sending transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer],
      {
        commitment: 'confirmed',
        maxRetries: 3
      }
    );

    // Output ONLY the signature on stdout (for Claude to capture)
    console.log(signature);

    // All other output to stderr so it doesn't interfere
    console.error('✅ Payment successful!');
    console.error('📝 Transaction signature:', signature);
    console.error(`🔍 View: https://explorer.solana.com/tx/${signature}?cluster=${network}`);

  } catch (error: any) {
    console.error('❌ Payment failed:', error.message);
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
    process.exit(1);
  }
}

main();
