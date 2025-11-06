import { PaymentRouter } from '../../../src/payment/PaymentRouter';
import {
  PaymentProvider,
  PaymentDetails,
  PaymentResult,
  PaymentRouterConfig
} from '../../../src/payment/types';
import { logger } from '../../../src/utils/logger';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock payment provider
class MockPaymentProvider implements PaymentProvider {
  name: string;
  initializeCalls: number = 0;
  executePaymentCalls: number = 0;
  healthCheckCalls: number = 0;
  verifyPaymentCalls: number = 0;

  // Configurable behavior for testing
  shouldInitializeSucceed: boolean = true;
  shouldExecuteSucceed: boolean = true;
  shouldBeHealthy: boolean = true;
  shouldVerifySucceed: boolean = true;
  executeDelay: number = 0; // Simulate processing time

  constructor(name: string) {
    this.name = name;
  }

  async initialize(): Promise<void> {
    this.initializeCalls++;
    if (!this.shouldInitializeSucceed) {
      throw new Error(`${this.name} initialization failed`);
    }
  }

  async executePayment(details: PaymentDetails): Promise<PaymentResult> {
    this.executePaymentCalls++;

    if (this.executeDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.executeDelay));
    }

    if (this.shouldExecuteSucceed) {
      return {
        success: true,
        signature: `${this.name}-sig-${Date.now()}`,
        provider: this.name === 'X402Provider' ? 'x402' : 'direct-solana',
        timestamp: new Date(),
        details,
      };
    } else {
      return {
        success: false,
        error: `${this.name} payment execution failed`,
        provider: this.name === 'X402Provider' ? 'x402' : 'direct-solana',
        timestamp: new Date(),
        details,
      };
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    this.healthCheckCalls++;
    return {
      healthy: this.shouldBeHealthy,
      message: this.shouldBeHealthy ? undefined : `${this.name} is unhealthy`,
    };
  }

  async verifyPayment(transactionHash: string): Promise<boolean> {
    this.verifyPaymentCalls++;
    return this.shouldVerifySucceed;
  }

  async getWalletAddress(): Promise<string> {
    return `${this.name}-wallet-address`;
  }
}

describe('PaymentRouter', () => {
  let router: PaymentRouter;
  let primaryProvider: MockPaymentProvider;
  let fallbackProvider: MockPaymentProvider;
  let config: PaymentRouterConfig;

  const samplePaymentDetails: PaymentDetails = {
    recipient: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    amount: BigInt(1000000),
    currency: 'USDC',
    tokenAddress: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // USDC devnet
    network: 'solana-devnet',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    primaryProvider = new MockPaymentProvider('X402Provider');
    fallbackProvider = new MockPaymentProvider('DirectSolanaProvider');

    config = {
      primaryProvider,
      fallbackProvider,
      autoFallback: true,
      maxRetries: 3,
      retryDelay: 100, // 100ms for testing
    };

    router = new PaymentRouter(config);
  });

  describe('Constructor', () => {
    it('should initialize with primary and fallback providers', () => {
      expect(logger.info).toHaveBeenCalledWith(
        'PaymentRouter initialized',
        expect.objectContaining({
          primary: 'X402Provider',
          fallback: 'DirectSolanaProvider',
          autoFallback: true,
        })
      );
    });

    it('should initialize without fallback provider', () => {
      const configWithoutFallback: PaymentRouterConfig = {
        primaryProvider,
        autoFallback: false,
        maxRetries: 3,
        retryDelay: 100,
      };

      const routerWithoutFallback = new PaymentRouter(configWithoutFallback);

      expect(logger.info).toHaveBeenCalledWith(
        'PaymentRouter initialized',
        expect.objectContaining({
          primary: 'X402Provider',
          fallback: 'none',
        })
      );
    });
  });

  describe('initialize', () => {
    it('should initialize both primary and fallback providers', async () => {
      await router.initialize();

      expect(primaryProvider.initializeCalls).toBe(1);
      expect(fallbackProvider.initializeCalls).toBe(1);
      expect(logger.info).toHaveBeenCalledWith(
        'Primary provider initialized:',
        'X402Provider'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Fallback provider initialized:',
        'DirectSolanaProvider'
      );
    });

    it('should initialize only primary provider when no fallback', async () => {
      const configWithoutFallback: PaymentRouterConfig = {
        primaryProvider,
        autoFallback: false,
        maxRetries: 3,
        retryDelay: 100,
      };

      const routerWithoutFallback = new PaymentRouter(configWithoutFallback);
      await routerWithoutFallback.initialize();

      expect(primaryProvider.initializeCalls).toBe(1);
      expect(fallbackProvider.initializeCalls).toBe(0);
    });

    it('should throw error if primary provider initialization fails', async () => {
      primaryProvider.shouldInitializeSucceed = false;

      await expect(router.initialize()).rejects.toThrow('PaymentRouter initialization failed');
      expect(logger.error).toHaveBeenCalledWith('PaymentRouter initialization failed:', expect.any(Error));
    });
  });

  describe('executePayment - Happy Path', () => {
    beforeEach(async () => {
      await router.initialize();
    });

    it('should successfully execute payment via primary provider', async () => {
      const result = await router.executePayment(samplePaymentDetails);

      expect(result.success).toBe(true);
      expect(result.signature).toContain('X402Provider-sig');
      expect(result.provider).toBe('x402');
      expect(primaryProvider.executePaymentCalls).toBe(1);
      expect(fallbackProvider.executePaymentCalls).toBe(0);

      expect(logger.info).toHaveBeenCalledWith(
        'Payment successful via primary provider',
        expect.objectContaining({
          provider: 'x402',
          signature: expect.any(String),
        })
      );
    });

    it('should check primary provider health before executing', async () => {
      await router.executePayment(samplePaymentDetails);

      expect(primaryProvider.healthCheckCalls).toBe(1);
    });
  });

  describe('executePayment - Automatic Failover', () => {
    beforeEach(async () => {
      await router.initialize();
    });

    it('should fallback to fallback provider when primary fails', async () => {
      primaryProvider.shouldExecuteSucceed = false;

      const result = await router.executePayment(samplePaymentDetails);

      expect(result.success).toBe(true);
      expect(result.signature).toContain('DirectSolanaProvider-sig');
      expect(result.provider).toBe('direct-solana');
      expect(primaryProvider.executePaymentCalls).toBeGreaterThan(0);
      expect(fallbackProvider.executePaymentCalls).toBeGreaterThan(0);

      expect(logger.info).toHaveBeenCalledWith(
        'Payment successful via fallback provider',
        expect.objectContaining({
          provider: 'direct-solana',
        })
      );
    });

    it('should skip primary provider if unhealthy and use fallback', async () => {
      primaryProvider.shouldBeHealthy = false;

      const result = await router.executePayment(samplePaymentDetails);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('direct-solana');
      expect(primaryProvider.executePaymentCalls).toBe(0); // Skipped
      expect(fallbackProvider.executePaymentCalls).toBeGreaterThan(0);

      expect(logger.warn).toHaveBeenCalledWith(
        'Primary provider unhealthy, skipping:',
        'X402Provider is unhealthy'
      );
    });

    it('should increment failover counter when using fallback', async () => {
      primaryProvider.shouldExecuteSucceed = false;

      await router.executePayment(samplePaymentDetails);

      const stats = router.getFailoverStats();
      expect(stats.totalFailovers).toBe(1);

      // Second failover
      await router.executePayment(samplePaymentDetails);
      const stats2 = router.getFailoverStats();
      expect(stats2.totalFailovers).toBe(2);
    });
  });

  describe('executePayment - Both Providers Fail', () => {
    beforeEach(async () => {
      await router.initialize();
    });

    it('should return error when both providers fail', async () => {
      primaryProvider.shouldExecuteSucceed = false;
      fallbackProvider.shouldExecuteSucceed = false;

      const result = await router.executePayment(samplePaymentDetails);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Error message varies based on retry logic - just check it exists
      expect(primaryProvider.executePaymentCalls).toBeGreaterThan(0);
      expect(fallbackProvider.executePaymentCalls).toBeGreaterThan(0);
    });

    it('should return error when both providers are unhealthy', async () => {
      primaryProvider.shouldBeHealthy = false;
      fallbackProvider.shouldBeHealthy = false;

      const result = await router.executePayment(samplePaymentDetails);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Both providers failed');
      expect(result.error).toContain('X402Provider is unhealthy');
      expect(result.error).toContain('DirectSolanaProvider is unhealthy');
    });
  });

  describe('executePayment - No Fallback / Disabled', () => {
    it('should not use fallback when autoFallback is false', async () => {
      const configNoFallback: PaymentRouterConfig = {
        primaryProvider,
        fallbackProvider,
        autoFallback: false, // Disabled
        maxRetries: 3,
        retryDelay: 100,
      };

      const routerNoFallback = new PaymentRouter(configNoFallback);
      await routerNoFallback.initialize();

      primaryProvider.shouldExecuteSucceed = false;

      const result = await routerNoFallback.executePayment(samplePaymentDetails);

      expect(result.success).toBe(false);
      expect(fallbackProvider.executePaymentCalls).toBe(0); // Not called
    });

    it('should not use fallback when no fallback provider configured', async () => {
      const configNoFallback: PaymentRouterConfig = {
        primaryProvider,
        autoFallback: true,
        maxRetries: 3,
        retryDelay: 100,
      };

      const routerNoFallback = new PaymentRouter(configNoFallback);
      await routerNoFallback.initialize();

      primaryProvider.shouldExecuteSucceed = false;

      const result = await routerNoFallback.executePayment(samplePaymentDetails);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined(); // Error message varies based on retry
    });
  });

  describe('executePayment - Retry Logic', () => {
    beforeEach(async () => {
      await router.initialize();
    });

    it('should retry up to maxRetries times', async () => {
      let attemptCount = 0;
      primaryProvider.executePayment = jest.fn(async () => {
        attemptCount++;
        if (attemptCount === 3) {
          // Succeed on 3rd attempt
          return {
            success: true,
            signature: 'success-sig',
            provider: 'x402' as const,
            timestamp: new Date(),
            details: samplePaymentDetails,
          };
        }
        return {
          success: false,
          error: 'Temporary network error',
          provider: 'x402' as const,
          timestamp: new Date(),
          details: samplePaymentDetails,
        };
      });

      const result = await router.executePayment(samplePaymentDetails);

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
    });

    it('should use exponential backoff for retries', async () => {
      const delays: number[] = [];
      let lastTime = Date.now();

      primaryProvider.executePayment = jest.fn(async () => {
        const now = Date.now();
        if (delays.length > 0) {
          delays.push(now - lastTime);
        }
        lastTime = now;

        return {
          success: false,
          error: 'Network error',
          provider: 'x402' as const,
          timestamp: new Date(),
          details: samplePaymentDetails,
        };
      });

      await router.executePayment(samplePaymentDetails);

      // Check that we retried and delays increased
      expect(delays.length).toBeGreaterThanOrEqual(2); // At least 2 retries
      // Check that delays roughly double (exponential backoff)
      // Allow wide tolerance for system timing variations
      if (delays.length >= 2) {
        // Second delay should be roughly 2x first delay (exponential backoff)
        expect(delays[1]).toBeGreaterThan(delays[0] * 1.5); // 1.5x minimum
      }
    }, 10000); // Longer timeout for retry delays

    it('should not retry on non-retryable errors', async () => {
      // Disable fallback for this test
      const configNoFallback: PaymentRouterConfig = {
        primaryProvider,
        autoFallback: false,
        maxRetries: 3,
        retryDelay: 100,
      };
      const routerNoFallback = new PaymentRouter(configNoFallback);
      await routerNoFallback.initialize();

      primaryProvider.executePayment = jest.fn(async () => ({
        success: false,
        error: 'Payment amount exceeds maximum allowed',
        provider: 'x402' as const,
        timestamp: new Date(),
        details: samplePaymentDetails,
      }));

      const result = await routerNoFallback.executePayment(samplePaymentDetails);

      expect(result.success).toBe(false);
      expect(primaryProvider.executePayment).toHaveBeenCalledTimes(1); // Only once, no retries
      expect(logger.warn).toHaveBeenCalledWith(
        'Non-retryable error, aborting:',
        'Payment amount exceeds maximum allowed'
      );
    });

    it('should not retry on insufficient balance errors', async () => {
      // Disable fallback for this test
      const configNoFallback: PaymentRouterConfig = {
        primaryProvider,
        autoFallback: false,
        maxRetries: 3,
        retryDelay: 100,
      };
      const routerNoFallback = new PaymentRouter(configNoFallback);
      await routerNoFallback.initialize();

      primaryProvider.executePayment = jest.fn(async () => ({
        success: false,
        error: 'Insufficient balance for transaction',
        provider: 'x402' as const,
        timestamp: new Date(),
        details: samplePaymentDetails,
      }));

      const result = await routerNoFallback.executePayment(samplePaymentDetails);

      expect(result.success).toBe(false);
      expect(primaryProvider.executePayment).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkProviderHealth - Caching', () => {
    beforeEach(async () => {
      await router.initialize();
    });

    it('should cache health check results for 1 minute', async () => {
      // First payment - checks health
      await router.executePayment(samplePaymentDetails);
      expect(primaryProvider.healthCheckCalls).toBe(1);

      // Second payment within 1 minute - uses cached result
      await router.executePayment(samplePaymentDetails);
      expect(primaryProvider.healthCheckCalls).toBe(1); // Still 1, cached
    });

    it('should refresh health check after cache expires', async () => {
      // Mock Date.now to simulate time passing
      const originalDateNow = Date.now;
      let currentTime = Date.now();

      global.Date.now = jest.fn(() => currentTime);

      await router.executePayment(samplePaymentDetails);
      expect(primaryProvider.healthCheckCalls).toBe(1);

      // Advance time by 61 seconds (past cache interval)
      currentTime += 61000;

      await router.executePayment(samplePaymentDetails);
      expect(primaryProvider.healthCheckCalls).toBe(2); // Refreshed

      // Restore Date.now
      global.Date.now = originalDateNow;
    });

    it('should force refresh health checks', async () => {
      await router.executePayment(samplePaymentDetails);
      expect(primaryProvider.healthCheckCalls).toBe(1);

      // Force refresh
      await router.refreshHealthChecks();
      expect(primaryProvider.healthCheckCalls).toBe(2);
      expect(fallbackProvider.healthCheckCalls).toBe(1);
    });
  });

  describe('verifyPayment', () => {
    it('should verify payment using primary provider', async () => {
      const txHash = 'test-tx-hash';
      const result = await router.verifyPayment(txHash);

      expect(result).toBe(true);
      expect(primaryProvider.verifyPaymentCalls).toBe(1);
    });

    it('should try fallback if primary verification fails', async () => {
      primaryProvider.shouldVerifySucceed = false;

      const txHash = 'test-tx-hash';
      const result = await router.verifyPayment(txHash);

      expect(result).toBe(true);
      expect(primaryProvider.verifyPaymentCalls).toBe(1);
      expect(fallbackProvider.verifyPaymentCalls).toBe(1);
    });

    it('should verify with specific provider when specified', async () => {
      const txHash = 'test-tx-hash';
      const result = await router.verifyPayment(txHash, 'fallback');

      expect(result).toBe(true);
      expect(primaryProvider.verifyPaymentCalls).toBe(0);
      expect(fallbackProvider.verifyPaymentCalls).toBe(1);
    });

    it('should return false if both providers fail verification', async () => {
      primaryProvider.shouldVerifySucceed = false;
      fallbackProvider.shouldVerifySucceed = false;

      const txHash = 'test-tx-hash';
      const result = await router.verifyPayment(txHash);

      expect(result).toBe(false);
    });

    it('should handle verification errors gracefully', async () => {
      primaryProvider.verifyPayment = jest.fn().mockRejectedValue(new Error('RPC error'));
      fallbackProvider.verifyPayment = jest.fn().mockRejectedValue(new Error('RPC error'));

      const txHash = 'test-tx-hash';
      const result = await router.verifyPayment(txHash);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Payment verification failed:',
        'RPC error'
      );
    });
  });

  describe('getWalletAddress', () => {
    it('should return wallet address from primary provider', async () => {
      const address = await router.getWalletAddress();

      expect(address).toBe('X402Provider-wallet-address');
    });
  });

  describe('getFailoverStats', () => {
    beforeEach(async () => {
      await router.initialize();
    });

    it('should return zero failovers initially', () => {
      const stats = router.getFailoverStats();
      expect(stats.totalFailovers).toBe(0);
    });

    it('should track failover count', async () => {
      primaryProvider.shouldExecuteSucceed = false;

      await router.executePayment(samplePaymentDetails);
      await router.executePayment(samplePaymentDetails);
      await router.executePayment(samplePaymentDetails);

      const stats = router.getFailoverStats();
      expect(stats.totalFailovers).toBe(3);
    });
  });
});
