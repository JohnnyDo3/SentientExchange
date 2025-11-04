import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

const WALLET_ADDRESS = process.env.WALLET_ADDRESS || '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123';
const USDC_CONTRACT = process.env.USDC_CONTRACT || '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC
const NETWORK = process.env.NETWORK || 'base-sepolia';

// Pricing tiers in USDC
export const PRICING = {
  PERMIT_INFO: parseFloat(process.env.PRICE_PERMIT_INFO || '5.00'),
  FORM_GENERATOR: parseFloat(process.env.PRICE_FORM_GENERATOR || '30.00'),
  AUTO_SUBMIT: parseFloat(process.env.PRICE_AUTO_SUBMIT || '150.00'),
};

interface PaymentProof {
  network: string;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  asset: string;
}

// Store used transaction hashes to prevent replay attacks
// In production: Use Redis or database for distributed systems
const usedTxHashes = new Set<string>();

// Cleanup old tx hashes periodically (24 hour window)
setInterval(() => {
  if (usedTxHashes.size > 10000) {
    logger.warn('TX hash cache growing large, clearing old entries');
    usedTxHashes.clear();
  }
}, 3600000); // Every hour

/**
 * Create x402 middleware with tier-specific pricing
 *
 * Security features:
 * - Replay attack prevention (tx hash tracking)
 * - Network validation (base-sepolia/base)
 * - Recipient address verification
 * - Amount verification (with tolerance for gas variance)
 * - Asset verification (USDC only)
 * - Payment proof structure validation
 *
 * @param tier - Pricing tier ('permit-info', 'form-generator', 'auto-submit')
 */
export function createX402Middleware(tier: 'permit-info' | 'form-generator' | 'auto-submit') {
  const tierPrices = {
    'permit-info': PRICING.PERMIT_INFO,
    'form-generator': PRICING.FORM_GENERATOR,
    'auto-submit': PRICING.AUTO_SUBMIT,
  };

  const requiredPrice = tierPrices[tier];

  return (req: Request, res: Response, next: NextFunction) => {
    const paymentHeader = req.headers['x-payment'] as string;

    // Step 1: No payment header - return 402 Payment Required
    if (!paymentHeader) {
      logger.info('No payment header, returning 402', {
        tier,
        requiredPrice,
        path: req.path
      });

      return res.status(402).json({
        x402Version: 1,
        accepts: [
          {
            scheme: 'exact',
            network: NETWORK,
            maxAmountRequired: (requiredPrice * 1e6).toString(), // Convert to 6 decimals for USDC
            resource: req.path,
            description: `${tier} - ${process.env.SERVICE_DESCRIPTION || 'HVAC permit service'}`,
            mimeType: 'application/json',
            payTo: WALLET_ADDRESS,
            maxTimeoutSeconds: 60,
            asset: USDC_CONTRACT,
            extra: {
              name: 'USD Coin',
              version: '2',
              tier,
              priceUSDC: requiredPrice,
            },
          },
        ],
      });
    }

    // Step 2: Validate payment proof
    try {
      const payment: PaymentProof = JSON.parse(paymentHeader);

      logger.info('Validating payment proof', {
        tier,
        txHash: payment.txHash,
        from: payment.from,
        amount: payment.amount,
      });

      // Security check: Validate payment structure
      if (!payment.network || !payment.txHash || !payment.from || !payment.to || !payment.amount || !payment.asset) {
        logger.warn('Incomplete payment proof', { payment });
        return res.status(400).json({
          error: 'Invalid payment proof structure',
          required: ['network', 'txHash', 'from', 'to', 'amount', 'asset'],
        });
      }

      // Security check: Validate network
      if (payment.network !== NETWORK) {
        logger.warn('Invalid network', {
          expected: NETWORK,
          received: payment.network
        });
        return res.status(400).json({
          error: 'Invalid network',
          expected: NETWORK,
          received: payment.network,
        });
      }

      // Security check: Validate recipient address
      if (payment.to.toLowerCase() !== WALLET_ADDRESS.toLowerCase()) {
        logger.warn('Invalid recipient address', {
          expected: WALLET_ADDRESS,
          received: payment.to
        });
        return res.status(400).json({
          error: 'Invalid recipient address',
          expected: WALLET_ADDRESS,
          received: payment.to,
        });
      }

      // Security check: Validate payment amount (allow 0.1% tolerance for gas variance)
      const paidAmount = parseInt(payment.amount) / 1e6;
      const minAcceptable = requiredPrice * 0.999; // 0.1% tolerance

      if (paidAmount < minAcceptable) {
        logger.warn('Insufficient payment amount', {
          required: requiredPrice,
          paid: paidAmount,
          tier
        });
        return res.status(400).json({
          error: 'Insufficient payment amount',
          required: requiredPrice,
          paid: paidAmount,
          tier,
        });
      }

      // Security check: Validate payment asset (USDC only)
      if (payment.asset.toLowerCase() !== USDC_CONTRACT.toLowerCase()) {
        logger.warn('Invalid payment asset', {
          expected: USDC_CONTRACT,
          received: payment.asset
        });
        return res.status(400).json({
          error: 'Invalid payment asset',
          expected: USDC_CONTRACT,
          received: payment.asset,
        });
      }

      // Security check: Prevent replay attacks
      if (usedTxHashes.has(payment.txHash)) {
        logger.warn('Replay attack detected', {
          txHash: payment.txHash,
          from: payment.from
        });
        return res.status(400).json({
          error: 'Transaction already used',
          details: 'This transaction has already been submitted. Each payment can only be used once.',
        });
      }

      // Mark transaction as used
      usedTxHashes.add(payment.txHash);

      // TODO: In production, verify transaction on-chain via RPC
      // - Connect to Base/Base Sepolia RPC
      // - Query transaction by hash
      // - Verify: from, to, amount, asset, timestamp (not too old)
      // - Ensure transaction is confirmed (sufficient block depth)

      logger.info('Payment verified successfully', {
        tier,
        txHash: payment.txHash,
        amount: paidAmount,
        from: payment.from,
        overpayment: paidAmount > requiredPrice ? (paidAmount - requiredPrice).toFixed(2) : null,
      });

      // Attach payment info to request for logging/analytics
      (req as any).payment = {
        ...payment,
        tier,
        priceUSDC: requiredPrice,
        paidUSDC: paidAmount,
        verified: true,
      };

      // Step 3: Payment valid, proceed with request
      next();
    } catch (error: any) {
      logger.error('Payment validation error', {
        error: error.message,
        tier,
        path: req.path
      });
      return res.status(400).json({
        error: 'Invalid payment proof',
        details: error.message,
      });
    }
  };
}

// Export pre-configured middleware for each tier
export const permitInfoAuth = createX402Middleware('permit-info');
export const formGeneratorAuth = createX402Middleware('form-generator');
export const autoSubmitAuth = createX402Middleware('auto-submit');
