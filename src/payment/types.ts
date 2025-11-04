/**
 * Payment Provider Types
 * Abstraction layer for different payment implementations
 */

import { Transaction } from '../types/transaction';

/**
 * Payment details extracted from x402 Payment Required response
 */
export interface PaymentDetails {
  recipient: string;
  amount: bigint; // Amount in token base units
  currency: string; // Token symbol (e.g., 'USDC')
  tokenAddress: string; // Token mint/contract address
  network: 'solana-devnet' | 'solana' | 'base-sepolia' | 'base' | 'avalanche-fuji' | 'avalanche' | 'iotex' | 'sei' | 'sei-testnet';
  metadata?: Record<string, any>;
}

/**
 * Payment execution result
 */
export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  signature?: string;
  error?: string;
  provider: 'x402' | 'direct-solana' | 'fallback';
  timestamp: Date;
  details: PaymentDetails;
}

/**
 * Payment provider configuration
 */
export interface PaymentProviderConfig {
  network: string;
  maxPaymentValue?: bigint; // Maximum allowed payment in token base units
  rpcUrl?: string;
  privateKey?: string;
  secretKey?: string;
}

/**
 * Abstract payment provider interface
 * All payment implementations must implement this interface
 */
export interface PaymentProvider {
  /**
   * Provider name for logging/debugging
   */
  name: string;

  /**
   * Initialize the provider
   */
  initialize(): Promise<void>;

  /**
   * Execute a payment
   */
  executePayment(details: PaymentDetails): Promise<PaymentResult>;

  /**
   * Verify a payment transaction
   */
  verifyPayment(transactionHash: string): Promise<boolean>;

  /**
   * Get provider health status
   */
  healthCheck(): Promise<{ healthy: boolean; message?: string }>;

  /**
   * Get wallet address (public key)
   */
  getWalletAddress(): Promise<string>;
}

/**
 * Payment router configuration
 */
export interface PaymentRouterConfig {
  primaryProvider: PaymentProvider;
  fallbackProvider?: PaymentProvider;
  autoFallback: boolean;
  maxRetries: number;
  retryDelay: number; // milliseconds
}

/**
 * HTTP 402 Payment Required response structure
 */
export interface X402Response {
  status: 402;
  headers: {
    'WWW-Authenticate': string;
    'Content-Type'?: string;
  };
  body?: {
    message?: string;
    payment?: {
      recipient: string;
      amount: string;
      currency: string;
      network: string;
      tokenAddress?: string;
    };
  };
}
