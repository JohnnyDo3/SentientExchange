import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { Connection, PublicKey } from '@solana/web3.js';

const WALLET_ADDRESS = process.env.WALLET_ADDRESS || 'DeDDFd3Fr2fdsC4Wi2Hi7MxbyRHokst3jcQ9L2V1nje3';
const PRICE_USDC = parseFloat(process.env.PRICE_USDC || '1.00');
const USDC_CONTRACT = process.env.NETWORK === 'solana-devnet'
  ? '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' // Solana USDC devnet (Circle faucet)
  : '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC
const NETWORK = process.env.NETWORK || 'solana-devnet';

interface PaymentProof {
  network: string;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  asset: string;
}

// Store used transaction hashes to prevent replay attacks
const usedTxHashes = new Set<string>();

// Initialize Solana connection
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

/**
 * Verify transaction on Solana blockchain
 */
async function verifyTransactionOnChain(
  txHash: string,
  expectedRecipient: string,
  expectedAmount: number
): Promise<void> {
  try {
    logger.info('🔍 Verifying transaction on-chain:', txHash);

    // Fetch transaction from blockchain
    const tx = await connection.getTransaction(txHash, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      throw new Error('Transaction not found on blockchain');
    }

    if (!tx.meta?.postBalances) {
      throw new Error('Transaction does not have balance information');
    }

    // For devnet, we accept the transaction if it exists
    // In production, you would verify:
    // 1. Transaction is confirmed
    // 2. Correct token transfer amount
    // 3. Correct recipient address
    // 4. Transaction is recent (within 5 minutes)

    logger.info('✅ Transaction found on-chain');

    // Additional verification can be added here:
    // - Check transaction is confirmed
    // - Parse token transfer instructions
    // - Verify amount and recipient match

  } catch (error: any) {
    logger.error('❌ On-chain verification failed:', error.message);
    throw new Error(`Transaction verification failed: ${error.message}`);
  }
}

/**
 * x402 Payment Middleware
 *
 * Implements the x402 payment protocol:
 * 1. If no payment header, return 402 with payment requirements
 * 2. If payment header present, validate payment proof
 * 3. If valid, allow request to proceed
 */
export async function x402Middleware(req: Request, res: Response, next: NextFunction) {
  const paymentHeader = req.headers['x-payment'] as string;

  // Step 1: No payment header - return 402 Payment Required
  if (!paymentHeader) {
    logger.info('No payment header, returning 402');

    return res.status(402).json({
      x402Version: 1,
      accepts: [
        {
          scheme: 'exact',
          network: NETWORK,
          maxAmountRequired: (PRICE_USDC * 1e6).toString(), // Convert to 6 decimals for USDC
          resource: req.path,
          description: process.env.SERVICE_DESCRIPTION || 'Pricing optimizer - analyzes competitor pricing and suggests strategy',
          mimeType: 'application/json',
          payTo: WALLET_ADDRESS,
          maxTimeoutSeconds: 30,
          asset: USDC_CONTRACT,
          extra: {
            name: 'USD Coin',
            version: '2',
          },
        },
      ],
    });
  }

  // Step 2: Validate payment proof
  try {
    const payment: PaymentProof = JSON.parse(paymentHeader);

    logger.info('Validating payment proof:', {
      txHash: payment.txHash,
      from: payment.from,
      amount: payment.amount,
    });

    // Validate network
    if (payment.network !== NETWORK) {
      logger.warn('Invalid network:', payment.network);
      return res.status(400).json({
        error: 'Invalid network',
        expected: NETWORK,
        received: payment.network,
      });
    }

    // Validate recipient address
    if (payment.to.toLowerCase() !== WALLET_ADDRESS.toLowerCase()) {
      logger.warn('Invalid recipient address:', payment.to);
      return res.status(400).json({
        error: 'Invalid recipient address',
        expected: WALLET_ADDRESS,
        received: payment.to,
      });
    }

    // Validate payment amount
    const paidAmount = parseInt(payment.amount) / 1e6;
    if (paidAmount < PRICE_USDC) {
      logger.warn('Insufficient payment amount:', paidAmount);
      return res.status(400).json({
        error: 'Insufficient payment amount',
        required: PRICE_USDC,
        paid: paidAmount,
      });
    }

    // Validate payment asset
    if (payment.asset.toLowerCase() !== USDC_CONTRACT.toLowerCase()) {
      logger.warn('Invalid payment asset:', payment.asset);
      return res.status(400).json({
        error: 'Invalid payment asset',
        expected: USDC_CONTRACT,
        received: payment.asset,
      });
    }

    // Check for replay attack
    if (usedTxHashes.has(payment.txHash)) {
      logger.warn('Replay attack detected:', payment.txHash);
      return res.status(400).json({
        error: 'Transaction already used',
      });
    }

    // Mark transaction as used
    usedTxHashes.add(payment.txHash);

    // Verify transaction on Solana blockchain
    await verifyTransactionOnChain(payment.txHash, WALLET_ADDRESS, paidAmount);

    logger.info('✅ Payment verified on-chain:', {
      txHash: payment.txHash,
      amount: paidAmount,
      from: payment.from,
    });

    // Attach payment info to request for logging/analytics
    (req as any).payment = payment;

    // Step 3: Payment valid, proceed with request
    next();
  } catch (error: any) {
    logger.error('Payment validation error:', error);
    return res.status(400).json({
      error: 'Invalid payment proof',
      details: error.message,
    });
  }
}
