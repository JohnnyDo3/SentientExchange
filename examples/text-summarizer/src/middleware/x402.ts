import { Request, Response, NextFunction } from 'express';

const WALLET_ADDRESS = process.env.WALLET_ADDRESS || '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123';
const PRICE_USDC = parseFloat(process.env.PRICE_USDC || '0.02');
const USDC_CONTRACT = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia
const NETWORK = process.env.NETWORK || 'base-sepolia';

interface PaymentProof {
  network: string;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  asset: string;
}

// Track used transaction hashes to prevent replay attacks
const usedTxHashes = new Set<string>();

export function x402Middleware(req: Request, res: Response, next: NextFunction) {
  const paymentHeader = req.headers['x-payment'] as string;

  // If no payment header, return 402 with payment requirements
  if (!paymentHeader) {
    return res.status(402).json({
      x402Version: 1,
      accepts: [{
        scheme: "exact",
        network: NETWORK,
        maxAmountRequired: (PRICE_USDC * 1e6).toString(), // Convert to 6 decimals
        resource: req.path,
        description: process.env.SERVICE_DESCRIPTION || "AI image analysis service",
        mimeType: "application/json",
        payTo: WALLET_ADDRESS,
        maxTimeoutSeconds: 30,
        asset: USDC_CONTRACT,
        extra: {
          name: "USD Coin",
          version: "2"
        }
      }]
    });
  }

  try {
    // Parse payment proof
    const payment: PaymentProof = JSON.parse(paymentHeader);

    // Validate network
    if (payment.network !== NETWORK) {
      return res.status(400).json({ error: 'Invalid network' });
    }

    // Validate recipient
    if (payment.to.toLowerCase() !== WALLET_ADDRESS.toLowerCase()) {
      return res.status(400).json({ error: 'Invalid recipient address' });
    }

    // Validate amount
    const paidAmount = parseInt(payment.amount) / 1e6;
    if (paidAmount < PRICE_USDC) {
      return res.status(400).json({
        error: 'Insufficient payment amount',
        required: PRICE_USDC,
        paid: paidAmount
      });
    }

    // Validate asset
    if (payment.asset.toLowerCase() !== USDC_CONTRACT.toLowerCase()) {
      return res.status(400).json({ error: 'Invalid payment asset' });
    }

    // Check for replay attacks
    if (usedTxHashes.has(payment.txHash)) {
      return res.status(400).json({ error: 'Transaction already used' });
    }

    // Mark transaction as used
    usedTxHashes.add(payment.txHash);

    // Payment valid, proceed with request
    console.log(`✓ Payment verified: ${paidAmount} USDC from ${payment.from}`);
    next();
  } catch (error: any) {
    console.error('Payment validation error:', error);
    return res.status(400).json({ error: 'Invalid payment proof' });
  }
}
