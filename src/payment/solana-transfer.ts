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
  Token,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { logger } from '../utils/logger';
import { PaymentError, getErrorMessage } from '../types/errors';

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

    // Create token instance
    const token = new Token(connection, tokenMint, TOKEN_PROGRAM_ID, payer);

    // Get or create associated token accounts
    const fromTokenAccount = await token.getOrCreateAssociatedAccountInfo(payer.publicKey);
    const toTokenAccount = await token.getOrCreateAssociatedAccountInfo(recipient);

    logger.debug('Token accounts resolved', {
      from: fromTokenAccount.address.toBase58(),
      to: toTokenAccount.address.toBase58()
    });

    // Check balance
    const balance = await token.getAccountInfo(fromTokenAccount.address);
    const balanceAmount = BigInt(balance.amount.toString());

    if (balanceAmount < amount) {
      throw new Error(
        `Insufficient balance: required ${amount}, available ${balanceAmount}`
      );
    }

    logger.debug('Balance check passed', {
      required: amount.toString(),
      available: balanceAmount.toString()
    });

    // Execute transfer
    logger.debug('Sending transaction...');
    const signature = await token.transfer(
      fromTokenAccount.address,
      toTokenAccount.address,
      payer,
      [],
      Number(amount)
    );

    logger.info('Solana transfer successful', {
      signature,
      amount: amount.toString(),
      recipient: recipient.toBase58()
    });

    return signature;

  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error('Solana transfer failed:', {
      error: message,
      payer: payer.publicKey.toBase58(),
      recipient: recipient.toBase58()
    });
    throw new PaymentError(`Solana transfer failed: ${message}`);
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
    const token = new Token(connection, tokenMint, TOKEN_PROGRAM_ID, Keypair.generate());
    const tokenAccountAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      tokenMint,
      owner
    );

    const balance = await connection.getTokenAccountBalance(tokenAccountAddress);
    return BigInt(balance.value.amount);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.warn('Failed to get token balance:', message);
    return BigInt(0);
  }
}
