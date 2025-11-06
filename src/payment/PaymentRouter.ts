/**
 * Payment Router
 * Intelligent routing between payment providers with automatic failover
 * Prioritizes x402/PayAI, falls back to direct Solana on failure
 */

import { logger } from '../utils/logger';
import {
  PaymentProvider,
  PaymentDetails,
  PaymentResult,
  PaymentRouterConfig
} from './types';
import { PaymentError, getErrorMessage } from '../types/errors';

export class PaymentRouter {
  private config: PaymentRouterConfig;
  private failoverAttempts: Map<string, number> = new Map();
  private lastHealthCheck: Map<string, { healthy: boolean; timestamp: number }> = new Map();
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute

  constructor(config: PaymentRouterConfig) {
    this.config = config;
    logger.info('PaymentRouter initialized', {
      primary: config.primaryProvider.name,
      fallback: config.fallbackProvider?.name || 'none',
      autoFallback: config.autoFallback
    });
  }

  /**
   * Initialize all providers
   */
  async initialize(): Promise<void> {
    try {
      await this.config.primaryProvider.initialize();
      logger.info('Primary provider initialized:', this.config.primaryProvider.name);

      if (this.config.fallbackProvider) {
        await this.config.fallbackProvider.initialize();
        logger.info('Fallback provider initialized:', this.config.fallbackProvider.name);
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error('PaymentRouter initialization failed:', error);
      throw new PaymentError(`PaymentRouter initialization failed: ${message}`);
    }
  }

  /**
   * Execute payment with intelligent routing and automatic failover
   */
  async executePayment(details: PaymentDetails): Promise<PaymentResult> {
    const startTime = Date.now();
    let lastError: string | undefined;

    // Try primary provider first
    try {
      // Check primary provider health
      const primaryHealth = await this.checkProviderHealth(this.config.primaryProvider);

      if (primaryHealth.healthy) {
        logger.info('Attempting payment with primary provider:', this.config.primaryProvider.name);
        const result = await this.executeWithRetry(
          this.config.primaryProvider,
          details,
          this.config.maxRetries
        );

        if (result.success) {
          logger.info('Payment successful via primary provider', {
            provider: result.provider,
            signature: result.signature,
            duration: Date.now() - startTime
          });
          return result;
        }

        lastError = result.error;
        logger.warn('Primary provider failed:', lastError);
      } else {
        logger.warn('Primary provider unhealthy, skipping:', primaryHealth.message);
        lastError = primaryHealth.message;
      }

    } catch (error: unknown) {
      lastError = getErrorMessage(error);
      logger.error('Primary provider error:', error);
    }

    // Try fallback provider if available and enabled
    if (this.config.autoFallback && this.config.fallbackProvider) {
      try {
        logger.info('Attempting payment with fallback provider:', this.config.fallbackProvider.name);

        const fallbackHealth = await this.checkProviderHealth(this.config.fallbackProvider);

        if (!fallbackHealth.healthy) {
          logger.error('Fallback provider also unhealthy:', fallbackHealth.message);
          return {
            success: false,
            error: `Both providers failed. Primary: ${lastError}, Fallback: ${fallbackHealth.message}`,
            provider: 'fallback',
            timestamp: new Date(),
            details
          };
        }

        const result = await this.executeWithRetry(
          this.config.fallbackProvider,
          details,
          this.config.maxRetries
        );

        if (result.success) {
          logger.info('Payment successful via fallback provider', {
            provider: result.provider,
            signature: result.signature,
            duration: Date.now() - startTime
          });

          // Increment failover counter for monitoring
          const count = this.failoverAttempts.get('fallback_count') || 0;
          this.failoverAttempts.set('fallback_count', count + 1);
        }

        return result;

      } catch (error: unknown) {
        const message = getErrorMessage(error);
        logger.error('Fallback provider error:', error);
        return {
          success: false,
          error: `All providers failed. Primary: ${lastError}, Fallback: ${message}`,
          provider: 'fallback',
          timestamp: new Date(),
          details
        };
      }
    }

    // No fallback available or disabled
    return {
      success: false,
      error: lastError || 'Payment execution failed',
      provider: 'x402',
      timestamp: new Date(),
      details
    };
  }

  /**
   * Execute payment with retry logic
   */
  private async executeWithRetry(
    provider: PaymentProvider,
    details: PaymentDetails,
    maxRetries: number
  ): Promise<PaymentResult> {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Payment attempt ${attempt}/${maxRetries} with ${provider.name}`);

        const result = await provider.executePayment(details);

        if (result.success) {
          return result;
        }

        lastError = result.error;

        // Don't retry if it's a validation error (amount too high, etc.)
        if (lastError?.includes('exceeds maximum') || lastError?.includes('Insufficient balance')) {
          logger.warn('Non-retryable error, aborting:', lastError);
          return result;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          logger.debug(`Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }

      } catch (error: unknown) {
        lastError = getErrorMessage(error);
        logger.error(`Attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError || 'Max retries exceeded',
      provider: provider.name === 'X402Provider' ? 'x402' : 'direct-solana',
      timestamp: new Date(),
      details
    };
  }

  /**
   * Check provider health with caching
   */
  private async checkProviderHealth(
    provider: PaymentProvider
  ): Promise<{ healthy: boolean; message?: string }> {
    const cached = this.lastHealthCheck.get(provider.name);
    const now = Date.now();

    // Return cached result if recent
    if (cached && (now - cached.timestamp) < this.HEALTH_CHECK_INTERVAL) {
      return { healthy: cached.healthy };
    }

    // Perform health check
    const health = await provider.healthCheck();

    // Cache result
    this.lastHealthCheck.set(provider.name, {
      healthy: health.healthy,
      timestamp: now
    });

    return health;
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(transactionHash: string, provider?: 'primary' | 'fallback'): Promise<boolean> {
    try {
      if (provider === 'fallback' && this.config.fallbackProvider) {
        return await this.config.fallbackProvider.verifyPayment(transactionHash);
      }

      // Try primary first
      const primaryResult = await this.config.primaryProvider.verifyPayment(transactionHash);
      if (primaryResult) {
        return true;
      }

      // Try fallback if available
      if (this.config.fallbackProvider) {
        return await this.config.fallbackProvider.verifyPayment(transactionHash);
      }

      return false;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error('Payment verification failed:', message);
      return false;
    }
  }

  /**
   * Get wallet address from primary provider
   */
  async getWalletAddress(): Promise<string> {
    return await this.config.primaryProvider.getWalletAddress();
  }

  /**
   * Get failover statistics
   */
  getFailoverStats(): { totalFailovers: number } {
    return {
      totalFailovers: this.failoverAttempts.get('fallback_count') || 0
    };
  }

  /**
   * Force health check refresh
   */
  async refreshHealthChecks(): Promise<void> {
    this.lastHealthCheck.clear();
    await this.checkProviderHealth(this.config.primaryProvider);
    if (this.config.fallbackProvider) {
      await this.checkProviderHealth(this.config.fallbackProvider);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
