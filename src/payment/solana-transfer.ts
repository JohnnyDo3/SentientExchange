/**
 * Solana Token Transfer Utilities
 * Shared logic for SPL token transfers
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
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { logger } from '../utils/logger';

/**
 * Execute a SPL token transfer on Solana
 */
export async function executeTransfer(
  connection: Connection,
  payer: Keypair,
  recipient: PublicKey,
  tokenMint: PublicKey,
  amount: bigint
): Promise<string> {
  try {
    logger.debug('Creating Solana token transfer', {
      payer: payer.publicKey.toBase58(),
      recipient: recipient.toBase58(),
      tokenMint: tokenMint.toBase58(),
      amount: amount.toString()
    });

    // Get or create associated token accounts
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      tokenMint,
      payer.publicKey
    );

    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      tokenMint,
      recipient
    );

    logger.debug('Token accounts resolved', {
      from: fromTokenAccount.address.toBase58(),
      to: toTokenAccount.address.toBase58()
    });

    // Check balance
    const balance = await connection.getTokenAccountBalance(fromTokenAccount.address);
    const balanceAmount = BigInt(balance.value.amount);

    if (balanceAmount < amount) {
      throw new Error(
        `Insufficient balance: required ${amount}, available ${balanceAmount}`
      );
    }

    logger.debug('Balance check passed', {
      required: amount.toString(),
      available: balanceAmount.toString()
    });

    // Create transfer transaction
    const transaction = new Transaction().add(
      createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        payer.publicKey,
        Number(amount), // Convert bigint to number for instruction
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Send and confirm transaction
    logger.debug('Sending transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer],
      {
        commitment: 'confirmed',
        maxRetries: 3
      }
    );

    logger.info('Solana transfer successful', {
      signature,
      amount: amount.toString(),
      recipient: recipient.toBase58()
    });

    return signature;

  } catch (error: any) {
    logger.error('Solana transfer failed:', {
      error: error.message,
      payer: payer.publicKey.toBase58(),
      recipient: recipient.toBase58()
    });
    throw error;
  }
}

/**
 * Get token account balance
 */
export async function getTokenBalance(
  connection: Connection,
  owner: PublicKey,
  tokenMint: PublicKey
): Promise<bigint> {
  try {
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      Keypair.generate(), // Dummy keypair for read-only operation
      tokenMint,
      owner,
      false // Don't create if it doesn't exist
    );

    const balance = await connection.getTokenAccountBalance(tokenAccount.address);
    return BigInt(balance.value.amount);
  } catch (error: any) {
    logger.warn('Failed to get token balance:', error.message);
    return BigInt(0);
  }
}
