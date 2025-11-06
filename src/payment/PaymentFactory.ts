/**
 * Payment Factory
 * Creates and configures payment providers and router based on environment
 */

import { logger } from '../utils/logger';
import { PaymentRouter } from './PaymentRouter';
import { X402Provider } from './X402Provider';
import { DirectSolanaProvider } from './DirectSolanaProvider';
import { PaymentProviderConfig } from './types';

export interface PaymentFactoryConfig {
  network?: string;
  maxPaymentValue?: string; // In base units as string
  rpcUrl?: string;
  privateKey?: string;
  secretKey?: string;
  paymentMode?: 'x402' | 'direct' | 'hybrid';
  facilitatorUrl?: string;
}

/**
 * Create and initialize payment router with appropriate providers
 */
export async function createPaymentRouter(
  config?: PaymentFactoryConfig
): Promise<PaymentRouter> {
  // Get configuration from environment with fallbacks
  const network = config?.network || process.env.NETWORK || 'devnet';
  const maxPaymentValue = config?.maxPaymentValue || process.env.MAX_PAYMENT_VALUE;
  const rpcUrl = config?.rpcUrl || process.env.SOLANA_RPC_URL;
  const secretKey = config?.secretKey || process.env.SOLANA_PRIVATE_KEY;
  const paymentMode = config?.paymentMode ||
                      (process.env.PAYMENT_MODE as 'x402' | 'direct' | 'hybrid' | undefined) ||
                      'hybrid';

  logger.info('Creating payment router', {
    network,
    paymentMode,
    hasSecretKey: !!secretKey
  });

  // Parse max payment value
  const maxPaymentValueBigInt = maxPaymentValue
    ? BigInt(maxPaymentValue)
    : undefined;

  // Normalize network name for x402
  const x402Network = normalizeNetworkName(network);

  // Create provider configuration
  const providerConfig: PaymentProviderConfig = {
    network: x402Network,
    maxPaymentValue: maxPaymentValueBigInt,
    rpcUrl,
    secretKey
  };

  // Create providers based on payment mode
  let primaryProvider;
  let fallbackProvider;

  switch (paymentMode) {
    case 'x402':
      // x402 only, no fallback
      primaryProvider = new X402Provider(providerConfig);
      fallbackProvider = undefined;
      logger.info('Payment mode: x402 only (no fallback)');
      break;

    case 'direct':
      // Direct Solana only
      primaryProvider = new DirectSolanaProvider(providerConfig);
      fallbackProvider = undefined;
      logger.info('Payment mode: direct Solana only');
      break;

    case 'hybrid':
    default:
      // x402 primary with direct Solana fallback
      primaryProvider = new X402Provider(providerConfig);
      fallbackProvider = new DirectSolanaProvider(providerConfig);
      logger.info('Payment mode: hybrid (x402 → direct fallback)');
      break;
  }

  // Create payment router
  const router = new PaymentRouter({
    primaryProvider,
    fallbackProvider,
    autoFallback: paymentMode === 'hybrid',
    maxRetries: 3,
    retryDelay: 1000 // 1 second base delay
  });

  // Initialize router (initializes all providers)
  await router.initialize();

  logger.info('Payment router created and initialized', {
    mode: paymentMode,
    primaryProvider: primaryProvider.name,
    fallbackProvider: fallbackProvider?.name
  });

  return router;
}

/**
 * Normalize network name to x402 format
 */
function normalizeNetworkName(network: string): string {
  const normalized = network.toLowerCase();

  // Map common network names to x402 format
  const networkMap: Record<string, string> = {
    'devnet': 'solana-devnet',
    'mainnet-beta': 'solana',
    'mainnet': 'solana',
    'solana': 'solana',
    'solana-devnet': 'solana-devnet',
    'base-sepolia': 'base-sepolia',
    'base': 'base',
    'avalanche-fuji': 'avalanche-fuji',
    'avalanche': 'avalanche',
    'iotex': 'iotex',
    'sei': 'sei',
    'sei-testnet': 'sei-testnet'
  };

  return networkMap[normalized] || normalized;
}

/**
 * Create a standalone X402 provider (without router)
 */
export async function createX402Provider(
  config?: PaymentProviderConfig
): Promise<X402Provider> {
  const network = config?.network || process.env.NETWORK || 'devnet';
  const x402Network = normalizeNetworkName(network);

  const providerConfig: PaymentProviderConfig = {
    network: x402Network,
    maxPaymentValue: config?.maxPaymentValue,
    rpcUrl: config?.rpcUrl || process.env.SOLANA_RPC_URL,
    secretKey: config?.secretKey || process.env.SOLANA_PRIVATE_KEY
  };

  const provider = new X402Provider(providerConfig);
  await provider.initialize();

  return provider;
}

/**
 * Create a standalone Direct Solana provider (without router)
 */
export async function createDirectSolanaProvider(
  config?: PaymentProviderConfig
): Promise<DirectSolanaProvider> {
  const network = config?.network || process.env.NETWORK || 'devnet';

  const providerConfig: PaymentProviderConfig = {
    network,
    maxPaymentValue: config?.maxPaymentValue,
    rpcUrl: config?.rpcUrl || process.env.SOLANA_RPC_URL,
    secretKey: config?.secretKey || process.env.SOLANA_PRIVATE_KEY
  };

  const provider = new DirectSolanaProvider(providerConfig);
  await provider.initialize();

  return provider;
}
